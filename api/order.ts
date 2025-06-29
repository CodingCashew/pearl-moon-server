import dotenv from "dotenv";

import sendErrorEmail from "./send-error-email.js";
import sendToNalpac from "./send-nalpac-order.js";
import { VercelRequest, VercelResponse } from "@vercel/node";

dotenv.config();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  let order = req.body;
  console.log("Received order:", order);

  // TODO: Remove this entire block when ready to send orders to Nalpac for real
  if (order.email !== "lyzeuph@gmail.com") {
    sendErrorEmail({
      orderId: order.id,
      customerName: `${order.customer.first_name} ${order.customer.last_name}`,
      timeStamp: new Date().toISOString(),
      errorMessage:
        "Not executing the code for real customer since it's not ready to send orders to Nalpac yet.",
    });
    return;
  }

  if (!order || !order.line_items) {
    sendErrorEmail({
      orderId: order.id || order.name || order.orderId,
      customerName: `${order.customer.first_name} ${order.customer.last_name}`,
      timeStamp: new Date().toISOString(),
      errorMessage: "Bad Request; No order or no line items",
    });
    return res.status(400).send("Bad Request; No order or no line items");
  }

  const nalpacItems = order.line_items;

  if (nalpacItems.length) {
    const nalpacOrder = {
      ...order,
      line_items: nalpacItems,
    };

    try {
      const response = await sendToNalpac(nalpacOrder);
      console.log("Nalpac response:", response);

      return res.status(200).send("Ok");
    } catch (error) {
      console.error("Error processing Nalpac order:", error);

      await sendErrorEmail({
        orderId: nalpacOrder.id,
        customerName: `${nalpacOrder.customer.first_name} ${nalpacOrder.customer.last_name}`,
        timeStamp: new Date().toISOString(),
        errorMessage: "Error processing Nalpac order",
      });
      return res.status(500).send("Internal Server Error");
    }
  } else {
    console.log("No Nalpac items to process");
  }
}
