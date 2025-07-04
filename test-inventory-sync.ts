import dotenv from "dotenv";
import { syncInventory } from "./api/sync-inventory.js";

// Load environment variables
dotenv.config();

/**
 * Test the inventory sync function
 */
async function testInventorySync(): Promise<void> {
  try {
    console.log("🧪 Testing inventory sync function...\n");
    await syncInventory();
    console.log("\n✅ Inventory sync test completed successfully!");
  } catch (error) {
    console.error("\n❌ Inventory sync test failed:", error);
  }
}

// Run the test
testInventorySync();
