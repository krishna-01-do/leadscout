import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { dedupeQueries } from "@/lib/search/queries";
import { buildProspects } from "@/lib/search/pipeline";
import { matchWebResult, usableWebResults, webOnlyBusiness } from "@/lib/search/prospects";
import { fallbackStrategy, strategyLocation } from "@/lib/search/planner";
import { searchStrategySchema } from "@/schemas/prospecting";
import type { NormalizedBusiness } from "@/types";

const strategy = searchStrategySchema.parse({
  productSummary: "Inventory management automation",
  targetMarket: { countries: ["United States"], regions: [], cities: [] },
  idealCustomerProfiles: [{ industry: "Wholesale", businessTypes: ["distributor"], reason: "Inventory-heavy operations" }],
  mapsQueries: ["wholesale distributor", "warehouse"],
  webIntentQueries: ["inventory manager hiring"],
  painSignals: [],
  positiveSignals: [],
  negativeSignals: [],
  decisionMakerRoles: ["Operations Manager"],
  searchExplanation: "Buyers move stock.",
});

function business(overrides: Partial<NormalizedBusiness>): NormalizedBusiness {
  return {
    id: "1",
    provider: "apify",
    providerBusinessId: "place-1",
    name: "ABC Distribution",
    category: "distributor",
    address: "1 Main",
    city: "Houston",
    state: "Texas",
    country: "United States",
    latitude: null,
    longitude: null,
    phone: "+1 713-555-0100",
    email: null,
    website: "https://www.abc-distribution.com",
    rating: 4.2,
    reviewCount: 40,
    googleMapsUrl: "https://maps.example.com/abc",
    openingHours: null,
    socialLinks: null,
    metadata: {},
    ...overrides,
  };
}

describe("prospecting queries", () => {
  it("drops near-duplicate searches", () => {
    expect(dedupeQueries([
      "wholesale distributor",
      "wholesale distributor usa",
      "warehouse",
    ], 6)).toEqual(["wholesale distributor", "warehouse"]);
  });

  it("builds a fallback plan without calling a model", () => {
    const plan = fallbackStrategy("I automate inventory for businesses", "Houston");
    expect(plan.needsMaps).toBe(true);
    expect(plan.mapsQueries.length).toBeGreaterThan(0);
    expect(searchStrategySchema.safeParse(plan).success).toBe(true);
  });

  it("keeps web search when no location is given and uses an explicit location override", () => {
    const plan = fallbackStrategy("I automate inventory for businesses", "");
    expect(plan.needsMaps).toBe(false);
    expect(plan.webIntentQueries.length).toBeGreaterThan(0);
    expect(strategyLocation(plan, "")).toBe("");
    expect(strategyLocation(plan, "London")).toBe("London");
  });
});

describe("prospect matching and scoring", () => {
  it("matches the same domain and keeps a different company separate", () => {
    const maps = [
      business({}),
      business({ providerBusinessId: "place-2", name: "Other Supply", website: "https://other.example", city: "Dallas" }),
    ];
    const same = matchWebResult({
      title: "ABC Distribution hiring inventory manager",
      url: "https://abc-distribution.com/careers",
      description: "Houston warehouse role",
      domain: "abc-distribution.com",
      query: "inventory manager hiring",
      sourceType: "web",
      publishedAt: null,
    }, maps);
    const different = matchWebResult({
      title: "Northwind Logistics",
      url: "https://northwind.example",
      description: "A different company",
      domain: "northwind.example",
      query: "warehouse",
      sourceType: "web",
      publishedAt: null,
    }, maps);
    expect(same.index).toBe(0);
    expect(same.reasons).toContain("same_domain");
    expect(different.index).toBeNull();
  });

  it("ranks a hiring signal above a maps-only lead and never exceeds 100", () => {
    const prospects = buildProspects(
      [business({}), business({ providerBusinessId: "place-2", name: "Quiet Warehouse", category: "warehouse", website: "https://quiet.example", city: "Dallas", phone: null })],
      [{
        title: "ABC Distribution hiring Inventory Control Manager",
        url: "https://abc-distribution.com/jobs/inventory",
        description: "Houston role covering inventory discrepancies",
        domain: "abc-distribution.com",
        query: "inventory manager hiring",
        sourceType: "web",
        publishedAt: null,
      }],
      strategy,
      "Houston"
    );
    expect(prospects[0].business.name).toBe("ABC Distribution");
    expect(prospects[0].qualification.buyingSignal).toBe(true);
    expect(prospects[0].qualification.total).toBeLessThanOrEqual(100);
    expect(prospects[0].qualification.total).toBe(
      prospects[0].qualification.icpFit + prospects[0].qualification.painSignal + prospects[0].qualification.contactability
    );
    const quiet = prospects.find((prospect) => prospect.business.name === "Quiet Warehouse");
    expect(quiet?.qualification.buyingSignal).toBe(false);
    expect(quiet?.qualification.reason).toContain("no direct buying signal");
  });

  it("keeps a Brave-only company when Maps did not return it", () => {
    const prospects = buildProspects([], [{
      title: "Harbor Foods",
      url: "https://harborfoods.example/news",
      description: "Opening a new warehouse",
      domain: "harborfoods.example",
      query: "opening new warehouse",
      sourceType: "web",
      publishedAt: null,
    }], strategy, "Houston");
    expect(prospects).toHaveLength(1);
    expect(prospects[0].business.provider).toBe("brave");
    expect(prospects[0].qualification.sources[0]?.url).toBe("https://harborfoods.example/news");
  });

  it("returns a possible lead when the only page is not a clean company listing", () => {
    const prospects = buildProspects([], [{
      title: "Companies hiring inventory managers in New York this month",
      url: "https://www.linkedin.com/jobs/view/123",
      description: "Warehouse and truck loading roles",
      domain: "linkedin.com",
      query: "inventory manager hiring",
      sourceType: "web",
      publishedAt: null,
    }], strategy, "New York");
    expect(prospects).toHaveLength(1);
    expect(prospects[0].qualification.buyingSignal).toBe(false);
    expect(prospects[0].qualification.reason).toContain("possible lead");
    expect(prospects[0].qualification.sources[0]?.url).toBe("https://www.linkedin.com/jobs/view/123");
  });

  it("keeps a company site when the page title is a long headline", () => {
    const business = webOnlyBusiness({
      title: "How fleet operators are changing trailer loading workflows this year",
      url: "https://harborfreightlines.example/news/loading",
      description: "New York fleet update",
      domain: "harborfreightlines.example",
      query: "truck loading",
      sourceType: "web",
      publishedAt: null,
    }, "United States");
    expect(business?.name).toBe("Harborfreightlines");
    expect(business?.website).toBe("https://harborfreightlines.example");
  });

  it("drops stored web rows that do not include a real source URL", () => {
    expect(usableWebResults([
      { title: "Harbor Foods", url: "https://harborfoods.example/news", description: "Opening", domain: "harborfoods.example", query: "opening", sourceType: "web", publishedAt: null },
      { title: "Missing", description: "No URL" },
    ])).toHaveLength(1);
  });
});
