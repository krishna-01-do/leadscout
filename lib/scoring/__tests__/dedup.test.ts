import { describe, it, expect } from "vitest";
import { deduplicateBusinesses } from "../dedup";
import type { NormalizedBusiness } from "@/types";

function makeBusiness(overrides: Partial<NormalizedBusiness> = {}): NormalizedBusiness {
  return {
    id: "test-1",
    provider: "mock",
    providerBusinessId: "test-1",
    name: "Test Business",
    category: "Dental clinic",
    address: null,
    city: null,
    state: null,
    country: null,
    latitude: null,
    longitude: null,
    phone: null,
    email: null,
    website: null,
    rating: null,
    reviewCount: null,
    googleMapsUrl: null,
    openingHours: null,
    socialLinks: null,
    metadata: null,
    ...overrides,
  };
}

describe("deduplicateBusinesses", () => {
  it("should deduplicate by provider + providerBusinessId", () => {
    const businesses = [
      makeBusiness({ provider: "apify", providerBusinessId: "abc", name: "A" }),
      makeBusiness({ provider: "apify", providerBusinessId: "abc", name: "B" }),
      makeBusiness({ provider: "apify", providerBusinessId: "def", name: "C" }),
    ];
    const result = deduplicateBusinesses(businesses);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("A");
  });

  it("should not merge businesses with same name but different provider IDs", () => {
    const businesses = [
      makeBusiness({ provider: "apify", providerBusinessId: "abc", name: "Smile Dental" }),
      makeBusiness({ provider: "apify", providerBusinessId: "def", name: "Smile Dental" }),
    ];
    const result = deduplicateBusinesses(businesses);
    expect(result).toHaveLength(2);
  });

  it("should not deduplicate businesses from different providers with different IDs", () => {
    const businesses = [
      makeBusiness({ provider: "apify", providerBusinessId: "abc", name: "Smile Dental", phone: "+91 123" }),
      makeBusiness({ provider: "mock", providerBusinessId: "xyz", name: "Smile Dental", phone: "+91 123" }),
    ];
    const result = deduplicateBusinesses(businesses);
    expect(result).toHaveLength(2);
  });

  it("should handle empty array", () => {
    expect(deduplicateBusinesses([])).toHaveLength(0);
  });

  it("should not accidentally merge unrelated businesses with similar names", () => {
    const businesses = [
      makeBusiness({ provider: "apify", providerBusinessId: "abc", name: "Smile Dental", phone: "+91 111" }),
      makeBusiness({ provider: "apify", providerBusinessId: "def", name: "Smile Dental", phone: "+91 222" }),
    ];
    const result = deduplicateBusinesses(businesses);
    expect(result).toHaveLength(2);
  });
});
