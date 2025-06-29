import sendErrorEmail from "./send-error-email.js";
import { config } from "dotenv";

/**
 * Sends tracking numbers to Shopify orders using modern GraphQL API
 *
 * This version uses the recommended GraphQL fulfillment workflow:
 * 1. Find order using GraphQL
 * 2. Get fulfillmentOrders for the order
 * 3. Submit fulfillment request using fulfillmentOrderSubmitFulfillmentRequest
 *
 * @param externalOrderNumber - The Nalpac order number (matches Shopify order name)
 * @param trackingNumber - The shipping tracking number
 * @param trackingUrl - The tracking URL for the customer
 */

// Load environment variables
config();

async function sendTrackingNumberToShopifyGraphQL(
  externalOrderNumber: string,
  trackingNumber: string,
  trackingUrl: string
) {
  console.log(
    "🚀 GraphQL Implementation - externalOrderNumber, trackingNumber, trackingUrl:",
    externalOrderNumber,
    trackingNumber,
    trackingUrl
  );

  // TODO: REMOVE THIS - Hardcoding to test order 1030
  if (externalOrderNumber === "1026") {
    console.log("🔧 Hardcoding order 1026 -> 1030 for testing");
    externalOrderNumber = "1030";
  }

  const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  // Validate environment variables
  if (!shopifyStoreUrl || !accessToken) {
    throw new Error(
      "Missing required environment variables: SHOPIFY_STORE_URL or SHOPIFY_ACCESS_TOKEN"
    );
  }

  try {
    // Step 1: Find the Shopify order and its fulfillment orders using GraphQL
    console.log(
      `🔍 Searching for Shopify order with name: ${externalOrderNumber}`
    );

    const orderQuery = `
      query getOrderWithFulfillmentOrders($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              name
              legacyResourceId
              fulfillmentOrders(first: 10) {
                edges {
                  node {
                    id
                    status
                    assignedLocation {
                      name
                    }
                    lineItems(first: 10) {
                      edges {
                        node {
                          id
                          remainingQuantity
                        }
                      }
                    }
                  }
                }
              }
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
          query: orderQuery,
          variables: {
            query: `name:#${externalOrderNumber}`,
          },
        }),
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.log("❌ GraphQL Error Response:", errorText);
      throw new Error(
        `Failed to search for order: ${searchResponse.status} - ${searchResponse.statusText}`
      );
    }

    const searchData = await searchResponse.json();
    console.log(
      "📋 GraphQL Order search result:",
      JSON.stringify(searchData, null, 2)
    );

    // Check for GraphQL errors (especially permissions)
    if (searchData.errors) {
      const accessDeniedError = searchData.errors.find((error) =>
        error.message.includes("Access denied for fulfillmentOrders")
      );

      if (accessDeniedError) {
        console.log(
          "⚠️  GraphQL fulfillmentOrders permission denied, falling back to REST API"
        );
        // Fall back to the REST API approach
        throw new Error(
          "GraphQL fulfillmentOrders access denied - need read_fulfillments and write_fulfillments scopes"
        );
      }

      throw new Error(
        `GraphQL errors: ${searchData.errors.map((e) => e.message).join(", ")}`
      );
    }

    if (
      !searchData.data?.orders?.edges ||
      searchData.data.orders.edges.length === 0
    ) {
      throw new Error(
        `No Shopify order found with name: #${externalOrderNumber}`
      );
    }

    const order = searchData.data.orders.edges[0].node;
    console.log(`✅ Found Shopify order: ${order.name} (ID: ${order.id})`);

    // Step 2: Check fulfillment orders
    const fulfillmentOrders = order.fulfillmentOrders.edges;
    if (fulfillmentOrders.length === 0) {
      throw new Error(
        `No fulfillment orders found for order: ${externalOrderNumber}`
      );
    }

    console.log(`📦 Found ${fulfillmentOrders.length} fulfillment order(s):`);
    fulfillmentOrders.forEach((edge, index) => {
      console.log(`   ${index + 1}. ID: ${edge.node.id}`);
      console.log(`      Status: ${edge.node.status}`);
      console.log(`      Location: ${edge.node.assignedLocation?.name}`);
      console.log(
        `      Line Items: ${edge.node.lineItems?.edges?.length || 0}`
      );
    });

    // Step 3: Submit fulfillment request for each fulfillment order
    for (const fulfillmentOrderEdge of fulfillmentOrders) {
      const fulfillmentOrder = fulfillmentOrderEdge.node;

      // Only fulfill orders that are open/on_hold
      if (
        fulfillmentOrder.status !== "OPEN" &&
        fulfillmentOrder.status !== "ON_HOLD"
      ) {
        console.log(
          `⏭️  Skipping fulfillment order ${fulfillmentOrder.id} with status: ${fulfillmentOrder.status}`
        );
        continue;
      }

      console.log(
        `📋 Submitting fulfillment for order: ${fulfillmentOrder.id}`
      );

      const fulfillmentMutation = `
        mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
          fulfillmentCreateV2(fulfillment: $fulfillment) {
            fulfillment {
              id
              status
              trackingInfo {
                number
                url
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      // Prepare line items for fulfillment using the correct FulfillmentV2Input format
      const lineItemsForFulfillment = fulfillmentOrder.lineItems.edges
        .filter((edge) => edge.node.remainingQuantity > 0)
        .map((edge) => ({
          id: edge.node.id,
          quantity: edge.node.remainingQuantity,
        }));

      if (lineItemsForFulfillment.length === 0) {
        console.log(
          `⚠️  No remaining items to fulfill for fulfillment order: ${fulfillmentOrder.id}`
        );
        continue;
      }

      const fulfillmentInput = {
        fulfillment: {
          lineItemsByFulfillmentOrder: [
            {
              fulfillmentOrderId: fulfillmentOrder.id,
              fulfillmentOrderLineItems: lineItemsForFulfillment,
            },
          ],
          trackingInfo: {
            number: trackingNumber,
            url: trackingUrl,
          },
          notifyCustomer: true,
        },
      };

      console.log(
        "📋 Fulfillment input:",
        JSON.stringify(fulfillmentInput, null, 2)
      );

      const fulfillmentResponse = await fetch(
        `${shopifyStoreUrl}/admin/api/2024-01/graphql.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: fulfillmentMutation,
            variables: fulfillmentInput,
          }),
        }
      );

      if (!fulfillmentResponse.ok) {
        const errorText = await fulfillmentResponse.text();
        console.error("❌ Fulfillment submission failed:", errorText);
        throw new Error(
          `HTTP error! status: ${fulfillmentResponse.status} - ${fulfillmentResponse.statusText}`
        );
      }

      const fulfillmentData = await fulfillmentResponse.json();
      console.log(
        "📋 Fulfillment submission result:",
        JSON.stringify(fulfillmentData, null, 2)
      );

      // Check for errors in the mutation response
      if (fulfillmentData.data?.fulfillmentCreateV2?.userErrors?.length > 0) {
        const errors = fulfillmentData.data.fulfillmentCreateV2.userErrors;
        console.error("❌ Fulfillment user errors:", errors);
        throw new Error(
          `Fulfillment errors: ${errors.map((e: any) => e.message).join(", ")}`
        );
      }

      if (fulfillmentData.data?.fulfillmentCreateV2?.fulfillment) {
        console.log(
          "✅ Fulfillment created successfully:",
          fulfillmentData.data.fulfillmentCreateV2.fulfillment
        );
      }
    }

    console.log("🎉 All fulfillment orders processed successfully!");
  } catch (error) {
    console.error("❌ Error updating tracking number:", error);

    // Send error email
    await sendErrorEmail({
      orderId: externalOrderNumber,
      customerName: "unknown",
      timeStamp: new Date().toISOString(),
      errorMessage: `GraphQL fulfillment error: ${error.message}`,
    });

    throw error;
  }
}

export { sendTrackingNumberToShopifyGraphQL };
