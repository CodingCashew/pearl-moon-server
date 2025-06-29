#!/usr/bin/env node

const {
  checkAndNotifyCustomers,
} = require("../api/check-for-order-status-updates");

async function runOrderCheck() {
  try {
    console.log(`[${new Date().toISOString()}] Starting order status check...`);
    await checkAndNotifyCustomers();
    console.log(
      `[${new Date().toISOString()}] Order status check completed successfully`
    );
    process.exit(0);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error during order check:`,
      error
    );
    process.exit(1);
  }
}

runOrderCheck();
