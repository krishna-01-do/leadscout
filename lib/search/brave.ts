import { prospectingLimits } from "@/lib/search/limits";
import type { BraveWebResult } from "@/schemas/prospecting";

export class BraveSearchError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "BraveSearchError";
  }
}

interface BraveApiResult {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  page_age?: unknown;
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeBraveResults(query: string, payload: unknown): BraveWebResult[] {
  const web = payload && typeof payload === "object" ? (payload as { web?: { results?: unknown } }).web : undefined;
  const rawResults = web?.results;
  const rows = Array.isArray(rawResults) ? rawResults : [];
  const results: BraveWebResult[] = [];
  for (const row of rows) {
    const item = row as BraveApiResult;
    if (typeof item.url !== "string" || typeof item.title !== "string") continue;
    let url: URL;
    try {
      url = new URL(item.url);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    results.push({
      title: item.title,
      url: url.toString(),
      description: typeof item.description === "string" ? item.description : "",
      domain: domainOf(url.toString()),
      query,
      sourceType: "web",
      publishedAt: typeof item.page_age === "string" ? item.page_age : null,
    });
  }
  return results;
}

export async function searchBrave(query: string, country?: string): Promise<BraveWebResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) throw new BraveSearchError("Web search is not configured.", 0, false);

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(prospectingLimits.maxBraveResultsPerQuery));
  url.searchParams.set("search_lang", "en");
  if (country) url.searchParams.set("country", country);

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), prospectingLimits.braveTimeoutMs);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
        signal: controller.signal,
        cache: "no-store",
      });
      if (response.ok) return normalizeBraveResults(query, await response.json());
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= prospectingLimits.braveRetries) {
        throw new BraveSearchError(`Web search failed (${response.status}).`, response.status, retryable);
      }
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      if (error instanceof BraveSearchError) throw error;
      if (attempt >= prospectingLimits.braveRetries) {
        throw new BraveSearchError(aborted ? "Web search timed out." : "Web search could not be completed.", 0, true);
      }
    } finally {
      clearTimeout(timer);
    }
    attempt += 1;
    await sleep(250 * 2 ** attempt + Math.floor(Math.random() * 100));
  }
}

const cache = new Map<string, BraveWebResult[]>();

export async function searchBraveCached(query: string, country?: string) {
  const key = `${country ?? ""}:${query.trim().toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return { results: cached, cache: "hit" as const };
  const results = await searchBrave(query, country);
  cache.set(key, results);
  return { results, cache: "miss" as const };
}

export function clearBraveCache() {
  cache.clear();
}
