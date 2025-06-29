// Compare manual order vs what fulfillment expects
import { config } from "dotenv";

config();

const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

async function analyzeOrderStructure() {
  try {
    console.log("Analyzing order structure for fulfillment compatibility...");

    // Get order 1029 details
    const orderResponse = await fetch(
      `${shopifyStoreUrl}/admin/api/2024-01/orders.json?name=%231029&limit=1`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    const orderData = await orderResponse.json();
    const order = orderData.orders[0];

    console.log("=== ORDER ANALYSIS ===");
    console.log(`Order: ${order.name} (${order.id})`);
    console.log(`Created via: ${order.source_name || "Unknown"}`);
    console.log(`Gateway: ${order.gateway || "None"}`);
    console.log(`Processing method: ${order.processing_method || "Unknown"}`);
    console.log(`Financial status: ${order.financial_status}`);
    console.log(`Fulfillment status: ${order.fulfillment_status || "null"}`);

    console.log("\n=== LINE ITEMS ANALYSIS ===");
    order.line_items.forEach((item, i) => {
      console.log(`Item ${i + 1}:`);
      console.log(`  Title: ${item.title}`);
      console.log(`  Quantity: ${item.quantity}`);
      console.log(`  Fulfillable quantity: ${item.fulfillable_quantity}`);
      console.log(
        `  Fulfillment service: ${item.fulfillment_service || "manual"}`
      );
      console.log(`  Requires shipping: ${item.requires_shipping}`);
      console.log(`  Taxable: ${item.taxable}`);
      console.log(`  Product exists: ${item.product_exists}`);
      console.log(
        `  Variant inventory management: ${
          item.variant_inventory_management || "None"
        }`
      );
    });

    console.log("\n=== SHIPPING ANALYSIS ===");
    if (order.shipping_address) {
      console.log("✅ Shipping address present");
    } else {
      console.log("❌ No shipping address");
    }

    if (order.shipping_lines && order.shipping_lines.length > 0) {
      console.log("✅ Shipping lines present:");
      order.shipping_lines.forEach((line) => {
        console.log(`  - ${line.title}: $${line.price}`);
      });
    } else {
      console.log("❌ No shipping lines");
    }

    console.log("\n=== FULFILLMENT READINESS ===");

    // Check if order can be fulfilled
    const fulfillableItems = order.line_items.filter(
      (item) => item.fulfillable_quantity > 0
    );
    console.log(
      `Fulfillable items: ${fulfillableItems.length}/${order.line_items.length}`
    );

    if (fulfillableItems.length === 0) {
      console.log("❌ No items can be fulfilled!");
      return;
    }

    // Check fulfillment service assignment
    const manualFulfillmentItems = fulfillableItems.filter(
      (item) =>
        !item.fulfillment_service || item.fulfillment_service === "manual"
    );

    if (manualFulfillmentItems.length > 0) {
      console.log(
        `⚠️  ${manualFulfillmentItems.length} items set to manual fulfillment`
      );
      console.log("This might be why API fulfillment is failing!");
    }

    // Try to get available fulfillment services
    console.log("\n=== AVAILABLE FULFILLMENT SERVICES ===");
    const servicesResponse = await fetch(
      `${shopifyStoreUrl}/admin/api/2024-01/fulfillment_services.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    if (servicesResponse.ok) {
      const services = await servicesResponse.json();
      console.log("Available fulfillment services:", services);
    } else {
      console.log(
        `Cannot access fulfillment services: ${servicesResponse.status}`
      );
    }
  } catch (error) {
    console.error("Analysis failed:", error);
  }
}

analyzeOrderStructure();
