import sendErrorEmail from "./order.js";

export default async function sendToHoneysPlace(honeysPlaceOrder) {
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
    console.log("response.body:", await response.text());
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
  const account = process.env.HONEYS_PLACE_ACCOUNT;
  const password = process.env.HONEYS_PLACE_PASSWORD;
  const reference = honeysPlaceOrder.order_number || honeysPlaceOrder.id;
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
        <country>${"US"}</country>
        <phone>${address.phone || customer.phone || ""}</phone>
        <emailaddress>${customer.email || ""}</emailaddress>
      </order>
    </HPEnvelope>`;

  console.log("Formatted Honey's Place order XML:", xml);
  return xml;
}
