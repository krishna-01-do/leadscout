import { describe, it, expect } from "vitest";
import { MockBusinessSearchProvider } from "../mock-provider";
import type { BusinessSearchQuery } from "@/types";

function makeQuery(overrides: Partial<BusinessSearchQuery> = {}): BusinessSearchQuery {
  return {
    businessCategory: "dental clinic",
    location: "Hyderabad",
    city: null,
    state: null,
    country: null,
    minRating: null,
    maxRating: null,
    minReviews: null,
    maxReviews: null,
    websiteCondition: "ANY",
    phoneRequired: false,
    emailRequired: false,
    keywords: [],
    resultLimit: 25,
    ...overrides,
  };
}

describe("MockBusinessSearchProvider", () => {
  it("should return businesses with correct provider name", async () => {
    const provider = new MockBusinessSearchProvider();
    const results = await provider.searchBusinesses(makeQuery());
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].provider).toBe("mock");
  });

  it("should normalize business fields", async () => {
    const provider = new MockBusinessSearchProvider();
    const results = await provider.searchBusinesses(makeQuery());
    const first = results[0];
    expect(first.name).toBeTruthy();
    expect(first.providerBusinessId).toBeTruthy();
    expect(first.id).toContain("mock-");
  });

  it("should filter by website condition MISSING", async () => {
    const provider = new MockBusinessSearchProvider();
    const results = await provider.searchBusinesses(
      makeQuery({ websiteCondition: "MISSING" })
    );
    expect(results.every((b) => !b.website)).toBe(true);
  });

  it("should filter by website condition PRESENT", async () => {
    const provider = new MockBusinessSearchProvider();
    const results = await provider.searchBusinesses(
      makeQuery({ websiteCondition: "PRESENT" })
    );
    expect(results.every((b) => b.website !== null)).toBe(true);
  });

  it("should filter by minimum rating", async () => {
    const provider = new MockBusinessSearchProvider();
    const results = await provider.searchBusinesses(
      makeQuery({ minRating: 4.5 })
    );
    expect(results.every((b) => b.rating !== null && b.rating >= 4.5)).toBe(true);
  });

  it("should filter by minimum reviews", async () => {
    const provider = new MockBusinessSearchProvider();
    const results = await provider.searchBusinesses(
      makeQuery({ minReviews: 100 })
    );
    expect(results.every((b) => b.reviewCount !== null && b.reviewCount >= 100)).toBe(true);
  });

  it("should filter by phone required", async () => {
    const provider = new MockBusinessSearchProvider();
    const results = await provider.searchBusinesses(
      makeQuery({ phoneRequired: true })
    );
    expect(results.every((b) => b.phone !== null)).toBe(true);
  });

  it("should respect result limit", async () => {
    const provider = new MockBusinessSearchProvider();
    const results = await provider.searchBusinesses(
      makeQuery({ resultLimit: 3 })
    );
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("should handle empty results gracefully", async () => {
    const provider = new MockBusinessSearchProvider();
    const results = await provider.searchBusinesses(
      makeQuery({ minRating: 5.0, minReviews: 9999 })
    );
    expect(results).toEqual([]);
  });
});
