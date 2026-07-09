import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getStyleMemory,
  resolveTelegramIdFromAuth,
} from "../../lib/style-profiles";

export default defineTool({
  description:
    "Search the web for shopping results when the user asks for specific items like 'summer clothes', 'sneakers', 'winter jackets', etc. Automatically incorporates the user's values, budget, and brand preferences to find products from companies that match their style profile. Use this when the user is explicitly looking to shop or find items to buy.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "The shopping query, e.g. 'summer dresses', 'sustainable sneakers', 'affordable winter coats'.",
      ),
    priceRange: z
      .string()
      .optional()
      .describe(
        "Optional price range override, e.g. 'under $50', '$100-200'. If not provided, uses the user's budget from their profile.",
      ),
  }),
  async execute(input, ctx) {
    const telegramId = resolveTelegramIdFromAuth(ctx.session.auth.current);

    if (!telegramId) {
      return {
        ok: false as const,
        error: "No Telegram user id on this session.",
      };
    }

    // Load user's style memory to get values, budget, and brand preferences
    const memory = await getStyleMemory(telegramId);

    // Build enhanced search query with user preferences
    let enhancedQuery = input.query;

    // Add values filter (e.g., "sustainable", "ethical")
    if (memory.profile?.values) {
      enhancedQuery = `${input.query} ${memory.profile.values}`;
    }

    // Add preferred brands if specified
    if (memory.profile?.preferredBrands) {
      enhancedQuery = `${enhancedQuery} ${memory.profile.preferredBrands}`;
    }

    // Add budget or price range
    const priceInfo = input.priceRange || memory.profile?.budget;
    if (priceInfo) {
      enhancedQuery = `${enhancedQuery} ${priceInfo}`;
    }

    // Add "shop" to make it a shopping query
    enhancedQuery = `shop ${enhancedQuery}`;

    // Return the enhanced query and user preferences
    // The agent can then use the built-in web_search tool with this context
    // or we provide guidance for manual search
    return {
      ok: true as const,
      query: input.query,
      enhancedQuery,
      userValues: memory.profile?.values || "none specified",
      userBudget: memory.profile?.budget || "none specified",
      preferredBrands: memory.profile?.preferredBrands || "none specified",
      avoidedBrands: memory.profile?.avoidedBrands || "none",
      searchGuidance: `Use the web_search tool with query: "${enhancedQuery}"${
        memory.profile?.avoidedBrands
          ? `. When reviewing results, filter out these brands: ${memory.profile.avoidedBrands}`
          : ""
      }`,
    };
  },
});
