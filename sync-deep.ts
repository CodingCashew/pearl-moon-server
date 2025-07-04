import dotenv from "dotenv";

// Load environment variables
d; // Prepare Shopify updates
const updates: ShopifyInventoryUpdate[] = relevantInventory.map((item) => {
  // Sum inventory from all Nalpac locations (future-proof)
  const totalAvailable = item.LocationInventories.reduce(
    (sum, location) => sum + location.AvailableQuantity,
    0
  );

  return {
    sku: item.Sku,
    quantity: item.Sellable ? totalAvailable : 0,
    locationId: process.env.SHOPIFY_LOCATION_ID!,
  };
});
fig();

interface NalpacInventoryItem {
  Sku: string;
  Name: string;
  LocationInventories: Array<{
    LocationId: number;
    AvailableQuantity: number;
    QuantityOnHand: number;
  }>;
  Sellable: boolean;
  DateModified: string;
}

interface NalpacInventoryResponse {
  PageNumber: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  Inventories: NalpacInventoryItem[];
}

interface ShopifyInventoryUpdate {
  sku: string;
  quantity: number;
  locationId: string;
}

/**
 * Deep sync for niche/seasonal products
 * Runs once per day (overnight)
 * Covers pages 101-248 (~14,800 items) for comprehensive coverage
 */
async function deepSync(): Promise<void> {
  try {
    console.log("🌙 Starting DEEP inventory sync (pages 101-248)...\n");

    // Get Shopify products first to know what SKUs we need
    const shopifyProducts = await getShopifyProducts();
    const yourSkus = new Set(shopifyProducts.map((p) => p.sku));

    // Fetch Nalpac inventory for pages 101-248
    const nalpacInventory = await fetchNalpacInventoryDeep();

    // Filter to only items you carry
    const relevantInventory = nalpacInventory.filter((item) =>
      yourSkus.has(item.Sku)
    );

    console.log(
      `Filtered from ${nalpacInventory.length} Nalpac items to ${relevantInventory.length} relevant items from deep pages`
    );

    if (relevantInventory.length === 0) {
      console.log("📋 No additional SKUs found in deep pages (101-248)");
      return;
    }

    // Prepare Shopify updates
    const updates: ShopifyInventoryUpdate[] = relevantInventory.map((item) => {
      // Sum inventory from all Nalpac locations (future-proof)
      const totalAvailable = item.LocationInventories.reduce(
        (sum, location) => sum + location.AvailableQuantity,
        0
      );

      return {
        sku: item.Sku,
        quantity: item.Sellable ? totalAvailable : 0,
        locationId: process.env.SHOPIFY_LOCATION_ID!,
      };
    });

    // Update Shopify inventory
    await updateShopifyInventoryDeep(updates);

    console.log("\n✅ Deep inventory sync completed successfully!");
    console.log(
      `📊 Covered pages 101-248 (~14,800 items), updated ${updates.length} additional SKUs`
    );
  } catch (error) {
    console.error("\n❌ Deep inventory sync failed:", error);
    process.exit(1);
  }
}

/**
 * Fetch inventory from Nalpac pages 101-248 (the deep/niche items)
 */
