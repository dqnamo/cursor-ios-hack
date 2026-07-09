#!/usr/bin/env tsx

/**
 * CLI script to reset user memory
 *
 * Usage:
 *   npx tsx scripts/reset-user.ts <telegramId> [options]
 *
 * Options:
 *   --profile          Reset style profile (default: true)
 *   --no-profile       Keep style profile
 *   --refs             Reset style references (default: true)
 *   --no-refs          Keep style references
 *   --wardrobe         Reset wardrobe items (default: false)
 *   --telegram-user    Reset telegram user record (default: false)
 *   --all              Reset everything including wardrobe
 *   --check            Only check if user has memory (don't reset)
 *
 * Examples:
 *   # Reset profile and refs (default)
 *   npx tsx scripts/reset-user.ts 123456789
 *
 *   # Reset everything including wardrobe
 *   npx tsx scripts/reset-user.ts 123456789 --all
 *
 *   # Only reset refs, keep profile
 *   npx tsx scripts/reset-user.ts 123456789 --no-profile
 *
 *   # Check if user has memory
 *   npx tsx scripts/reset-user.ts 123456789 --check
 */

import { resetUserMemory, hasUserMemory } from "../lib/reset-user-memory";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: npx tsx scripts/reset-user.ts <telegramId> [options]

Options:
  --profile          Reset style profile (default: true)
  --no-profile       Keep style profile
  --refs             Reset style references (default: true)
  --no-refs          Keep style references
  --wardrobe         Reset wardrobe items (default: false)
  --telegram-user    Reset telegram user record (default: false)
  --all              Reset everything including wardrobe
  --check            Only check if user has memory (don't reset)

Examples:
  # Reset profile and refs (default)
  npx tsx scripts/reset-user.ts 123456789

  # Reset everything including wardrobe
  npx tsx scripts/reset-user.ts 123456789 --all

  # Only reset refs, keep profile
  npx tsx scripts/reset-user.ts 123456789 --no-profile

  # Check if user has memory
  npx tsx scripts/reset-user.ts 123456789 --check
    `);
    process.exit(0);
  }

  const telegramId = args[0];

  if (!telegramId || telegramId.startsWith("--")) {
    console.error("Error: telegramId is required");
    process.exit(1);
  }

  const checkOnly = args.includes("--check");
  const resetAll = args.includes("--all");

  const options = {
    resetProfile: resetAll || (!args.includes("--no-profile") && args.includes("--profile") !== false),
    resetStyleRefs: resetAll || (!args.includes("--no-refs") && args.includes("--refs") !== false),
    resetWardrobe: resetAll || args.includes("--wardrobe"),
    resetTelegramUser: resetAll || args.includes("--telegram-user"),
  };

  try {
    // Check if user has memory
    console.log(`Checking memory for Telegram user: ${telegramId}`);
    const memoryCheck = await hasUserMemory(telegramId);

    console.log("\nCurrent state:");
    console.log(`  Profile: ${memoryCheck.hasProfile ? "exists" : "not found"}`);
    console.log(`  Style refs: ${memoryCheck.styleRefsCount}`);
    console.log(`  Wardrobe items: ${memoryCheck.wardrobeItemsCount}`);

    if (!memoryCheck.hasAnyMemory) {
      console.log("\n✓ No memory found for this user");
      process.exit(0);
    }

    if (checkOnly) {
      console.log("\n✓ User has memory (use without --check to reset)");
      process.exit(0);
    }

    // Confirm reset
    console.log("\nWill reset:");
    if (options.resetProfile) console.log("  - Style profile");
    if (options.resetStyleRefs) console.log("  - Style references");
    if (options.resetWardrobe) console.log("  - Wardrobe items");
    if (options.resetTelegramUser) console.log("  - Telegram user record");

    console.log("\nResetting...");

    // Reset user memory
    const result = await resetUserMemory(telegramId, options);

    console.log("\n✓ Reset complete:");
    console.log(`  Profile deleted: ${result.deletedProfile}`);
    console.log(`  Style refs deleted: ${result.deletedStyleRefsCount}`);
    console.log(`  Wardrobe items deleted: ${result.deletedWardrobeItemsCount}`);
    console.log(`  Telegram user deleted: ${result.deletedTelegramUser}`);
  } catch (error) {
    console.error("\n✗ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
