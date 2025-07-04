import dotenv from "dotenv";
import { syncInventory } from "./api/sync-inventory.js";

// Load environment variables
dotenv.config();

/**
 * Quick sync for main/popular products
 * Runs 2-3 times per day during business hours
 * Covers first 100 pages (~10,000 items) for faster execution
 */
async function quickSync(): Promise<void> {
  try {
    console.log("🚀 Starting QUICK inventory sync (pages 1-100)...\n");

    // Temporarily override the page limit for this sync
    const originalPages = process.env.NALPAC_MAX_PAGES;
    process.env.NALPAC_MAX_PAGES = "100";

    await syncInventory();

    // Restore original setting
    if (originalPages) {
      process.env.NALPAC_MAX_PAGES = originalPages;
    }

    console.log("\n✅ Quick inventory sync completed successfully!");
    console.log("📊 Covered ~10,000 items (first 100 pages)");
  } catch (error) {
    console.error("\n❌ Quick inventory sync failed:", error);
    process.exit(1);
  }
}

// Run the quick sync
quickSync();
