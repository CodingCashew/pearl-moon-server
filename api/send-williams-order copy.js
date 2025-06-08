import sendErrorEmail from "./order.js";

export default async function sendToWilliams(williamsOrder) {
  console.log('huzzah! in williams handler. Order:', williamsOrder);
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
    // Optionally, handle the response from Williams if needed
    console.log("response.body:", await response.text());
    return response;
  } catch (error) {
    const orderDetailsForEmail = {
      orderId: williamsOrder.id,
      customerName: `${williamsOrder.customer.first_name} ${williamsOrder.customer.last_name}`,
      distributor: "williams",
    };
    console.error("Error sending to Williams:", error, orderDetailsForEmail);
    await sendErrorEmail("Error sending to Williams", orderDetailsForEmail);
    return;
  }
}

function formatWilliamsOrder(williamsOrder) {

  // const reference = williamsOrder.order_number || williamsOrder.id;
  const reference = "TEST";
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const customer = williamsOrder.customer || {};
  const address = williamsOrder.shipping_address || {};

  const itemsXml = williamsOrder.line_items
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

      <order>
        <reference>${reference}</reference>

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

  console.log("Formatted Williams order XML:", xml);
  return xml;
}
