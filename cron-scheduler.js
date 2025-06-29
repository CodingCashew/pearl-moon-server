import cron from "node-cron";
import { config as dotenvConfig } from "dotenv";
import { checkAndNotifyCustomers } from "./api/check-for-order-status-updates.ts";
import sendLizNotification from "./api/send-liz-notification.js";

// Load environment variables
dotenvConfig();

// Run at 12 noon, 4pm, and 8pm Central Time
cron.schedule(
  "0 0 12,16,20 * * *",
  async () => {
    console.log(
      `[${new Date().toISOString()}] Running scheduled order status check...`
    );
    try {
      await sendLizNotification({
        type: "Scheduled Order Check",
        action: "Checking order statuses and notifying customers",
        timeStamp: new Date().toISOString(),
        subject: "Scheduled Order Check",
        body: "Checking order statuses and notifying customers at 12:30, 4:30, 8:30.",
      });

      await checkAndNotifyCustomers();
      console.log(
        `[${new Date().toISOString()}] Scheduled order check completed`
      );
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Scheduled order check failed:`,
        error
      );
    }
  },
  {
    timezone: "America/Chicago",
  }
);

console.log("Order status checker cron job started");

// Keep the process running
process.on("SIGINT", () => {
  console.log("Shutting down cron job...");
  process.exit(0);
});
