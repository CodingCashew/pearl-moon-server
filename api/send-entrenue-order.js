import sendErrorEmail from "./order.js";

export default async function sendToEntrenue(entrenueOrder) {
  console.log("huzzah! in Entrenue handler. Order:", entrenueOrder);
  const entrenueUrl = process.env.ENTRENUE_URL || "";
  try {
    const formattedOrder = formatEntrenueOrder(entrenueOrder);
    const response = await fetch(entrenueUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
      },
      body: formattedOrder,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Entrenue API error: ${errorText}`);
    }
    console.log("Successfully sent to Entrenue");
    // Optionally, handle the response from Entrenue if needed
    console.log("response.body:", await response.text());
    return response;
  } catch (error) {
    const orderDetailsForEmail = {
      orderId: entrenueOrder.id,
      customerName: `${entrenueOrder.customer.first_name} ${entrenueOrder.customer.last_name}`,
      distributor: "entrenue",
    };
    console.error("Error sending to Entrenue:", error, orderDetailsForEmail);
    await sendErrorEmail("Error sending to Entrenue", orderDetailsForEmail);
    return;
  }
}

function formatEntrenueOrder(entrenueOrder) {
  // const reference = entrenueOrder.order_number || entrenueOrder.id;
  const reference = "TEST";
  const customer = entrenueOrder.customer || {};
  const address = entrenueOrder.shipping_address || {};
  const shippingMethod = "BEST WAY";

  const productsXml = entrenueOrder.line_items
    .map(
      (item) => `
      <product>
        <model>${item.sku || item.item_number}</model>
        <quantity>${item.quantity || 1}</quantity>
      </product>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <order>
      <email>${process.env.ENTRENUE_ACCOUNT_EMAIL}</email>
      <apikey>${process.env.ENTRENUE_API_KEY}</apikey>
      <po_number>${reference}</po_number>
      <name>${customer.first_name || ""} ${customer.last_name || ""}</name>
      <address_line1>${address.address1 || ""}</address_line1>
      <address_line2>${address.address2 || ""}</address_line2>
      <city>${address.city || ""}</city>
      <state>${address.province || address.state || ""}</state>
      <postcode>${address.zip || address.postal_code || ""}</postcode>
      <country>${"United States"}</country>
      <shipping_method>${shippingMethod}</shipping_method>
      <instructions></instructions>
      <products>
        ${productsXml}
      </products>
    </order>`;

  console.log("Formatted Entrenue order XML:", xml);
  return xml;
}
