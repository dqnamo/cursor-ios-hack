import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getStyleMemory,
  resolveTelegramIdFromAuth,
} from "../../lib/style-profiles";

export default defineTool({
  description:
    "Search the web for shopping results when the user asks for specific items like 'summer clothes', 'sneakers', 'winter jackets', etc. This tool will find products from companies that match the user's values and budget preferences. Use this when the user is explicitly looking to shop or find items to buy.",
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

    // Build search query with user preferences
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

    // Define types for search results
    type SearchResult = {
      title: string;
      url: string;
      snippet: string;
    };

    try {
      // Check which search API is configured
      const tavilyKey = process.env.TAVILY_API_KEY;
      const serpApiKey = process.env.SERPAPI_KEY;

      let results: SearchResult[] = [];

      if (tavilyKey) {
        // Use Tavily API
        const searchResponse = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: enhancedQuery,
            search_depth: "basic",
            include_answer: false,
            max_results: 8,
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          results = (searchData.results || []).map(
            (r: { title: string; url: string; content: string }) => ({
              title: r.title,
              url: r.url,
              snippet: r.content,
            }),
          );
        }
      } else if (serpApiKey) {
        // Use SerpAPI
        const params = new URLSearchParams({
          q: enhancedQuery,
          api_key: serpApiKey,
          num: "8",
        });

        const searchResponse = await fetch(
          `https://serpapi.com/search?${params}`,
        );

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          results = (searchData.organic_results || []).map(
            (r: { title: string; link: string; snippet: string }) => ({
              title: r.title,
              url: r.link,
              snippet: r.snippet,
            }),
          );
        }
      } else {
        // No search API configured - return suggestions for manual search
        return {
          ok: true as const,
          query: input.query,
          enhancedQuery,
          userValues: memory.profile?.values || "none specified",
          userBudget: memory.profile?.budget || "none specified",
          preferredBrands: memory.profile?.preferredBrands || "none specified",
          avoidedBrands: memory.profile?.avoidedBrands || "none",
          results: [],
          resultsCount: 0,
          searchSuggestion: `Search for: "${enhancedQuery}" on Google or your preferred shopping platform. Based on your profile, look for items that match: ${memory.profile?.values || "your style"}, within ${memory.profile?.budget || "your budget"}${memory.profile?.preferredBrands ? `, from brands like ${memory.profile.preferredBrands}` : ""}${memory.profile?.avoidedBrands ? `, avoiding ${memory.profile.avoidedBrands}` : ""}.`,
        };
      }

      // Filter out brands the user wants to avoid
      if (memory.profile?.avoidedBrands && results.length > 0) {
        const avoidedBrands = memory.profile.avoidedBrands
          .toLowerCase()
          .split(",")
          .map((b) => b.trim());
        results = results.filter((result) => {
          const resultText =
            `${result.title} ${result.snippet} ${result.url}`.toLowerCase();
          return !avoidedBrands.some((brand) => resultText.includes(brand));
        });
      }

      // Limit to top 6 results
      const formattedResults = results.slice(0, 6);

      return {
        ok: true as const,
        query: input.query,
        enhancedQuery,
        userValues: memory.profile?.values || "none specified",
        userBudget: memory.profile?.budget || "none specified",
        preferredBrands: memory.profile?.preferredBrands || "none specified",
        avoidedBrands: memory.profile?.avoidedBrands || "none",
        results: formattedResults,
        resultsCount: formattedResults.length,
      };
    } catch (error) {
      return {
        ok: false as const,
        error: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
