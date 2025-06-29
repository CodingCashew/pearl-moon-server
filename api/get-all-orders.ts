import type { VercelRequest, VercelResponse } from "@vercel/node";

// TODO: Add a time or status constraint to this once I start scaling
export default async function getAllOrders(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const nalpacUrl = process.env.NALPAC_URL || "";
  const username = process.env.NALPAC_ACCOUNT_EMAIL || "";
  const password = process.env.NALPAC_PASSWORD || "";

  // Create Basic Auth credentials
  const credentials = btoa(`${username}:${password}`);

  try {
    const response = await fetch(`${nalpacUrl}/api/order`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Nalpac orders response:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nalpac API error: ${response.status} - ${errorText}`);
    }

    const orders = await response.json();
    console.log("Recent orders from Nalpac:", orders);

    res.json(orders);
  } catch (error) {
    console.error("Error fetching recent orders from Nalpac:", error);
    throw error;
  }
}