async function fetchNalpacInventoryDeep(): Promise<NalpacInventoryItem[]> {
  const nalpacUrl = process.env.NALPAC_URL || "";
  const username = process.env.NALPAC_ACCOUNT_EMAIL || "";
  const password = process.env.NALPAC_PASSWORD || "";
  const credentials = btoa(`${username}:${password}`);

  try {
    console.log("🔍 Fetching deep inventory from Nalpac (pages 101-248)...");

    // Start with page 101 to get total info
    const firstResponse = await fetch(
      `${nalpacUrl}/api/inventory?PageNumber=101&PageSize=100`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    if (!firstResponse.ok) {
      throw new Error(
        `Nalpac inventory API error: ${firstResponse.statusText}`
      );
    }

    const firstPage: NalpacInventoryResponse = await firstResponse.json();
    console.log(
      `📊 Deep sync: Processing pages 101-${firstPage.TotalPages} of ${firstPage.TotalPages} total pages`
    );
    console.log(
      `📦 This covers ~${(firstPage.TotalPages - 100) * 100} items from the deep catalog`
    );

    let allInventory: NalpacInventoryItem[] = [...firstPage.Inventories];

    // Fetch pages 102 through 248 (or total pages)
    for (let page = 102; page <= firstPage.TotalPages; page++) {
      if (page % 25 === 0) {
        console.log(`   Fetching page ${page} of ${firstPage.TotalPages}...`);
      }

      const response = await fetch(
        `${nalpacUrl}/api/inventory?PageNumber=${page}&PageSize=100`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      if (response.ok) {
        const pageData: NalpacInventoryResponse = await response.json();
        allInventory.push(...pageData.Inventories);
      } else {
        console.warn(`Failed to fetch page ${page}: ${response.statusText}`);
      }
    }

    console.log(
      `Retrieved ${allInventory.length} items from Nalpac deep pages (101-${firstPage.TotalPages})`
    );
    return allInventory;
  } catch (error) {
    console.error("Error fetching Nalpac deep inventory:", error);
    throw error;
  }
}

/**
 * Get Shopify products to know which SKUs to sync
 */
async function getShopifyProducts(): Promise<
  { sku: string; variantId: string; inventoryItemId: string }[]
> {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  const query = `
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            handle
            variants(first: 100) {
              edges {
                node {
                  id
                  sku
                  inventoryItem {
                    id
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(
      `${shopifyUrl}/admin/api/2023-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken!,
        },
        body: JSON.stringify({
          query,
          variables: { first: 250 },
        }),
      }
    );

    const data = await response.json();
    const allShopifyProducts: {
      sku: string;
      variantId: string;
      inventoryItemId: string;
    }[] = [];

    data.data.products.edges.forEach((product: any) => {
      product.node.variants.edges.forEach((variant: any) => {
        if (variant.node.sku && variant.node.inventoryItem?.id) {
          allShopifyProducts.push({
            sku: variant.node.sku,
            variantId: variant.node.id,
            inventoryItemId: variant.node.inventoryItem.id,
          });
        }
      });
    });

    console.log(
      `🛍️ Found ${allShopifyProducts.length} products with SKUs in Shopify for deep sync`
    );

    return allShopifyProducts;
  } catch (error) {
    console.error("Error fetching Shopify products for deep sync:", error);
    throw error;
  }
}

/**
 * Update Shopify inventory using REST API (simplified for deep sync)
 */
async function updateShopifyInventoryDeep(
  updates: ShopifyInventoryUpdate[]
): Promise<void> {
  console.log(
    `\n🌙 Updating ${updates.length} products in Shopify (deep sync)...`
  );

  const shopifyUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const locationId = process.env.SHOPIFY_LOCATION_ID;

  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];

    try {
      console.log(
        `📦 Deep sync batch ${i + 1}/${updates.length} - SKU ${update.sku}: Set quantity to ${update.quantity}`
      );

      // Add delay to respect rate limits (more conservative for overnight job)
      await delay(1200); // 1.2 second delay for safety

      // Find the product variant by SKU
      const variantResponse = await fetch(
        `${shopifyUrl}/admin/api/2023-10/variants.json?fields=id,inventory_item_id,sku&limit=250`,
        {
          method: "GET",
          headers: {
            "X-Shopify-Access-Token": accessToken!,
          },
        }
      );

      if (!variantResponse.ok) {
        console.warn(
          `⚠️  Could not fetch variants for SKU ${update.sku}: ${variantResponse.statusText}`
        );
        continue;
      }

      const variantData = await variantResponse.json();
      const matchingVariant = variantData.variants?.find(
        (v: any) => v.sku === update.sku
      );

      if (!matchingVariant) {
        console.warn(`⚠️  SKU ${update.sku} not found in Shopify`);
        continue;
      }

      // Add small delay before inventory update
      await delay(300);

      // Update the inventory level
      const inventoryResponse = await fetch(
        `${shopifyUrl}/admin/api/2023-10/inventory_levels/set.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken!,
          },
          body: JSON.stringify({
            location_id: locationId,
            inventory_item_id: matchingVariant.inventory_item_id,
            available: update.quantity,
          }),
        }
      );

      if (inventoryResponse.ok) {
        console.log(`✅ Updated SKU ${update.sku}: ${update.quantity} units`);
      } else {
        const errorText = await inventoryResponse.text();
        console.error(`❌ Failed to update SKU ${update.sku}: ${errorText}`);
      }
    } catch (error) {
      console.error(`❌ Error updating SKU ${update.sku}:`, error);
    }
  }

  console.log(
    `\n✅ Deep inventory sync completed. Processed ${updates.length} SKUs from pages 101-248.`
  );
}

/**
 * Add delay between API calls
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the deep sync
deepSync();
