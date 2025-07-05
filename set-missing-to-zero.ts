import dotenv from "dotenv";
import { promises as fs } from "fs";
dotenv.config();

/**
 * Set all missing SKUs (not found in Nalpac) t  } catch (_error) {
    console.error("Error setting missing SKUs to zero:", _error);
  }ero quantity
 * This prevents selling items that aren't available from your supplier
 */
async function setMissingToZero(): Promise<void> {
  try {
    console.log("🛠️ Setting missing SKUs to zero quantity...\n");

    // Read the missing SKUs from the report file
    let missingSKUs: string[] = [];

    try {
      const csvContent = await fs.readFile("missing-skus-report.csv", "utf-8");
      const lines = csvContent.split("\n").slice(1); // Skip header
      missingSKUs = lines
        .filter((line) => line.trim() !== "")
        .map((line) => line.split(",")[0]); // Get SKU from first column

      console.log(`📄 Found ${missingSKUs.length} missing SKUs in report file`);
    } catch (error: any) {
      console.error("❌ Could not read missing-skus-report.csv");
      console.log(
        `Please run 'npx tsx find-missing-skus.ts' first to generate the report. Error: ${error}`
      );
      return;
    }

    if (missingSKUs.length === 0) {
      console.log("🎉 No missing SKUs found! All your products are in Nalpac.");
      return;
    }

    const shopifyUrl = process.env.SHOPIFY_STORE_URL;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const locationId = process.env.SHOPIFY_LOCATION_ID;

    let successCount = 0;
    let failCount = 0;

    console.log(`\n🔄 Processing ${missingSKUs.length} missing SKUs...\n`);

    for (let i = 0; i < missingSKUs.length; i++) {
      const sku = missingSKUs[i];

      try {
        console.log(
          `📦 ${i + 1}/${missingSKUs.length} - Setting SKU ${sku} to 0...`
        );

        // Add delay to respect rate limits
        await delay(1000);

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
            `⚠️  Could not fetch variants for SKU ${sku}: ${variantResponse.statusText}`
          );
          failCount++;
          continue;
        }

        const variantData = await variantResponse.json();
        const matchingVariant = variantData.variants?.find(
          (v: any) => v.sku === sku
        );

        if (!matchingVariant) {
          console.warn(`⚠️  SKU ${sku} not found in Shopify`);
          failCount++;
          continue;
        }

        // Set inventory to zero
        await delay(300);

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
              available: 0,
            }),
          }
        );

        if (inventoryResponse.ok) {
          console.log(`✅ Set SKU ${sku} to 0 units`);
          successCount++;
        } else {
          const errorText = await inventoryResponse.text();
          console.error(`❌ Failed to update SKU ${sku}: ${errorText}`);
          failCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing SKU ${sku}:`, error);
        failCount++;
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`✅ Successfully set to zero: ${successCount} SKUs`);
    console.log(`❌ Failed to update: ${failCount} SKUs`);
    console.log(
      `🎯 Total processed: ${successCount + failCount}/${missingSKUs.length} SKUs`
    );

    if (successCount > 0) {
      console.log(`\n💡 RECOMMENDATION:`);
      console.log(
        `Consider reviewing these ${successCount} SKUs for potential removal from your store:`
      );
      console.log(`- Check if they're discontinued products`);
      console.log(`- See if they have alternative SKUs in Nalpac`);
      console.log(`- Remove them if they're no longer needed`);
    }
  } catch (error) {
    console.error("❌ Error setting missing SKUs to zero:", error);
  }
}

/**
 * Add delay between API calls
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the script
setMissingToZero();
