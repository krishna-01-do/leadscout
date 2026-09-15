import { describe, it, expect } from "vitest";
import { generateCsv } from "../csv";
import type { SearchResultRow } from "@/types";

function makeResult(overrides: Partial<SearchResultRow> = {}): SearchResultRow {
  return {
    id: "result-1",
    searchId: "search-1",
    businessId: "biz-1",
    matchScore: 94,
    qualified: true,
    qualificationReason: "Strong match: dental clinic in Hyderabad.",
    opportunityFlags: ["NO_WEBSITE", "HIGH_RATING"],
    rank: 1,
    business: {
      id: "biz-1",
      provider: "mock",
      providerBusinessId: "mock-1",
      name: "Smile Dental",
      category: "Dental clinic",
      address: "Banjara Hills, Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      latitude: 17.4,
      longitude: 78.4,
      phone: "+91 98765 43210",
      email: null,
      website: null,
      rating: 4.7,
      reviewCount: 186,
      googleMapsUrl: "https://maps.google.com/?q=smile",
      openingHours: null,
      socialLinks: null,
      metadata: null,
    },
    ...overrides,
  };
}

describe("generateCsv", () => {
  it("should generate CSV with headers", () => {
    const csv = generateCsv([makeResult()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("Business Name");
    expect(lines[0]).toContain("Match Score");
    expect(lines[0]).toContain("Opportunity Flags");
  });

  it("should include business data in rows", () => {
    const csv = generateCsv([makeResult()]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toContain("Smile Dental");
    expect(lines[1]).toContain("Dental clinic");
    expect(lines[1]).toContain("Hyderabad");
    expect(lines[1]).toContain("94");
  });

  it("should escape commas in fields", () => {
    const csv = generateCsv([
      makeResult({
        business: {
          ...makeResult().business,
          name: "Smile, Dental Clinic",
          address: "Banjara Hills, Hyderabad",
        },
      }),
    ]);
    expect(csv).toContain('"Smile, Dental Clinic"');
  });

  it("should escape quotes in fields", () => {
    const csv = generateCsv([
      makeResult({
        business: {
          ...makeResult().business,
          name: 'Smile "Dental" Clinic',
        },
      }),
    ]);
    expect(csv).toContain('"Smile ""Dental"" Clinic"');
  });

  it("should handle empty results", () => {
    const csv = generateCsv([]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Business Name");
  });

  it("should join opportunity flags with semicolons", () => {
    const csv = generateCsv([makeResult()]);
    expect(csv).toContain("NO_WEBSITE; HIGH_RATING");
  });

  it("should neutralize spreadsheet formulas", () => {
    const csv = generateCsv([makeResult({
      business: { ...makeResult().business, name: "=HYPERLINK(\"https://evil.test\")" },
    })]);
    expect(csv).toContain("'=HYPERLINK");
  });
});
