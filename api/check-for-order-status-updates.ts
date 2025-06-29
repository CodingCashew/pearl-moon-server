import fs from "fs/promises";
import path from "path";
import { sendTrackingNumberToShopify } from "./send-tracking-number-to-shopify-rest.js";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { shippingCodeToBaseTrackingUrl } from "../lib/shippingCodeToBaseTrackingUrl.js";
import { Order } from "../lib/order-type.js";

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE_PATH = path.join(__dirname, "../data/previous-orders.json");

// Create a function to fetch orders that can be used in cron jobs
async function fetchOrdersFromNalpac() {
  const nalpacUrl = process.env.NALPAC_URL || "";
  const username = process.env.NALPAC_ACCOUNT_EMAIL || "";
  const password = process.env.NALPAC_PASSWORD || "";

  console.log("Environment check:");
  console.log("NALPAC_URL:", nalpacUrl);
  console.log("NALPAC_ACCOUNT_EMAIL:", username ? "Set" : "Not set");
  console.log("NALPAC_PASSWORD:", password ? "Set" : "Not set");

  if (!nalpacUrl || !username || !password) {
    throw new Error(
      "Missing required environment variables: NALPAC_URL, NALPAC_ACCOUNT_EMAIL, or NALPAC_PASSWORD"
    );
  }

  // Create Basic Auth credentials
  const credentials = btoa(`${username}:${password}`);

  const fullUrl = `${nalpacUrl}api/order`;
  console.log("Fetching orders from URL:", fullUrl);

  try {
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nalpac API error: ${response.status} - ${errorText}`);
    }

    const orders = await response.json();
    console.log("Orders fetched from Nalpac:", orders);
    return orders;
  } catch (error) {
    console.error("Error fetching orders from Nalpac:", error);
    throw error;
  }
}

async function getPreviousResponse() {
  try {
    // fetch the previous response from json file
    const data = await fs.readFile(DATA_FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or can't be read, return empty structure
    console.log("No previous orders file found, starting fresh");
    return { Orders: [] };
  }
}

async function fetchCurrentOrderStatusFromNalpac() {
  const response = await fetchOrdersFromNalpac();
  return response;
}

async function checkAndNotifyCustomers() {
  const previousResponse = await getPreviousResponse();
  const currentResponse = await fetchCurrentOrderStatusFromNalpac();
  console.log("currentResponse:", currentResponse);

  // Compare current response with previous response
  if (currentResponse.Orders) {
    for (const order of currentResponse.Orders) {
      const previousOrder = previousResponse.Orders.find(
        (prevOrder: Order) =>
          prevOrder.ExternalOrderNumber === order.ExternalOrderNumber
      );

      // Check for status changes OR if order is shipped and we haven't seen it before
      const statusChanged =
        previousOrder && previousOrder.Status !== order.Status;
      const isNewShippedOrder = !previousOrder && order.Status === "Shipped";

      if (statusChanged) {
        // If order status has changed
        console.log(
          `Order ${order.ExternalOrderNumber} status changed from ${previousOrder.Status} to ${order.Status}`
        );

        if (order.Status === "Shipped" && order.Packages.length > 0) {
          for (const product of order.Packages) {
            // Send tracking info to the customer via Shopify
            const trackingUrl = await shippingCodeToBaseTrackingUrl(
              order.Carrier,
              product.TrackingNumber
            );
            await sendTrackingNotification(
              order.ExternalOrderNumber,
              product.TrackingNumber,
              trackingUrl
            );
          }
        }

        // Optionally update order's status in your database or system
        updateOrderStatusInStorage(order);
      } else if (isNewShippedOrder) {
        console.log(
          `New shipped order found: ${order.ExternalOrderNumber} with status ${order.Status}`
        );

        if (order.Packages.length > 0) {
          for (const product of order.Packages) {
            // Send tracking info to the customer via Shopify
            const trackingUrl = await shippingCodeToBaseTrackingUrl(
              order.Carrier,
              product.TrackingNumber
            );
            await sendTrackingNotification(
              order.ExternalOrderNumber,
              product.TrackingNumber,
              trackingUrl
            );
          }
        }

        // Optionally update order's status in your database or system
        updateOrderStatusInStorage(order);
      }
    }
  }

  // Store the current response for the next check
  await saveCurrentResponse(currentResponse);
}

async function saveCurrentResponse(response: Order) {
  try {
    // Ensure the data directory exists
    await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });

    // Save the current response to JSON file
    await fs.writeFile(
      DATA_FILE_PATH,
      JSON.stringify(response, null, 2),
      "utf8"
    );
    console.log("Previous orders data saved successfully");
  } catch (error) {
    console.error("Error saving current response:", error);
  }
}

async function sendTrackingNotification(
  orderId: string,
  trackingNumber: string,
  trackingUrl: string
) {
  try {
    // Use your existing Shopify tracking function
    await sendTrackingNumberToShopify(orderId, trackingNumber, trackingUrl);
    console.log(`Tracking notification sent for order ${orderId}`);
  } catch (error) {
    console.error(
      `Error sending tracking notification for order ${orderId}:`,
      error
    );
  }
}

function updateOrderStatusInStorage(order: any) {
  // Placeholder for updating order status in your database/storage
  // You can implement this based on your storage system
  console.log(
    `Order ${order.ExternalOrderNumber} status updated to: ${order.Status}`
  );
}

export { checkAndNotifyCustomers, getPreviousResponse, saveCurrentResponse };
