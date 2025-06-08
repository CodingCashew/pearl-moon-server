import sendErrorEmail from "./order.js";

export default async function sendToWilliams(williamsOrder) {
  console.log("huzzah! in williams handler. Order:", williamsOrder);
  const williamsUrl = process.env.WILLIAMS_URL || "";
  try {
    const formattedOrder = formatWilliamsOrder(williamsOrder);
    const response = await fetch(williamsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
      },
      body: formattedOrder,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Williams API error: ${errorText}`);
    }
    console.log("Successfully sent to Williams");
    console.log("response.body:", await response.text());
    return response;
  } catch (error) {
    const orderDetailsForEmail = {
      orderId: williamsOrder.id,
      customerName: `${williamsOrder.customer.first_name} ${williamsOrder.customer.last_name}`,
      distributor: "williams",
    };
    console.error("Error sending to Williams:", error, orderDetailsForEmail);
    // await sendErrorEmail("Error sending to Williams", orderDetailsForEmail);

    await sendErrorEmail({
      orderId: order.id,
      customerName: `${williamsOrder.customer.first_name} ${williamsOrder.customer.last_name}`,
      distributor: "williams",
      timeStamp: new Date().toISOString(),
      errorMessage: "Error processing Williams order",
    });
    return;
  }
}

function formatWilliamsOrder(williamsOrder) {
  const reference = williamsOrder.order_number || williamsOrder.id;
  // const reference = "TEST";
  const customer = williamsOrder.customer || {};
  const address = williamsOrder.shipping_address || {};
  const shippingMethod = "BESTRATE";

  const productsXml = williamsOrder.line_items
    .map(
      (item) => `
      <product>
        <sku>${item.sku || ""}</sku>
        <quantity>${item.quantity || 1}</quantity>
      </product>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <order>
      <first_name>${customer.first_name || ""}</first_name>
      <last_name>${customer.last_name || ""}</last_name>
      <address1>${address.address1 || ""}</address1>
      <address2>${address.address2 || ""}</address2>
      <city>${address.city || ""}</city>
      <state>${address.province || address.state || ""}</state>
      <zip>${address.zip || address.postal_code || ""}</zip>
      <country>${"USA"}</country>
      <email>${customer.email || ""}</email>
      <shipping_method>${shippingMethod}</shipping_method>
      <reference>${reference}</reference>
      <products>
        ${productsXml}
      </products>
      <customer_code>${process.env.WILLIAMS_CUSTOMER_CODE || ""}</customer_code>
      <api_key>${process.env.WILLIAMS_API_KEY || ""}</api_key>
    </order>`;

  console.log("Formatted Williams order XML:", xml);

  return xml;
}
