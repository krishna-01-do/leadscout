import type {
  BusinessSearchQuery,
  NormalizedBusiness,
  ProviderName,
} from "@/types";
import type { BusinessSearchProvider } from "./business-search-provider";

const APIFY_API_BASE = "https://api.apify.com/v2";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 2000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await delay(baseDelayMs * Math.pow(2, attempt));
      }
    }
  }
  throw lastError;
}

export class ApifyBusinessSearchProvider implements BusinessSearchProvider {
  readonly name: ProviderName = "apify";

  private token: string;
  private actorId: string;

  constructor() {
    this.token = process.env.APIFY_API_TOKEN ?? "";
    this.actorId = process.env.APIFY_ACTOR_ID ?? "";
  }

  private get isConfigured(): boolean {
    return this.token.length > 0 && this.actorId.length > 0;
  }

  async searchBusinesses(query: BusinessSearchQuery): Promise<NormalizedBusiness[]> {
    if (!this.isConfigured) {
      throw new Error(
        "Apify is not configured. Set APIFY_API_TOKEN and APIFY_ACTOR_ID environment variables."
      );
    }

    const searchQuery = this.buildSearchQuery(query);
    const runId = await this.startActorRun(searchQuery);
    const datasetId = await this.waitForRunCompletion(runId);
    const rawItems = await this.fetchDataset(datasetId, query.resultLimit);
    return this.normalizeResults(rawItems);
  }

  private buildSearchQuery(query: BusinessSearchQuery): Record<string, unknown> {
    const locationParts = [query.location, query.city, query.state, query.country]
      .filter(Boolean)
      .join(", ");

    return {
      searchStringsArray: [`${query.businessCategory} ${locationParts}`],
      maxCrawledPlacesPerSearch: query.resultLimit,
      language: "en",
      exports: { placeQueries: [{ searchStringsArray: [`${query.businessCategory} ${locationParts}`] }] },
    };
  }

  private async startActorRun(
    input: Record<string, unknown>
  ): Promise<string> {
    const url = `${APIFY_API_BASE}/acts/${this.actorId}/runs?token=${this.token}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Apify actor start failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    return data.data.id as string;
  }

  private async waitForRunCompletion(
    runId: string,
    timeoutMs: number = 120000,
    pollIntervalMs: number = 5000
  ): Promise<string> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const url = `${APIFY_API_BASE}/actor-runs/${runId}?token=${this.token}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to check Apify run status (${response.status})`);
      }

      const data = await response.json();
      const status = data.data.status as string;

      if (status === "SUCCEEDED") {
        return data.data.defaultDatasetId as string;
      }

      if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
        throw new Error(`Apify run ${status.toLowerCase()}`);
      }

      await delay(pollIntervalMs);
    }

    throw new Error("Apify run timed out");
  }

  private async fetchDataset(
    datasetId: string,
    limit: number
  ): Promise<Record<string, unknown>[]> {
    const url = `${APIFY_API_BASE}/datasets/${datasetId}/items?token=${this.token}&limit=${limit}&clean=true`;

    const data = await withRetry(async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch Apify dataset (${response.status})`);
      }
      return response.json();
    });

    return data as Record<string, unknown>[];
  }

  private normalizeResults(items: Record<string, unknown>[]): NormalizedBusiness[] {
    return items.map((item, index) => {
      const providerBusinessId =
        (item.placeId as string) ||
        (item.id as string) ||
        (item.googleId as string) ||
        `apify-${index}`;

      const website = (item.website as string) || null;

      return {
        id: `apify-${providerBusinessId}`,
        provider: "apify",
        providerBusinessId,
        name: (item.title as string) || (item.name as string) || "Unknown Business",
        category: ((item.categoryName as string) || (item.categories as string) || "") as string,
        address: (item.address as string) || null,
        city: (item.city as string) || null,
        state: (item.state as string) || null,
        country: (item.country as string) || null,
        latitude: ((item.location as Record<string, unknown>)?.lat as number) ?? (item.lat as number) ?? null,
        longitude: ((item.location as Record<string, unknown>)?.lng as number) ?? (item.lng as number) ?? null,
        phone: (item.phone as string) || null,
        email: (item.email as string) || null,
        website: website && website.trim() !== "" ? website : null,
        rating: (item.totalScore as number) ?? (item.rating as number) ?? null,
        reviewCount: (item.reviewsCount as number) ?? (item.reviews as number) ?? null,
        googleMapsUrl: (item.googleMapsUrl as string) || (item.url as string) || null,
        openingHours: (item.openingHours as Record<string, string>) || null,
        socialLinks: this.extractSocialLinks(item),
        metadata: item as Record<string, unknown>,
      };
    });
  }

  private extractSocialLinks(item: Record<string, unknown>): string[] | null {
    const links: string[] = [];
    if (item.facebook) links.push(item.facebook as string);
    if (item.instagram) links.push(item.instagram as string);
    if (item.twitter) links.push(item.twitter as string);
    if (item.linkedin) links.push(item.linkedin as string);
    return links.length > 0 ? links : null;
  }
}
