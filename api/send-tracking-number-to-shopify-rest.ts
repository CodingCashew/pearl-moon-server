import { Order } from "../lib/order-type.js";
import sendErrorEmail from "./send-error-email.js";
import { config } from "dotenv";

config();

async function sendTrackingNumberToShopify(
  externalOrderNumber: string,
  trackingNumber: string,
  trackingUrl: string
) {
  // console.log(
  //   "externalOrderNumber, trackingNumber, trackingUrl:",
  //   externalOrderNumber,
  //   trackingNumber,
  //   trackingUrl
  // );

  const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  // Validate environment variables
  if (!shopifyStoreUrl || !accessToken) {
    throw new Error(
      "Missing required environment variables: SHOPIFY_STORE_URL or SHOPIFY_ACCESS_TOKEN"
    );
  }

  try {
    // First, search for the Shopify order using name parameter
    // console.log(
    //   `Searching for Shopify order with name: #${externalOrderNumber}`
    // );

    const searchResponse = await fetch(
      `${shopifyStoreUrl}/admin/api/2024-01/orders.json?order_number=${externalOrderNumber}`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    // console.log("REST API Search Response Status:", searchResponse.status);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.log("REST API Error Response:", errorText);
      throw new Error(
        `Failed to search for order: ${searchResponse.status} - ${searchResponse.statusText}`
      );
    }

    const searchData = await searchResponse.json();

    if (!searchData.orders || searchData.orders.length === 0) {
      throw new Error(
        `No Shopify order found with name: ${externalOrderNumber}`
      );
    }

    // Keep this
    const shopifyOrderId =
      searchData.orders.find(
        (order: Order) =>
          order.name === `#${externalOrderNumber}` ||
          order.order_number === externalOrderNumber
      )?.id || "Förbannat!";

    // keep this
    const theShopifyOrderThatMatches = searchData.orders.find(
      (order: Order) =>
        order.name === `#${externalOrderNumber}` ||
        order.order_number === externalOrderNumber
    );
    console.log('theShopifyOrderThatMatches:', theShopifyOrderThatMatches);
    // console.log('this should be 6369697923323:', theShopifyOrderThatMatches.id);

    // console.log(
    //   `Found Shopify order ID: ${shopifyOrderId} for order name: ${externalOrderNumber}`
    // );

    // Now create the fulfillment using REST API
    // console.log("Creating fulfillment with REST API...", {
    //   tracking_number: trackingNumber,
    //   tracking_url: trackingUrl,
    //   id: shopifyOrderId,
    // });

    const response = await fetch(
      `${shopifyStoreUrl}/admin/api/2024-01/orders/${shopifyOrderId}/fulfillments.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fulfillment: {
            tracking_number: trackingNumber,
            tracking_url: trackingUrl,
            notify_customer: true,
          },
        }),
      }
    );

    if (!response.ok) {
      console.log("REST API Fulfillment Response:", response);
      console.error(
        "Error sending Tracking number to Shopify:",
        response.status + " " + response.statusText,
        externalOrderNumber,
        trackingNumber,
        trackingUrl
      );

      const errorText = await response.text();
      console.log("Fulfillment Error Response:", errorText);

      await sendErrorEmail({
        orderId: externalOrderNumber,
        customerName: "unknown",
        timeStamp: new Date().toISOString(),
        errorMessage: `Error sending tracking number to Shopify. Status: ${response.status} - ${response.statusText}, full response: ${errorText}`,
      });

      throw new Error(
        `HTTP error! status: ${response.status} & Status: ${response.status} - ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("REST API Fulfillment created successfully:", data);
  } catch (error) {
    console.error("Error updating tracking number:", error);
    throw error;
  }
}

export { sendTrackingNumberToShopify };
