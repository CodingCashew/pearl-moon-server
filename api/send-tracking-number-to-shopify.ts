import sendErrorEmail from "./send-error-email.js";
import { config } from "dotenv";
import { sendTrackingNumberToShopifyGraphQL } from "./send-tracking-number-to-shopify-graphql.js";

/**
 * Sends tracking numbers to Shopify orders using the best available API approach
 *
 * STRATEGY:
 * 1. Try modern GraphQL API first (fulfillmentOrderSubmitFulfillmentRequest)
 * 2. Fall back to hybrid GraphQL+REST approach if permissions insufficient
 *
 * This ensures we use the most modern approach available while maintaining compatibility.
 *
 * @param externalOrderNumber - The Nalpac order number (matches Shopify order name)
 * @param trackingNumber - The shipping tracking number
 * @param trackingUrl - The tracking URL for the customer
 */

// Load environment variables
config();

async function sendTrackingNumberToShopify(
  externalOrderNumber: string,
  trackingNumber: string,
  trackingUrl: string
) {
  console.log(
    "🚀 Starting tracking number submission:",
    externalOrderNumber,
    trackingNumber,
    trackingUrl
  );



  try {
    // Strategy: Try GraphQL first, fall back to hybrid approach if needed
    console.log("🔄 Attempting modern GraphQL fulfillment approach...");

    try {
      await sendTrackingNumberToShopifyGraphQL(
        externalOrderNumber,
        trackingNumber,
        trackingUrl
      );

      console.log("✅ Successfully completed fulfillment using GraphQL!");
      return; // Success! No need for fallback
    } catch (graphqlError) {
      console.log("⚠️  GraphQL approach failed:", graphqlError.message);

      // Check if it's a permissions issue
      if (graphqlError.message.includes("fulfillmentOrders access denied")) {
        console.log("🔄 Falling back to hybrid GraphQL+REST approach...");
        // Continue to fallback implementation below
      } else {
        // Re-throw non-permission errors
        throw graphqlError;
      }
    }

    // Fallback: Hybrid GraphQL+REST approach
    await sendTrackingNumberToShopifyHybrid(
      externalOrderNumber,
      trackingNumber,
      trackingUrl
    );
  } catch (error) {
    console.error("❌ All fulfillment approaches failed:", error);
    throw error;
  }
}

/**
 * Hybrid GraphQL+REST approach (fallback when GraphQL permissions insufficient)
 */
