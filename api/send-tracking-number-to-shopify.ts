import sendErrorEmail from "./send-error-email.js";
import { config } from "dotenv";

// Load environment variables
config();

async function sendTrackingNumberToShopify(
  externalOrderNumber: string,
  trackingNumber: string,
  trackingUrl: string
) {
  console.log(
    "externalOrderNumber, trackingNumber, trackingUrl:",
    externalOrderNumber,
    trackingNumber,
    trackingUrl
  );
  const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  // Validate environment variables
  if (!shopifyStoreUrl || !accessToken) {
    throw new Error(
      "Missing required environment variables: SHOPIFY_STORE_URL or SHOPIFY_ACCESS_TOKEN"
    );
  }

  try {
    // First, find the Shopify order using GraphQL
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
              fulfillmentOrders(first: 10) {
                edges {
                  node {
                    id
                    status
                  }
                }
              }
            }
          }
        }
      }
    `;

    console.log("GraphQL Query Variables:", {
      query: `#${externalOrderNumber}`,
    });

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
            query: `name=#${externalOrderNumber}`,
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
        `No Shopify order found with name: ${externalOrderNumber}`
      );
    }

    const order = searchData.data.orders.edges[0].node;
    const shopifyOrderId = order.id;
    console.log(
      `Found Shopify order ID: ${shopifyOrderId} for order name: ${externalOrderNumber}`
    );

    // Get the fulfillment order ID (needed for GraphQL fulfillment creation)
    const fulfillmentOrders = order.fulfillmentOrders.edges;
    if (fulfillmentOrders.length === 0) {
      throw new Error(
        `No fulfillment orders found for order: ${externalOrderNumber}`
      );
    }

    const fulfillmentOrderId = fulfillmentOrders[0].node.id;
    console.log(`Using fulfillment order ID: ${fulfillmentOrderId}`);

    // Now create the fulfillment using GraphQL
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

    console.log("Creating fulfillment with GraphQL...", {
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      fulfillment_order_id: fulfillmentOrderId,
    });

    const response = await fetch(
      `${shopifyStoreUrl}/admin/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: fulfillmentMutation,
          variables: {
            fulfillment: {
              lineItems: fulfillmentOrders.map((edge: any) => ({
                fulfillmentOrderId: edge.node.id,
                quantity: 1,
              })),
              trackingInfo: {
                number: trackingNumber,
                url: trackingUrl,
              },
              notifyCustomer: true,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      console.log("GraphQL response:", response);
      console.error(
        "Error sending Tracking number to Shopify:",
        response.status + " " + response.statusText,
        externalOrderNumber,
        trackingNumber,
        trackingUrl
      );
      await sendErrorEmail({
        orderId: externalOrderNumber,
        customerName: "unknown",
        timeStamp: new Date().toISOString(),
        errorMessage: `Error sending tracking number to Shopify. Status: ${
          response.status
        } - ${response.statusText}, full response: ${await response.text()}`,
      });
      throw new Error(
        `HTTP error! status: ${response.status} & Status: ${response.status} - ${response.statusText}  `
      );
    }

    const data = await response.json();
    console.log("GraphQL Fulfillment result:", JSON.stringify(data, null, 2));

    // Check for GraphQL errors
    if (data.data?.fulfillmentCreateV2?.userErrors?.length > 0) {
      const errors = data.data.fulfillmentCreateV2.userErrors;
      console.error("GraphQL user errors:", errors);
      throw new Error(
        `GraphQL errors: ${errors.map((e:any) => e.message).join(", ")}`
      );
    }

    if (data.data?.fulfillmentCreateV2?.fulfillment) {
      console.log(
        "Fulfillment created successfully:",
        data.data.fulfillmentCreateV2.fulfillment
      );
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
