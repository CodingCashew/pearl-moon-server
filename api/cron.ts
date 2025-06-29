import { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAndNotifyCustomers } from "./check-for-order-status-updates.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("Running scheduled order status check...");
    await checkAndNotifyCustomers();

    return res.status(200).json({
      success: true,
      message: "Order status check completed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
