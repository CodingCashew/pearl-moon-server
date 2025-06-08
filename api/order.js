import dotenv from "dotenv";

import sendToHoneysPlace from "./send-honeys-order.js"
import sendToWilliams from "./send-williams-order.js"
import sendToEntrenue from "./send-entrenue-order.js"
import { distributorMap } from "../lib/distributorMap.js";

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
      console.log("Sending to Honey's Place:", honeysPlaceOrder);

      const result = await sendToHoneysPlace(honeysPlaceOrder);
      console.log("Honey's Place response:", result);
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
    console.log('No Honey\'s Place items to process');
    // return res.status(200).send("No Honey's Place items to process");
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
      console.log("Sending to Williams:", williamsOrder);

      const result = await sendToWilliams(williamsOrder);
      console.log("Williams response:", result);
      return res.status(200).send("Ok");
    } catch (error) {
      console.error("Error processing Williams order:", error);
      const orderDetailsForEmail = {
        orderId: order.id,
        customerName: `${order.customer.first_name} ${order.customer.last_name}`,
        distributor: "williams",
      };
      await sendErrorEmail(
        "Error processing Williams order",
        orderDetailsForEmail
      );
      return res.status(500).send("Internal Server Error");
    }
  } else {
    console.log('No Williams items to process');
    // return res.status(200).send("No Honey's Place items to process");
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
      console.log("Sending to Entrenue:", entrenueOrder);

      const result = await sendToEntrenue(entrenueOrder);
      console.log("Entrenue response:", result);
      return res.status(200).send("Ok");
    } catch (error) {
      console.error("Error processing Entrenue order:", error);
      const orderDetailsForEmail = {
        orderId: order.id,
        customerName: `${order.customer.first_name} ${order.customer.last_name}`,
        distributor: "entrenue",
      };
      await sendErrorEmail(
        "Error processing Entrenue order",
        orderDetailsForEmail
      );
      return res.status(500).send("Internal Server Error");
    }
  } else {
    // return res.status(200).send("No Honey's Place items to process");
    console.log('No Entrenue items to process');
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
