import { distributorMap } from "../lib/distributorMap.js";
import dotenv from "dotenv";

dotenv.config();

export default async function handler(req, res) {
  console.log("Request body ------------------------> ", req.body);
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const order = req.body;

  if (!order || !order.line_items) {
    sendErrorEmail("Invalid order data", {
      orderId: order.id || "unknown",
      customerName:
        `${order.customer.first_name} ${order.customer.last_name}` || "unknown",
      distributor: "unknown",
    });
    return res.status(400).send("Bad Request; No order or no line items");
  }

  const lineItems = order.line_items.map((item) => {
    const distributor = getDistributor(item.product_id);
    return {
      ...item,
      distributor,
    };
  });
  console.log("Line items after adding distributor property:", lineItems);

  order = {
    ...order,
    line_items: lineItems,
  };

  console.log("Order after adding distributor property:", order);

  const sexologyItems = order.line_items.filter(
    (item) => item.vendor === "sexology"
  );
  const honeysPlaceItems = order.line_items.filter(
    (item) => item.vendor === "honeysplace"
  );
  const unknownItems = order.line_items.filter(
    (item) => item.vendor !== "sexology" && item.vendor !== "honeysplace"
  );
  if (unknownItems.length) {
    // TODO: update this to send all the items in the unknownItems array
    const orderDetailsForEmail = {
      orderId: order.id,
      customerName: `${order.customer.first_name} ${order.customer.last_name}`,
      distributor: unknownItems[0].vendor,
    };
    await sendErrorEmail("Unknown distributor", orderDetailsForEmail);
  }

  if (sexologyItems.length) {
    sendToSexology(order, sexologyItems);
  }
  if (honeysPlaceItems.length) {
    sendToHoneysPlace(order, honeysPlaceItems);
  }
  res.status(200).send("OK");
}

async function sendToSexology(fullOrder, sexologyItems) {
  try {
    const formattedOrder = formatSexologyOrder(fullOrder, sexologyItems);
    console.log("Sending to Sexology:", formattedOrder);
    // Send the formatted order to Sexology
  } catch (error) {
    const orderDetailsForEmail = {
      orderId: fullOrder.id,
      customerName: `${fullOrder.customer.first_name} ${fullOrder.customer.last_name}`,
      distributor: "sexology",
    };
    console.error("Error sending to Sexology:", error, orderDetailsForEmail);
    await sendErrorEmail("Error sending to Sexology", orderDetailsForEmail);
    return;
  }
}

function formatSexologyOrder(fullOrder, sexologyItems) {
  // Format the order for Sexology
  return sexologyItems;
}

async function sendToHoneysPlace(fullOrder, honeysPlaceItems) {
  try {
    const formattedOrder = formatHoneysPlaceOrder(fullOrder, honeysPlaceItems);
    console.log("Sending to Honey's Place:", formattedOrder);
    // send the formatted order to Honey's Place
  } catch (error) {
    const orderDetailsForEmail = {
      orderId: fullOrder.id,
      customerName: `${fullOrder.customer.first_name} ${fullOrder.customer.last_name}`,
      distributor: "honeysplace",
    };
    console.error(
      "Error sending to Honey's Place:",
      error,
      orderDetailsForEmail
    );
    await sendErrorEmail(
      "Error sending to Honey's Place",
      orderDetailsForEmail
    );
    return;
  }
}

function formatHoneysPlaceOrder(fullOrder, honeysPlaceItems) {
  // Format the order for Honey's Place
  return honeysPlaceItems;
}

async function sendErrorEmail(message, orderDetailsForEmail) {
  const sendErrorEmailUrl = process.env.BASE_URL;

  await fetch(`${sendErrorEmailUrl}/api/send-error-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId: orderDetailsForEmail.orderId,
      customerName: orderDetailsForEmail.customerName,
      distributor: orderDetailsForEmail.distributor,
      timeStamp: new Date().toISOString(),
      errorMessage: message,
    }),
  });
}

function getDistributor(productId) {
  console.log("productId:", productId);
  const distributor = distributorMap[productId] || "whoops";
  console.log("distributor:", distributor);

  return distributor;
}
