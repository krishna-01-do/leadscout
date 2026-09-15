import "server-only";

import type { BusinessSearchQuery, NormalizedBusiness, ProviderName } from "@/types";
import type { BusinessSearchProvider, ProviderRun } from "./business-search-provider";

const APIFY_API_BASE = "https://api.apify.com/v2";
const terminalFailures = new Set(["FAILED", "ABORTED", "TIMED-OUT"]);

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeWebUrl(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function actorReference(value: string): string {
  return value.trim().replace("/", "~");
}

function authorization(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

export class ApifyBusinessSearchProvider implements BusinessSearchProvider {
  readonly name: ProviderName = "apify";

  private configuration() {
    const token = process.env.APIFY_API_TOKEN;
    const actorId = process.env.APIFY_ACTOR_ID;
    if (!token || !actorId) throw new Error("Apify is not configured");
    return { token, actorId: actorReference(actorId) };
  }

  async startSearch(query: BusinessSearchQuery, callbackUrl?: string): Promise<ProviderRun> {
    const { token, actorId } = this.configuration();
    const url = new URL(`${APIFY_API_BASE}/acts/${encodeURIComponent(actorId)}/runs`);
    if (callbackUrl) {
      const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;
      if (!webhookSecret) throw new Error("Apify webhook secret is not configured");
      const webhooks = [{
        eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED", "ACTOR.RUN.ABORTED", "ACTOR.RUN.TIMED_OUT"],
        requestUrl: callbackUrl,
        headersTemplate: JSON.stringify({ "X-LeadScout-Webhook-Secret": webhookSecret }),
      }];
      url.searchParams.set("webhooks", Buffer.from(JSON.stringify(webhooks)).toString("base64"));
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { ...authorization(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        searchStringsArray: [`${query.businessCategory} in ${query.location}`],
        maxCrawledPlacesPerSearch: query.resultLimit,
        language: "en",
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Apify start failed (${response.status})`);

    const payload = await response.json() as {
      data?: { id?: string; defaultDatasetId?: string };
    };
    if (!payload.data?.id) throw new Error("Apify returned a malformed run");
    return {
      runId: payload.data.id,
      datasetId: payload.data.defaultDatasetId,
      status: "RUNNING",
    };
  }

  async getRun(runId: string): Promise<ProviderRun> {
    const { token } = this.configuration();
    const response = await fetch(`${APIFY_API_BASE}/actor-runs/${encodeURIComponent(runId)}`, {
      headers: authorization(token),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Apify status failed (${response.status})`);

    const payload = await response.json() as {
      data?: { id?: string; status?: string; defaultDatasetId?: string };
    };
    if (!payload.data?.id || !payload.data.status) {
      throw new Error("Apify returned a malformed run status");
    }
    return {
      runId: payload.data.id,
      datasetId: payload.data.defaultDatasetId,
      status: payload.data.status === "SUCCEEDED"
        ? "SUCCEEDED"
        : terminalFailures.has(payload.data.status) ? "FAILED" : "RUNNING",
    };
  }

  async getResults(run: ProviderRun, query: BusinessSearchQuery): Promise<NormalizedBusiness[]> {
    const { token } = this.configuration();
    if (!run.datasetId) throw new Error("Apify run has no dataset");
    const url = new URL(`${APIFY_API_BASE}/datasets/${encodeURIComponent(run.datasetId)}/items`);
    url.searchParams.set("clean", "true");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(query.resultLimit));
    const response = await fetch(url, {
      headers: authorization(token),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Apify dataset failed (${response.status})`);
    const rows = await response.json() as Record<string, unknown>[];
    return rows.map(normalizeApifyBusiness).filter((item): item is NormalizedBusiness => item !== null);
  }

  async searchBusinesses(query: BusinessSearchQuery): Promise<NormalizedBusiness[]> {
    const initial = await this.startSearch(query);
    const startedAt = Date.now();
    let run = initial;
    while (run.status === "RUNNING" && Date.now() - startedAt < 120_000) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      run = await this.getRun(run.runId);
    }
    if (run.status !== "SUCCEEDED") throw new Error("Apify run did not complete");
    return this.getResults(run, query);
  }
}

export function normalizeApifyBusiness(row: Record<string, unknown>): NormalizedBusiness | null {
  const name = text(row.title) || text(row.name);
  if (!name) return null;
  const location = row.location as Record<string, unknown> | undefined;
  const providerBusinessId = text(row.placeId) || text(row.cid) || text(row.id) ||
    `${name}|${text(row.address) || ""}`;
  const socialLinks = [row.facebook, row.instagram, row.twitter, row.linkedin]
    .map(safeWebUrl)
    .filter((link): link is string => link !== null);

  return {
    id: `apify-${providerBusinessId}`,
    provider: "apify",
    providerBusinessId,
    name,
    category: text(row.categoryName) || text(row.category) || "",
    address: text(row.address),
    city: text(row.city),
    state: text(row.state),
    country: text(row.countryCode) || text(row.country),
    latitude: number(row.latitude) ?? number(location?.lat),
    longitude: number(row.longitude) ?? number(location?.lng),
    phone: text(row.phone),
    email: text(row.email),
    website: safeWebUrl(row.website),
    rating: number(row.totalScore) ?? number(row.rating),
    reviewCount: number(row.reviewsCount) ?? number(row.reviews),
    googleMapsUrl: safeWebUrl(row.url) || safeWebUrl(row.googleMapsUrl),
    openingHours: (row.openingHours as Record<string, string>) || null,
    socialLinks: socialLinks.length ? socialLinks : null,
    metadata: {},
  };
}
