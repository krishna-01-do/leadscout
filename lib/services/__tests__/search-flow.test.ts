import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdmin: () => db }));
import { processProviderRun } from "../search-service";

let status: string;
let usageError: { code: string; message: string } | null;
let writes: Array<{ table: string; value: Record<string, unknown> | Record<string, unknown>[] }>;
const query = { businessCategory: "gym", location: "Kondapur", city: null, state: null, country: null,
  minRating: null, maxRating: null, minReviews: null, maxReviews: null, websiteCondition: "ANY",
  phoneRequired: false, emailRequired: false, keywords: [], resultLimit: 20 };
beforeEach(() => {
  status = "SEARCHING"; usageError = null; writes = [];
  vi.stubEnv("APIFY_API_TOKEN", "test-token"); vi.stubEnv("APIFY_ACTOR_ID", "test/actor");
  db.rpc.mockReset().mockImplementation(async () => { status = "FAILED"; return { error: null }; });
  db.from.mockImplementation((table: string) => {
    let operation = "select";
    let value: Record<string, unknown> | Record<string, unknown>[] = {};
    let allowed: string[] | undefined;
    const run = async () => {
      if (operation !== "select") {
        if (table === "searches" && allowed && !allowed.includes(status)) return { data: null, error: null };
        writes.push({ table, value });
        if (table === "searches") status = (value as { status: string }).status;
        if (table === "usage") return { data: null, error: usageError };
        if (table === "businesses") return { data: [{ id: "business-id", provider: "apify", provider_business_id: "place-1" }], error: null };
        return { data: { id: "search-id" }, error: null };
      }
      if (table === "provider_runs") return { data: { id: "run-row", search_id: "search-id", provider: "apify", created_at: new Date().toISOString() }, error: null };
      return { data: { id: "search-id", user_id: "user-id", status, parsed_query: query, requested_result_limit: 20 }, error: null };
    };
    const chain = {
      select: () => chain, eq: () => chain,
      in: (_key: string, values: string[]) => { allowed = values; return chain; },
      update: (data: typeof value) => { operation = "update"; value = data; return chain; },
      insert: (data: typeof value) => { operation = "insert"; value = data; return chain; },
      upsert: (data: typeof value) => { operation = "upsert"; value = data; return chain; },
      maybeSingle: run,
      then: (resolve: (result: unknown) => unknown, reject: (error: unknown) => unknown) => run().then(resolve, reject),
    };
    return chain;
  });
  vi.stubGlobal("fetch", vi.fn(async (url: string | URL) => new Response(JSON.stringify(String(url).includes("/items")
    ? [{ title: "Kondapur Gym", placeId: "place-1", categoryName: "Gym", city: "Kondapur", totalScore: 4.5, reviewsCount: 80, phone: "+910000000000" }]
    : { data: { id: "run-1", status: "SUCCEEDED", defaultDatasetId: "dataset-1" } }))));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Apify result processing through completion", () => {
  it("normalizes, stores, scores, records usage and completes the search", async () => {
    await processProviderRun("run-1");
    expect(status).toBe("COMPLETED");
    expect(writes.find(w => w.table === "search_results")?.value).toEqual([expect.objectContaining({ business_id: "business-id", qualified: true })]);
    expect(writes.find(w => w.table === "usage")?.value).toEqual(expect.objectContaining({ type: "leads", amount: 1 }));
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("ignores duplicate usage protected by the original partial unique index", async () => {
    usageError = { code: "23505", message: "duplicate key" };
    await processProviderRun("run-1");
    expect(status).toBe("COMPLETED");
  });
  it("does not mark the search failed on a transient Apify status error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    await expect(processProviderRun("run-1")).rejects.toThrow("Apify status failed (503)");
    expect(status).toBe("SEARCHING"); expect(db.rpc).not.toHaveBeenCalled();
  });
  it("does not race an already processing worker", async () => {
    status = "PROCESSING";
    await processProviderRun("run-1");
    expect(writes).toEqual([]); expect(fetch).not.toHaveBeenCalled();
  });
  it("refunds a failed persistence operation and does not show completed", async () => {
    usageError = { code: "42501", message: "permission denied" };
    await expect(processProviderRun("run-1")).rejects.toThrow("42501");
    expect(status).toBe("FAILED");
    expect(db.rpc).toHaveBeenCalledWith("fail_search_and_refund", expect.objectContaining({ p_search_id: "search-id" }));
  });
});
