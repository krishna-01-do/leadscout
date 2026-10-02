import { prospectingLimits } from "@/lib/search/limits";

function normalizeQuery(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string) {
  return new Set(normalizeQuery(value).split(" ").filter((token) => token.length > 2));
}

function similar(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return normalizeQuery(left) === normalizeQuery(right);
  const shared = Array.from(a).filter((token) => b.has(token)).length
  return shared / Math.min(a.size, b.size) >= 0.8;
}

export function dedupeQueries(queries: string[], limit: number) {
  const kept: string[] = [];
  for (const query of queries) {
    const trimmed = query.trim();
    if (trimmed.length < 2) continue;
    if (kept.some((existing) => similar(existing, trimmed))) continue;
    kept.push(trimmed);
    if (kept.length >= limit) break;
  }
  return kept;
}

export function boundStrategyQueries<T extends { mapsQueries: string[]; webIntentQueries: string[] }>(strategy: T): T {
  return {
    ...strategy,
    mapsQueries: dedupeQueries(strategy.mapsQueries, prospectingLimits.maxMapQueries),
    webIntentQueries: dedupeQueries(strategy.webIntentQueries, prospectingLimits.maxBraveQueries),
  };
}
