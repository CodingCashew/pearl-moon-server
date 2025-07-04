import { Order } from "../lib/order-type.js";
import sendErrorEmail from "./send-error-email.js";

export default async function sendToNalpac(nalpacOrder: Order) {
  const nalpacUrl = process.env.NALPAC_URL || "";

  // Get available carriers and shipping options
  const username = process.env.NALPAC_ACCOUNT_EMAIL || "";
  const password = process.env.NALPAC_PASSWORD || "";
  const credentials = btoa(`${username}:${password}`);

  try {
    const formattedOrder = formatNalpacOrder(nalpacOrder);

    const response = await fetch(`${nalpacUrl}/api/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
        Authorization: `Basic ${credentials}`,
      },
      body: formattedOrder,
    });

    console.log("Nalpac response:", response);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nalpac API error: ${errorText}`);
    }
    console.log("Successfully sent to Nalpac");
    // Optionally, handle the response from Nalpac if needed
    console.log("response.body:", await response.text());
    return response;
  } catch (error) {
    const orderDetailsForEmail = {
      orderId: nalpacOrder.id,
      customerName: `${nalpacOrder.customer.first_name} ${nalpacOrder.customer.last_name}`,
    };
    console.error("Error sending to Nalpac:", error, orderDetailsForEmail);

    await sendErrorEmail({
      orderId: nalpacOrder.id,
      customerName: `${nalpacOrder.customer.first_name} ${nalpacOrder.customer.last_name}`,
      timeStamp: new Date().toISOString(),
      errorMessage: "Error processing Nalpac order",
    });
    return;
  }
}

function formatNalpacOrder(nalpacOrder: Order) {
  const reference = nalpacOrder.order_number || nalpacOrder.id;
  const customer = nalpacOrder.customer || {};
  const address = nalpacOrder.shipping_address || {};
  const shippingOptionId = 125816; // USPS Priority Mail (TODO: find a cheaper option)
  // ^ I think I can omit this line from the XML and it will default to the cheapest shipping option available. // No, I guess it doesn't

  const createOrderRequestLines = nalpacOrder.line_items
    .map(
      (item: any) => `
    <CreateOrderRequestLine>
    <Sku>${item.sku || item.item_number}</Sku>
    <Quantity>${item.quantity || 1}</Quantity>
    </CreateOrderRequestLine>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <CreateOrderRequest xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ExternalOrderNumber>${reference}</ExternalOrderNumber>
  <PoNumber>${reference}</PoNumber>
  <OrderDate>${new Date().toISOString()}</OrderDate>
  <ShippingAddress>
  <Name>${customer.first_name || ""} ${customer.last_name || ""}</Name>
  <Address1>${address.address1 || ""}</Address1>
  <Address2>${address.address2 || ""}</Address2>
  <City>${address.city || ""}</City>
  <State>${address.province || address.state || ""}</State>
  <ZipCode>${address.zip || address.postal_code || ""}</ZipCode>
  <Country>US</Country>
  </ShippingAddress>
  <ShipToPhoneNumber>${
    address.phone || customer.phone || ""
  }</ShipToPhoneNumber>
  <ShipToEmailAddress>${customer.email || ""}</ShipToEmailAddress>
   <ShippingOptionId>${shippingOptionId}</ShippingOptionId>
  <DeliveryInstructions></DeliveryInstructions>
  <SignatureRequired>false</SignatureRequired>
  <CreateOrderRequestLines>${createOrderRequestLines}
  </CreateOrderRequestLines>
</CreateOrderRequest>`;

  console.log("Formatted Nalpac order XML:", xml);
  return xml;
}
