import sendErrorEmail from "./send-error-email.js";

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
 * Fetch inventory data from Nalpac
 * This returns ALL products in their catalog with availability info
 */
async function fetchNalpacInventory(): Promise<NalpacInventoryItem[]> {
  const nalpacUrl = process.env.NALPAC_URL || "";
  const username = process.env.NALPAC_ACCOUNT_EMAIL || "";
  const password = process.env.NALPAC_PASSWORD || "";
  const credentials = btoa(`${username}:${password}`);

  try {
    console.log("Fetching inventory from Nalpac...");

    // Start with first page to get total info
    const firstResponse = await fetch(
      `${nalpacUrl}/api/inventory?PageNumber=1&PageSize=100`,
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
      `Found ${firstPage.TotalItems} total items across ${firstPage.TotalPages} pages`
    );

    let allInventory: NalpacInventoryItem[] = [...firstPage.Inventories];

    // Configuration for how many pages to fetch - now configurable via environment variable
    // Options:
    // - 50 pages = ~5,000 items (conservative, good for testing)
    // - 100 pages = ~10,000 items (good middle ground for production)
    // - 248 pages = ~25,000 items (full catalog, higher memory usage)
    // - 0 = fetch all pages (use with caution)
    const MAX_PAGES_TO_FETCH = parseInt(process.env.NALPAC_MAX_PAGES || "50");
    const maxPages =
      MAX_PAGES_TO_FETCH === 0
        ? firstPage.TotalPages
        : Math.min(firstPage.TotalPages, MAX_PAGES_TO_FETCH);

    console.log(
      `📊 Configuration: NALPAC_MAX_PAGES=${MAX_PAGES_TO_FETCH} (${MAX_PAGES_TO_FETCH === 0 ? "ALL pages" : "max pages"})`
    );
    console.log(
      `📊 Will fetch ${maxPages} pages out of ${firstPage.TotalPages} total pages`
    );
    console.log(
      `📦 This covers ${maxPages * 100} items out of ${firstPage.TotalItems} total items`
    );

    for (let page = 2; page <= maxPages; page++) {
      console.log(`Fetching page ${page} of ${maxPages}...`);

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
      `Retrieved ${allInventory.length} items from Nalpac (first ${maxPages} pages of ${firstPage.TotalPages})`
    );
    return allInventory;
  } catch (error) {
    console.error("Error fetching Nalpac inventory:", error);
    await sendErrorEmail({
      orderId: "inventory-sync",
      customerName: "System",
      timeStamp: new Date().toISOString(),
      errorMessage: `Failed to fetch Nalpac inventory: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    throw error;
  }
}

/**
 * Get your products from Shopify to know which SKUs to sync
 * Now gets real data from Shopify
 */
async function getShopifyProducts(): Promise<
  { sku: string; variantId: string; inventoryItemId: string }[]
> {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  // Option 1: Use all your Shopify products dynamically (recommended for 150+ SKUs)
  // This will fetch ALL your products and sync any that exist in Nalpac
  const USE_DYNAMIC_SKUS = true; // Set to false to use hardcoded list below

  if (USE_DYNAMIC_SKUS) {
    // Get all real products from Shopify dynamically
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
          pageInfo {
            hasNextPage
            endCursor
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
            variables: { first: 250 }, // Shopify max is 250, will need pagination for more
          }),
        }
      );

      const data = await response.json();

      if (data.errors) {
        console.warn(`Shopify GraphQL warning: ${JSON.stringify(data.errors)}`);
      }

      // Extract all SKU mappings from Shopify
      const allShopifyProducts: {
        sku: string;
        variantId: string;
        inventoryItemId: string;
      }[] = [];

      if (data.data?.products?.edges) {
        data.data.products.edges.forEach((productEdge: any) => {
          productEdge.node.variants.edges.forEach((variantEdge: any) => {
            const variant = variantEdge.node;
            if (variant.sku && variant.inventoryItem?.id) {
              allShopifyProducts.push({
                sku: variant.sku,
                variantId: variant.id,
                inventoryItemId: variant.inventoryItem.id,
              });
            }
          });
        });
      }

      console.log(
        `🛍️ Found ${allShopifyProducts.length} products with SKUs in Shopify`
      );
      console.log(
        `📝 SKUs: ${allShopifyProducts.map((p) => p.sku).join(", ")}`
      );

      return allShopifyProducts;
    } catch (error) {
      console.error("Error fetching all Shopify products:", error);
      console.log("Falling back to hardcoded test products");
    }
  }

  // Option 2: Hardcoded SKUs for testing or specific products
  const actualShopifyProducts = [
    {
      sku: "37124", // Icicles No. 18 7.5" Curved Glass Dildo
      variantId: "gid://shopify/ProductVariant/47006170054907",
      inventoryItemId: "gid://shopify/InventoryItem/49069978616059",
    },
    {
      sku: "89313", // Adding second product for testing
      variantId: "gid://shopify/ProductVariant/TBD", // Will be found dynamically
      inventoryItemId: "gid://shopify/InventoryItem/TBD", // Will be found dynamically
    },
    // Add more SKUs here if using hardcoded approach:
    // {
    //   sku: "YOUR_SKU",
    //   variantId: "gid://shopify/ProductVariant/TBD",
    //   inventoryItemId: "gid://shopify/InventoryItem/TBD",
    // },
  ];

  console.log(
    `Using ${USE_DYNAMIC_SKUS ? "dynamic" : "hardcoded"} Shopify SKUs: ${actualShopifyProducts.map((p) => p.sku).join(", ")}`
  );

  return actualShopifyProducts;
}

/**
 * Update inventory levels in Shopify using GraphQL
 */
async function updateShopifyInventory(
  updates: ShopifyInventoryUpdate[]
): Promise<void> {
  // Process one at a time to avoid rate limiting issues
  // This is slower but much more reliable for large inventories
  const batchSize = 1;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    console.log(
      `\n📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)} - Updating ${batch.length} items:`
    );

    batch.forEach((update) => {
      console.log(`   SKU ${update.sku}: Set quantity to ${update.quantity}`);
    });

    try {
      // Use REST API approach - works better with SKUs and rate limiting
      await updateInventoryViaREST(batch);
    } catch (error) {
      console.error(
        `❌ Error updating inventory batch ${Math.floor(i / batchSize) + 1}:`,
        error
      );
    }
  }

  console.log(
    `\n✅ Inventory sync completed. Processed ${updates.length} SKUs.`
  );
}

/**
 * Update inventory using Shopify REST API (fallback method)
 */
async function updateInventoryViaREST(
  updates: ShopifyInventoryUpdate[]
): Promise<void> {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const locationId = process.env.SHOPIFY_LOCATION_ID;

  for (const update of updates) {
    try {
      // Add delay to respect Shopify rate limits (2 calls per second max)
      await delay(1000); // 1000ms delay = 1 call per second (very safe buffer)

      // First, find the product variant by SKU
      const variantResponse = await makeShopifyRequest(
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
          `⚠️  Could not fetch variants: ${variantResponse.statusText}`
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

      // Update the inventory level using the inventory item ID
      // First, handle any location conflicts
      await handleInventoryLocationConflicts(
        update.sku,
        matchingVariant.inventory_item_id
      );

      // Add small delay before inventory update
      await delay(300);

      const inventoryResponse = await makeShopifyRequest(
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
        await inventoryResponse.json(); // Consume response
        console.log(`✅ Updated SKU ${update.sku}: ${update.quantity} units`);
      } else {
        const errorText = await inventoryResponse.text();
        console.error(`❌ Failed to update SKU ${update.sku}: ${errorText}`);
      }
    } catch (error) {
      console.error(`❌ Error updating SKU ${update.sku}:`, error);
    }
  }
}

/**
 * Handle inventory location conflicts
 * If a product is tracked at multiple locations and one is a fulfillment service location,
 * disconnect from the non-fulfillment service locations
 */
async function handleInventoryLocationConflicts(
  sku: string,
  inventoryItemId: number
): Promise<void> {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  const fulfillmentServiceLocationId = process.env.SHOPIFY_LOCATION_ID; // 84199506171

  console.log(`🔍 Checking location conflicts for SKU ${sku}...`);
  console.log(`   Inventory Item ID: ${inventoryItemId}`);
  console.log(`   Target location: ${fulfillmentServiceLocationId}`);

  try {
    // Add small delay to prevent rate limiting
    await delay(500);

    // Get current inventory levels for this item
    const levelsResponse = await makeShopifyRequest(
      `${shopifyUrl}/admin/api/2023-10/inventory_levels.json?inventory_item_ids=${inventoryItemId}`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken!,
        },
      }
    );

    if (!levelsResponse.ok) {
      console.warn(
        `⚠️ Could not fetch inventory levels for SKU ${sku}: ${levelsResponse.statusText}`
      );
      return;
    }

    const levelsData = await levelsResponse.json();
    const levels = levelsData.inventory_levels || [];

    console.log(`   Found ${levels.length} inventory locations:`);
    levels.forEach((level: any) => {
      console.log(
        `     Location ${level.location_id}: ${level.available} units`
      );
    });

    // Check if tracked at multiple locations
    if (levels.length <= 1) {
      console.log(
        `   ✅ No conflict - only tracked at ${levels.length} location(s)`
      );
      return; // No conflict
    }

    // Find locations that are not the fulfillment service location
    const conflictingLocations = levels.filter(
      (level: any) => level.location_id != fulfillmentServiceLocationId
    );

    if (conflictingLocations.length === 0) {
      console.log(
        `   ✅ No conflict - all locations match fulfillment service`
      );
      return; // No conflict
    }

    console.log(`🔧 Resolving location conflict for SKU ${sku}...`);
    console.log(
      `   Tracked at ${levels.length} locations, removing from ${conflictingLocations.length} conflicting locations`
    );

    // Disconnect from conflicting locations
    for (const conflictingLevel of conflictingLocations) {
      try {
        console.log(
          `   🔄 Disconnecting from location ${conflictingLevel.location_id}...`
        );

        const disconnectResponse = await makeShopifyRequest(
          `${shopifyUrl}/admin/api/2023-10/inventory_levels/${inventoryItemId}.json?location_id=${conflictingLevel.location_id}`,
          {
            method: "DELETE",
            headers: {
              "X-Shopify-Access-Token": accessToken!,
            },
          }
        );

        console.log(
          `   Response: ${disconnectResponse.status} ${disconnectResponse.statusText}`
        );

        if (disconnectResponse.ok) {
          console.log(
            `   ✅ Disconnected from location ${conflictingLevel.location_id}`
          );
        } else {
          const errorText = await disconnectResponse.text();
          console.warn(
            `   ⚠️ Failed to disconnect from location ${conflictingLevel.location_id}: ${errorText}`
          );
        }
      } catch (error) {
        console.warn(
          `   ⚠️ Error disconnecting from location ${conflictingLevel.location_id}:`,
          error
        );
      }
    }

    console.log(`✅ Location conflict resolution completed for SKU ${sku}`);
  } catch (error) {
    console.warn(`⚠️ Error handling location conflicts for SKU ${sku}:`, error);
  }
}

/**
 * Add delay between API calls to respect Shopify rate limits
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make a Shopify API request with retry logic for rate limiting
 */
async function makeShopifyRequest(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limited - wait longer and retry
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(
          `⚠️ Rate limited, waiting ${waitTime / 1000}s before retry ${attempt}/${maxRetries}`
        );
        await delay(waitTime);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(
        `⚠️ Request failed, retrying ${attempt}/${maxRetries}:`,
        error
      );
      await delay(1000 * attempt);
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts`);
}

