import dotenv from "dotenv";
dotenv.config();

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

/**
 * Find SKUs that exist in Shopify but are NOT found in Nalpac
 * These SKUs should be set to zero quantity or removed from the store
 */
async function findMissingSKUs(): Promise<void> {
  try {
    console.log("🔍 Finding SKUs missing from Nalpac catalog...\n");

    // Step 1: Get all Shopify SKUs
    const shopifySkus = await getShopifySkus();
    console.log(`🛍️ Total Shopify SKUs: ${shopifySkus.length}`);

    // Step 2: Get ALL Nalpac SKUs (full catalog)
    const nalpacSkus = await getAllNalpacSkus();
    console.log(`📦 Total Nalpac SKUs: ${nalpacSkus.size}`);

    // Step 3: Find missing SKUs
    const missingSKUs = shopifySkus.filter((sku) => !nalpacSkus.has(sku));
    const foundSKUs = shopifySkus.filter((sku) => nalpacSkus.has(sku));

    console.log(`\n📊 RESULTS:`);
    console.log(
      `✅ Found in Nalpac: ${foundSKUs.length}/${shopifySkus.length} (${Math.round((foundSKUs.length / shopifySkus.length) * 100)}%)`
    );
    console.log(
      `❌ Missing from Nalpac: ${missingSKUs.length}/${shopifySkus.length} (${Math.round((missingSKUs.length / shopifySkus.length) * 100)}%)`
    );

    if (missingSKUs.length > 0) {
      console.log(`\n🚨 MISSING SKUs (not found in Nalpac):`);
      console.log(
        "These should be set to zero quantity or removed from your store:\n"
      );

      missingSKUs.forEach((sku, index) => {
        console.log(`${index + 1}. ${sku}`);
      });

      // Generate a CSV file for easy import/management
      const csvContent = [
        "SKU,Action_Needed,Notes",
        ...missingSKUs.map(
          (sku) => `${sku},Set to zero or remove,Not found in Nalpac catalog`
        ),
      ].join("\n");

      // Write to file
      const fs = await import("fs/promises");
      await fs.writeFile("missing-skus-report.csv", csvContent);
      console.log(`\n📄 Report saved to: missing-skus-report.csv`);
      console.log(
        "You can open this in Excel or Google Sheets to manage these SKUs."
      );

      // Also generate a simple command to set all to zero
      console.log(`\n💡 QUICK ACTION:`);
      console.log(
        `If you want to set all these SKUs to zero quantity, you can run:`
      );
      console.log(`npx tsx set-missing-to-zero.ts`);
      console.log(`(I can create this script if you'd like)`);
    } else {
      console.log(`\n🎉 Great! All your Shopify SKUs were found in Nalpac.`);
    }
  } catch (error) {
    console.error("❌ Error finding missing SKUs:", error);
  }
}

/**
 * Get all SKUs from Shopify
 */
async function getShopifySkus(): Promise<string[]> {
  const shopifyUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  const query = `
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            variants(first: 100) {
              edges {
                node {
                  sku
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(`${shopifyUrl}/admin/api/2023-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken!,
    },
    body: JSON.stringify({
      query,
      variables: { first: 250 },
    }),
  });

  const data = await response.json();
  const skus: string[] = [];

  data.data.products.edges.forEach((product: any) => {
    product.node.variants.edges.forEach((variant: any) => {
      if (variant.node.sku && variant.node.sku.trim() !== "") {
        skus.push(variant.node.sku);
      }
    });
  });

  return skus;
}

/**
 * Get ALL SKUs from Nalpac (complete catalog scan)
 */
async function getAllNalpacSkus(): Promise<Set<string>> {
  const nalpacUrl = process.env.NALPAC_URL || "";
  const username = process.env.NALPAC_ACCOUNT_EMAIL || "";
  const password = process.env.NALPAC_PASSWORD || "";
  const credentials = btoa(`${username}:${password}`);

  console.log(
    "📥 Fetching complete Nalpac catalog (this may take a few minutes)..."
  );

  // Get first page to know total pages
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
    throw new Error(`Nalpac API error: ${firstResponse.statusText}`);
  }

  const firstPage: NalpacInventoryResponse = await firstResponse.json();
  const totalPages = firstPage.TotalPages;

  console.log(
    `📊 Scanning ${totalPages} pages (~${totalPages * 100} items)...`
  );

  const allSkus = new Set<string>();

  // Add SKUs from first page
  firstPage.Inventories.forEach((item) => {
    if (item.Sku && item.Sku.trim() !== "") {
      allSkus.add(item.Sku);
    }
  });

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    if (page % 50 === 0) {
      console.log(
        `   Progress: ${page}/${totalPages} pages (${Math.round((page / totalPages) * 100)}%)`
      );
    }

    try {
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
        pageData.Inventories.forEach((item) => {
          if (item.Sku && item.Sku.trim() !== "") {
            allSkus.add(item.Sku);
          }
        });
      } else {
        console.warn(`⚠️ Failed to fetch page ${page}: ${response.statusText}`);
      }

      // Small delay to be respectful to their API
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.warn(`⚠️ Error fetching page ${page}:`, error);
    }
  }

  console.log(
    `✅ Scanned complete Nalpac catalog: ${allSkus.size} unique SKUs found`
  );
  return allSkus;
}

// Run the analysis
findMissingSKUs();
