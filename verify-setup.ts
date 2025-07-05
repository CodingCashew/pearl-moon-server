#!/usr/bin/env npx tsx

/**
 * Local Environment Verification Script
 * Checks if all dependencies and environment variables are properly set up
 */

import { config } from "dotenv";
import { readFileSync, existsSync } from "fs";

console.log("🔍 Pearl Moon Server - Environment Verification");
console.log("=".repeat(50));

// Load environment variables
config();

// Check if .env file exists
const envExists = existsSync(".env");
console.log(`📁 .env file: ${envExists ? "✅ Found" : "❌ Missing"}`);

// Check package.json
const packageExists = existsSync("package.json");
console.log(`📦 package.json: ${packageExists ? "✅ Found" : "❌ Missing"}`);

if (packageExists) {
  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    console.log(`   - Name: ${pkg.name}`);
    console.log(`   - Version: ${pkg.version}`);
    console.log(
      `   - Dependencies: ${Object.keys(pkg.dependencies || {}).length}`
    );
  } catch (_error) {
    console.log("   ❌ Error reading package.json: ", _error);
  }
}

// Check required environment variables
const requiredEnvVars = [
  "SHOPIFY_SHOP_DOMAIN",
  "SHOPIFY_ACCESS_TOKEN",
  "NALPAC_USERNAME",
  "NALPAC_PASSWORD",
  "FULFILLMENT_SERVICE_NAME",
];

console.log("\n🔑 Environment Variables:");
const missingVars: string[] = [];

for (const varName of requiredEnvVars) {
  const value = process.env[varName];
  if (value) {
    const masked =
      value.length > 8
        ? value.substring(0, 4) + "***" + value.substring(value.length - 4)
        : "***";
    console.log(`   - ${varName}: ✅ ${masked}`);
  } else {
    console.log(`   - ${varName}: ❌ Missing`);
    missingVars.push(varName);
  }
}

// Check optional env vars
const optionalEnvVars = ["NALPAC_MAX_PAGES", "RATE_LIMIT_DELAY", "BATCH_SIZE"];

console.log("\n⚙️  Optional Environment Variables:");
for (const varName of optionalEnvVars) {
  const value = process.env[varName];
  console.log(`   - ${varName}: ${value || "Not set (using defaults)"}`);
}

// Check key files
console.log("\n📄 Key Files:");
const keyFiles = [
  "api/sync-inventory.ts",
  "sync-quick.ts",
  "sync-deep.ts",
  "test-inventory-sync.ts",
  "find-missing-skus.ts",
  "set-missing-to-zero.ts",
  "CRON-SETUP.md",
];

for (const file of keyFiles) {
  const exists = existsSync(file);
  console.log(`   - ${file}: ${exists ? "✅ Found" : "❌ Missing"}`);
}

// Summary
console.log("\n📊 Summary:");
if (missingVars.length === 0 && envExists && packageExists) {
  console.log("✅ Your environment is ready for deployment!");
  console.log("\nNext steps:");
  console.log("1. Run: ./deploy-to-ec2.sh <your-ec2-ip> <your-key-file>");
  console.log("2. Copy your .env file to the EC2 instance");
  console.log("3. Test the sync with: npm run sync:test");
} else {
  console.log("❌ Setup incomplete. Please fix the following:");
  if (!envExists) console.log("   - Create .env file with your credentials");
  if (!packageExists) console.log("   - Ensure package.json exists");
  if (missingVars.length > 0) {
    console.log("   - Add missing environment variables:");
    missingVars.forEach((varName) => console.log(`     * ${varName}`));
  }
}

console.log("\n" + "=".repeat(50));
