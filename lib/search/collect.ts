import type { SearchStrategy, BraveWebResult } from "@/schemas/prospecting";
import { searchBraveCached } from "@/lib/search/brave";

function braveCountry(strategy: SearchStrategy) {
  const country = strategy.targetMarket.countries[0]?.toLowerCase() ?? "";
  if (country.includes("united states") || country === "us" || country === "usa") return "US";
  if (country.includes("india")) return "IN";
  if (country.includes("united kingdom") || country === "uk" || country.includes("britain")) return "GB";
  return undefined;
}

export async function collectBraveResults(strategy: SearchStrategy) {
  const country = braveCountry(strategy);
  const batches = await Promise.all(strategy.webIntentQueries.map(async (query) => {
    try {
      const { results, cache } = await searchBraveCached(query, country);
      console.info("ApplyVelocity web search query", { cache, results: results.length });
      return results;
    } catch (error) {
      console.error("ApplyVelocity web search query failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
      return null;
    }
  }));
  const merged: BraveWebResult[] = [];
  const seen = new Set<string>();
  let failures = 0;
  for (const batch of batches) {
    if (!batch) {
      failures += 1;
      continue;
    }
    for (const result of batch) {
      if (seen.has(result.url)) continue;
      seen.add(result.url);
      merged.push(result);
    }
  }
  return { results: merged, failures };
}
