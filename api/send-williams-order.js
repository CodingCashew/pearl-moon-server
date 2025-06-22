import sendErrorEmail from "./order.js";

export default async function sendToWilliams(williamsOrder) {
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

    const responseText = await response.text();

    if (!response.ok) {
      const errorText = responseText;
      throw new Error(`Williams API error: ${errorText}`);
    }

    return response;
  } catch (error) {
    await sendErrorEmail({
      orderId: williamsOrder.id,
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
  const customer = williamsOrder.customer || {};
  const address = williamsOrder.shipping_address || {};
  const shippingMethod = "BESTRATE";

  const customerCode = process.env.WILLIAMS_CUSTOMER_CODE || "";
  const accessKey = process.env.WILLIAMS_API_KEY || "";

  const productsXml = williamsOrder.line_items
    .map(
      (item) => `
          <value>
            <struct>
              <member>
                <name>sku</name>
                <value><string>${item.sku || ""}</string></value>
              </member>
              <member>
                <name>quantity</name>
                <value><int>${item.quantity || 1}</int></value>
              </member>
            </struct>
          </value>`
    )
    .join("");

  const xmlRpc = `<?xml version="1.0" encoding="UTF-8"?>
    <methodCall>
      <methodName>weborders.submitOrder</methodName>
      <params>
        <param>
          <value>
            <struct>
              <member>
                <name>first_name</name>
                <value><string>${customer.first_name || ""}</string></value>
              </member>
              <member>
                <name>last_name</name>
                <value><string>${customer.last_name || ""}</string></value>
              </member>
              <member>
                <name>address1</name>
                <value><string>${address.address1 || ""}</string></value>
              </member>
              <member>
                <name>address2</name>
                <value><string>${address.address2 || ""}</string></value>
              </member>
              <member>
                <name>city</name>
                <value><string>${address.city || ""}</string></value>
              </member>
              <member>
                <name>state</name>
                <value><string>${
                  address.province || address.state || ""
                }</string></value>
              </member>
              <member>
                <name>zip</name>
                <value><string>${
                  address.zip || address.postal_code || ""
                }</string></value>
              </member>
              <member>
                <name>country</name>
                <value><string>USA</string></value>
              </member>
              <member>
                <name>email</name>
                <value><string>${customer.email || ""}</string></value>
              </member>
              <member>
                <name>shipping_method</name>
                <value><string>${shippingMethod}</string></value>
              </member>
              <member>
                <name>reference</name>
                <value><string>${reference}</string></value>
              </member>
              <member>
                <name>notes</name>
                <value><string></string></value>
              </member>
              <member>
                <name>reference2</name>
                <value><string></string></value>
              </member>
              <member>
                <name>reference3</name>
                <value><string></string></value>
              </member>
              <member>
                <name>products</name>
                <value>
                  <array>
                    <data>${productsXml}
                    </data>
                  </array>
                </value>
              </member>
            </struct>
          </value>
        </param>
        <param>
          <value><string>${customerCode}</string></value>
        </param>
        <param>
          <value><string>${accessKey}</string></value>
        </param>
      </params>
    </methodCall>`;

  return xmlRpc;
}
