import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function getOrderStatus(req: VercelRequest, res: VercelResponse) {
  console.log("req.body:", req.body);
  // console.log("req.params:", req.params);
  const nalpacUrl = process.env.NALPAC_URL || "";
  const username = process.env.NALPAC_ACCOUNT_EMAIL || "";
  const password = process.env.NALPAC_PASSWORD || "";

  // Create Basic Auth credentials
  const credentials = btoa(`${username}:${password}`);

  const orderNumber =
    req.body.orderNumber || req.query.orderNumber;
  if (!orderNumber) {
    console.error("No order number provided in request body or query");
    return res.status(400).send("Bad Request; No order number provided");
  }

  try {
    const response = await fetch(
      `${nalpacUrl}/api/orderstatus?externalOrderNumber=${orderNumber}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Nalpac orders response:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nalpac API error: ${response.status} - ${errorText}`);
    }

    const orders = await response.json();
    console.log("Order status from Nalpac:", orders);

    return res.json(orders);
  } catch (error) {
    console.error("Error fetching order status from Nalpac:", error);
    return res.status(500).json({ error: "Failed to fetch order status" });
  }
}
