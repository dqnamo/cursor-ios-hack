import { NextRequest, NextResponse } from "next/server";
import { resetUserMemory, hasUserMemory } from "@/lib/reset-user-memory";

/**
 * Verify admin API key from Authorization header
 * Returns true if authorized, false otherwise
 */
function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const adminApiKey = process.env.ADMIN_API_KEY;

  // If no admin key is configured, block all requests
  if (!adminApiKey) {
    console.error(
      "ADMIN_API_KEY not configured - reset-user API is disabled for security",
    );
    return false;
  }

  // Expect "Bearer <token>" format
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  return token === adminApiKey;
}

/**
 * POST /api/reset-user
 * Reset a user's conversation memory and style data
 *
 * Headers:
 *   Authorization: Bearer <ADMIN_API_KEY>
 *
 * Body:
 * {
 *   "telegramId": "123456789",
 *   "resetProfile": true,      // optional, default: true
 *   "resetStyleRefs": true,    // optional, default: true
 *   "resetWardrobe": false,    // optional, default: false
 *   "resetTelegramUser": false // optional, default: false
 * }
 *
 * Returns:
 * {
 *   "success": true,
 *   "result": {
 *     "telegramId": "123456789",
 *     "deletedProfile": true,
 *     "deletedStyleRefsCount": 5,
 *     "deletedWardrobeItemsCount": 0,
 *     "deletedTelegramUser": false
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  // Verify authentication
  if (!verifyAuth(request)) {
    return NextResponse.json(
      { error: "Unauthorized - valid ADMIN_API_KEY required" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { telegramId, ...options } = body;

    if (!telegramId || typeof telegramId !== "string") {
      return NextResponse.json(
        { error: "telegramId is required and must be a string" },
        { status: 400 },
      );
    }

    // Check if user has any memory before resetting
    const memoryCheck = await hasUserMemory(telegramId);

    if (!memoryCheck.hasAnyMemory) {
      return NextResponse.json(
        {
          error: "No memory found for this user",
          telegramId,
        },
        { status: 404 },
      );
    }

    // Reset user memory
    const result = await resetUserMemory(telegramId, options);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error resetting user memory:", error);
    return NextResponse.json(
      {
        error: "Failed to reset user memory",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/reset-user?telegramId=123456789
 * Check if a user has any saved memory
 *
 * Headers:
 *   Authorization: Bearer <ADMIN_API_KEY>
 */
export async function GET(request: NextRequest) {
  // Verify authentication
  if (!verifyAuth(request)) {
    return NextResponse.json(
      { error: "Unauthorized - valid ADMIN_API_KEY required" },
      { status: 401 },
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const telegramId = searchParams.get("telegramId");

    if (!telegramId) {
      return NextResponse.json(
        { error: "telegramId query parameter is required" },
        { status: 400 },
      );
    }

    const memoryCheck = await hasUserMemory(telegramId);

    return NextResponse.json({
      telegramId,
      ...memoryCheck,
    });
  } catch (error) {
    console.error("Error checking user memory:", error);
    return NextResponse.json(
      {
        error: "Failed to check user memory",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
