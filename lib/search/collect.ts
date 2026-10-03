import type { SearchStrategy, BraveWebResult } from "@/schemas/prospecting";
import { strategyLocation } from "@/lib/search/planner";
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

export async function collectBroadWebResults(strategy: SearchStrategy, location = "") {
  const place = strategyLocation(strategy, location).trim();
  const buyer = strategy.idealCustomerProfiles[0]?.businessTypes[0] ?? strategy.productSummary;
  const queries = [
    place ? `${buyer} in ${place}` : `${buyer} companies`,
    `${buyer} business directory`,
    place ? `${buyer} ${place}` : `list of ${buyer}`,
    `${strategy.productSummary} buyers`,
  ].map((query) => query.replace(/\s+/g, " ").trim().slice(0, 180));
  const unique = Array.from(new Set(queries.filter((query) => query.length >= 2)));
  const country = location.trim() ? braveCountry(strategy) : undefined;
  const batches = await Promise.all(unique.map(async (query) => {
    try {
      const { results } = await searchBraveCached(query, country);
      return results;
    } catch (error) {
      console.error("ApplyVelocity broad web search failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
      return [];
    }
  }));
  const merged: BraveWebResult[] = [];
  const seen = new Set<string>();
  for (const batch of batches) {
    for (const result of batch) {
      if (seen.has(result.url)) continue;
      seen.add(result.url);
      merged.push(result);
    }
  }
  return merged;
}

export async function broadenWebResults(strategy: SearchStrategy, location = "") {
  const place = strategyLocation(strategy, location);
  const buyer = strategy.idealCustomerProfiles[0]?.businessTypes[0] ?? strategy.productSummary;
  const query = `${buyer} ${place}`.trim().slice(0, 180);
  if (query.length < 2) return [];
  try {
    const { results } = await searchBraveCached(query, braveCountry(strategy));
    return results;
  } catch (error) {
    console.error("ApplyVelocity broad web search failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}
