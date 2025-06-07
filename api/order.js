import { distributorMap } from "../lib/distributorMap.js";
import dotenv from "dotenv";

dotenv.config();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  let order = req.body;
  console.log("Received order:", order);
  if (!order || !order.line_items) {
    sendErrorEmail("Invalid order data", {
      orderId: order.id || "unknown",
      customerName: `${order.customer.first_name} ${order.customer.last_name}`,
      distributor: "unknown",
    });
    return res.status(400).send("Bad Request; No order or no line items");
  }

  const honeysPlaceItems = order.line_items.filter(
    (item) => distributorMap[item.sku] === "honeysplace"
  );

  if (honeysPlaceItems.length) {
    try {
      const honeysPlaceOrder = {
        ...order,
        line_items: honeysPlaceItems,
      };
      console.log("Sending to Honey's Place:", honeysPlaceOrder);

      const result = await sendToHoneysPlace(honeysPlaceOrder);
      console.log('Honey\'s Place response:', result);
      return res.status(200).send("Ok");
    } catch (error) {
      console.error("Error processing Honey's Place order:", error);
      const orderDetailsForEmail = {
        orderId: order.id,
        customerName: `${order.customer.first_name} ${order.customer.last_name}`,
        distributor: "honeysplace",
      };
      await sendErrorEmail(
        "Error processing Honey's Place order",
        orderDetailsForEmail
      );
      return res.status(500).send("Internal Server Error");
    }
  }

  async function sendToHoneysPlace(honeysPlaceOrder) {
    const honeysPlaceUrl = process.env.HONEYS_PLACE_URL || "";
    try {
      const formattedOrder = formatHoneysPlaceOrder(honeysPlaceOrder);
      const response = await fetch(honeysPlaceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
        },
        body: formattedOrder,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Honey's Place API error: ${errorText}`);
      }
      console.log("Successfully sent to Honey's Place");
      // Optionally, handle the response from Honey's Place if needed
      return response;
    } catch (error) {
      const orderDetailsForEmail = {
        orderId: honeysPlaceOrder.id,
        customerName: `${honeysPlaceOrder.customer.first_name} ${honeysPlaceOrder.customer.last_name}`,
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

  function formatHoneysPlaceOrder(honeysPlaceOrder) {
    // Format the order for Honey's Place
    const account = process.env.HONEYS_PLACE_ACCOUNT;
    const password = process.env.HONEYS_PLACE_PASSWORD;
    const reference = honeysPlaceOrder.id;
    // const reference = "TEST";
    const shipby = "P008";
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const customer = honeysPlaceOrder.customer || {};
    const address = honeysPlaceOrder.shipping_address || {};

    const itemsXml = honeysPlaceOrder.line_items
      .map(
        (item) => `
        <item>
          <sku>${item.sku}</sku>
          <qty>${item.quantity || 1}</qty>
        </item>`
      )
      .join("");

    const xml = `<?xml version="1.0" encoding="iso-8859-1"?>
    <HPEnvelope>
      <account>${account}</account>
      <password>${password}</password>
      <order>
        <reference>${reference}</reference>
        <shipby>${shipby}</shipby>
        <date>${date}</date>
        <items>
          ${itemsXml}
        </items>
        <last>${customer.last_name || ""}</last>
        <first>${customer.first_name || ""}</first>
        <address1>${address.address1 || ""}</address1>
        <address2>${address.address2 || ""}</address2>
        <city>${address.city || ""}</city>
        <state>${address.province || address.state || ""}</state>
        <zip>${address.zip || address.postal_code || ""}</zip>
        <country>${address.country || "US"}</country>
        <phone>${address.phone || customer.phone || ""}</phone>
        <emailaddress>${customer.email || ""}</emailaddress>
        <instructions>${""}</instructions>
      </order>
    </HPEnvelope>`;

    console.log("Formatted Honey's Place order XML:", xml);
    return xml;
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
}
