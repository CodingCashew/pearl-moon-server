import dotenv from "dotenv";

import sendToHoneysPlace from "./send-honeys-order.js";
import sendToWilliams from "./send-williams-order.js";
import sendToEntrenue from "./send-entrenue-order.js";
import { distributorMap } from "../lib/distributorMap.js";
import sendErrorEmail from "./send-error-email.js";

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

  // Honey's Place starts here, sorry for the repeated code, Liz
  const honeysPlaceItems = order.line_items.filter(
    (item) => distributorMap[item.sku] === "honeysplace"
  );

  if (honeysPlaceItems.length) {
    const honeysPlaceOrder = {
      ...order,
      line_items: honeysPlaceItems,
    };

    try {
      const response = await sendToHoneysPlace(honeysPlaceOrder);
      console.log("Honey's Place response:", response);

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
  } else {
    console.log("No Honey's Place items to process");
  }

  // Williams starts here, sorry for the repeated code, Liz
  const williamsItems = order.line_items.filter(
    (item) => distributorMap[item.sku] === "williams"
  );

  if (williamsItems.length) {
    const williamsOrder = {
      ...order,
      line_items: williamsItems,
    };

    try {
      const response = await sendToWilliams(williamsOrder);
      console.log("Williams response:", response);

      return res.status(200).send("Ok");
    } catch (error) {
      console.error("Error processing Williams order:", error);

      await sendErrorEmail({
        orderId: williamsOrder.id,
        customerName: `${williamsOrder.customer.first_name} ${williamsOrder.customer.last_name}`,
        distributor: "williams",
        timeStamp: new Date().toISOString(),
        errorMessage: "Error processing Williams order",
      });
      return res.status(500).send("Internal Server Error");
    }
  } else {
    console.log("No Williams items to process");
  }

  // Entrenue starts here, sorry for the repeated code, Liz
  const entrenueItems = order.line_items.filter(
    (item) => distributorMap[item.sku] === "entrenue"
  );

  if (entrenueItems.length) {
    const entrenueOrder = {
      ...order,
      line_items: entrenueItems,
    };

    try {
      const response = await sendToEntrenue(entrenueOrder);
      console.log("Entrenue response:", response);

      return res.status(200).send("Ok");
    } catch (error) {
      console.error("Error processing Entrenue order:", error);

      await sendErrorEmail({
        orderId: orentrenueOrderder.id,
        customerName: `${entrenueOrder.customer.first_name} ${entrenueOrder.customer.last_name}`,
        distributor: "entrenue",
        timeStamp: new Date().toISOString(),
        errorMessage: "Error processing Entrenue order",
      });
      return res.status(500).send("Internal Server Error");
    }
  } else {
    console.log("No Entrenue items to process");
  }
}