/**
 * Main inventory sync function
 */
export async function syncInventory(): Promise<void> {
  try {
    console.log("Starting inventory sync...");

    // Step 1: Get all inventory from Nalpac (typically 50,000+ items)
    const nalpacInventory = await fetchNalpacInventory();

    // Step 2: Get your Shopify products (only the ones you sell)
    const shopifyProducts = await getShopifyProducts();

    // Step 3: Filter Nalpac inventory to only items you carry
    const yourSkus = new Set(shopifyProducts.map((p) => p.sku));
    const relevantInventory = nalpacInventory.filter((item) =>
      yourSkus.has(item.Sku)
    );

    console.log(
      `Filtered from ${nalpacInventory.length} Nalpac items to ${relevantInventory.length} relevant items`
    );

    // Step 4: Prepare Shopify updates
    const updates: ShopifyInventoryUpdate[] = relevantInventory.map((item) => {
      // Sum inventory from all Nalpac locations (future-proof)
      // Currently all items are at LocationId 15, but this handles multiple locations
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

    // Step 5: Update Shopify inventory
    await updateShopifyInventory(updates);

    console.log("Inventory sync completed successfully");
  } catch (error) {
    console.error("Inventory sync failed:", error);
    await sendErrorEmail({
      orderId: "inventory-sync",
      customerName: "System",
      timeStamp: new Date().toISOString(),
      errorMessage: `Inventory sync failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
    throw error;
  }
}
