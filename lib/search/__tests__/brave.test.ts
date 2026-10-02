import { afterEach, describe, expect, it, vi } from "vitest";
import { clearBraveCache, normalizeBraveResults, searchBrave } from "@/lib/search/brave";

afterEach(() => {
  clearBraveCache();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Brave search client", () => {
  it("keeps only results that include a real url", () => {
    expect(normalizeBraveResults("hiring", {
      web: { results: [
        { title: "Useful", url: "https://example.com/jobs", description: "Hiring" },
        { title: "Broken", url: "not a url" },
      ] },
    })).toEqual([expect.objectContaining({ title: "Useful", url: "https://example.com/jobs", query: "hiring" })]);
  });

  it("does not retry an authorization failure or put the key in the request URL", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "secret-token");
    const fetchMock = vi.fn(async () => new Response("no", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchBrave("clinics")).rejects.toThrow("401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls.at(0)?.at(0))).not.toContain("secret-token");
  });

  it("does not retry a forbidden response", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "secret-token");
    const fetchMock = vi.fn(async () => new Response("no", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchBrave("clinics")).rejects.toThrow("403");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a rate limit and then returns an empty result set", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "secret-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("slow", { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ web: { results: [] } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchBrave("clinics")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops after repeated timeouts", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "secret-token");
    const fetchMock = vi.fn(async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchBrave("clinics")).rejects.toThrow("timed out");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls.at(0)?.at(0))).not.toContain("secret-token");
  });

  it("retries a transient failure and then returns results", async () => {
    vi.stubEnv("BRAVE_SEARCH_API_KEY", "secret-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ web: { results: [{ title: "Clinic", url: "https://clinic.example", description: "" }] } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const results = await searchBrave("dental clinic hiring");
    expect(results).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const header = fetchMock.mock.calls[0][1].headers["X-Subscription-Token"];
    expect(header).toBe("secret-token");
  });
});