async function sendTrackingNumberToShopifyHybrid(
  externalOrderNumber: string,
  trackingNumber: string,
  trackingUrl: string
) {
  console.log("🔧 Using hybrid GraphQL+REST approach (legacy fallback)");

  const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  // Validate environment variables
  if (!shopifyStoreUrl || !accessToken) {
    throw new Error(
      "Missing required environment variables: SHOPIFY_STORE_URL or SHOPIFY_ACCESS_TOKEN"
    );
  }

  try {
    // Step 1: Find the Shopify order using GraphQL (future-proof, recommended approach)
    console.log(
      `Searching for Shopify order with name: ${externalOrderNumber}`
    );

    const searchQuery = `
      query getOrderByName($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              name
              legacyResourceId
            }
          }
        }
      }
    `;

    const searchResponse = await fetch(
      `${shopifyStoreUrl}/admin/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          variables: {
            query: `name:#${externalOrderNumber}`,
          },
        }),
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.log("GraphQL Error Response:", errorText);
      throw new Error(
        `Failed to search for order: ${searchResponse.status} - ${searchResponse.statusText}`
      );
    }

    const searchData = await searchResponse.json();
    console.log(
      "GraphQL Order search result:",
      JSON.stringify(searchData, null, 2)
    );

    if (
      !searchData.data?.orders?.edges ||
      searchData.data.orders.edges.length === 0
    ) {
      throw new Error(
        `No Shopify order found with name: #${externalOrderNumber}`
      );
    }

    const order = searchData.data.orders.edges[0].node;
    const shopifyOrderId = order.legacyResourceId; // Use legacy ID for REST API
    console.log(
      `Found Shopify order ID: ${shopifyOrderId} for order name: ${externalOrderNumber}`
    );

    // Step 2: Get order details via REST API to access line items for fulfillment
    // TODO: Migrate to GraphQL when fulfillmentOrders permissions are available
    // The proper GraphQL approach would use fulfillmentOrderSubmitFulfillmentRequest
    // but requires access to fulfillmentOrders field which needs additional permissions
    console.log("Getting order details via REST API for fulfillment...");

    const orderResponse = await fetch(
      `${shopifyStoreUrl}/admin/api/2024-01/orders/${shopifyOrderId}.json`,
      {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.log("REST API Order Details Error:", errorText);
      throw new Error(
        `Failed to get order details: ${orderResponse.status} - ${orderResponse.statusText}`
      );
    }

    const orderData = await orderResponse.json();
    const orderDetails = orderData.order;

    // Check if there are any fulfillable items
    const fulfillableItems = orderDetails.line_items.filter(
      (item) => item.fulfillable_quantity > 0
    );

    console.log(`Order fulfillment analysis:`);
    console.log(`   Total line items: ${orderDetails.line_items.length}`);
    console.log(`   Fulfillable items: ${fulfillableItems.length}`);
    console.log(
      `   Current fulfillment status: ${orderDetails.fulfillment_status}`
    );
    console.log(
      `   Existing fulfillments: ${orderDetails.fulfillments?.length || 0}`
    );

    if (fulfillableItems.length === 0) {
      throw new Error(
        `Order ${externalOrderNumber} has no fulfillable items. ` +
          `Current status: ${orderDetails.fulfillment_status}. ` +
          `This order may already be fulfilled or cancelled.`
      );
    }

    // Step 3: Create fulfillment using REST API (legacy but functional approach)
    // TODO: Migrate to GraphQL fulfillmentOrderSubmitFulfillmentRequest when permissions allow
    console.log("Creating fulfillment with REST API (legacy approach)...", {
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      order_id: shopifyOrderId,
    });

    // Use environment variable or fallback to Pearl Moon Server Nalpac location
    const locationId = process.env.SHOPIFY_LOCATION_ID || "84199506171";

    if (!process.env.SHOPIFY_LOCATION_ID) {
      console.log(
        "⚠️  SHOPIFY_LOCATION_ID not set, using fallback location: Pearl Moon Server Nalpac (84199506171)"
      );
    }

    const fulfillmentPayload = {
      fulfillment: {
        location_id: locationId,
        tracking_number: trackingNumber,
        tracking_urls: [trackingUrl],
        notify_customer: true,
        line_items: fulfillableItems.map((item: any) => ({
          id: item.id,
          quantity: item.fulfillable_quantity, // Use fulfillable quantity, not total quantity
        })),
      },
    };

    console.log(
      "Fulfillment payload:",
      JSON.stringify(fulfillmentPayload, null, 2)
    );

    const response = await fetch(
      `${shopifyStoreUrl}/admin/api/2024-01/orders/${shopifyOrderId}/fulfillments.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fulfillmentPayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Error sending Tracking number to Shopify:",
        response.status + " " + response.statusText,
        externalOrderNumber,
        trackingNumber,
        trackingUrl
      );
      console.error("Error response body:", errorText);

      // Add more debugging for 406 errors
      if (response.status === 406) {
        console.error("🔍 406 Error Debug Info:");
        console.error(
          "   Request URL:",
          `${shopifyStoreUrl}/admin/api/2024-01/orders/${shopifyOrderId}/fulfillments.json`
        );
        console.error(
          "   Order Details:",
          JSON.stringify(
            {
              id: shopifyOrderId,
              name: orderDetails.name,
              fulfillment_status: orderDetails.fulfillment_status,
              financial_status: orderDetails.financial_status,
              line_items_count: orderDetails.line_items.length,
              existing_fulfillments: orderDetails.fulfillments?.length || 0,
            },
            null,
            2
          )
        );

        // Check fulfillable quantities
        const fulfillableItems = orderDetails.line_items.filter(
          (item) => item.fulfillable_quantity > 0
        );
        console.error(
          "   Fulfillable items:",
          fulfillableItems.length,
          "out of",
          orderDetails.line_items.length
        );

        if (fulfillableItems.length === 0) {
          console.error(
            "   ⚠️  NO FULFILLABLE ITEMS - This is likely the cause of 406!"
          );
          console.error(
            "   Order might already be fully fulfilled or cancelled"
          );
        }
      }

      await sendErrorEmail({
        orderId: externalOrderNumber,
        customerName: "unknown",
        timeStamp: new Date().toISOString(),
        errorMessage: `Error sending tracking number to Shopify. Status: ${response.status} - ${response.statusText}, Response: ${errorText}`,
      });

      throw new Error(
        `HTTP error! status: ${response.status} - ${response.statusText}, Body: ${errorText}`
      );
    }

    const data = await response.json();
    console.log("REST API Fulfillment result:", JSON.stringify(data, null, 2));

    if (data.fulfillment) {
      console.log("✅ Fulfillment created successfully:", data.fulfillment);
      console.log(
        "📧 Customer notification sent:",
        data.fulfillment.notify_customer
      );
      console.log("📦 Tracking number:", data.fulfillment.tracking_number);
      console.log("🔗 Tracking URL:", data.fulfillment.tracking_urls?.[0]);
    } else {
      throw new Error("Fulfillment creation failed - no fulfillment returned");
    }
  } catch (error) {
    console.error("Error updating tracking number:", error);
    throw error;
  }
}

// Example usage
// const orderId = 123456789; // The order ID
// const trackingNumber = "ABCD123456"; // The tracking number
// const trackingUrl = "https://tracking-service.com/ABCD123456"; // The tracking URL
// sendTrackingNumberToShopify(orderId, trackingNumber, trackingUrl);

export { sendTrackingNumberToShopify };
