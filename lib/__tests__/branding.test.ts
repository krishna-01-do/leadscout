import { describe, expect, it } from "vitest";
import { offeredPlanKeys, pricing, pricingPlanBenefits, publicPlanKeys } from "@/lib/branding";

describe("pricingPlanBenefits", () => {
  it.each(["basic", "pro", "plus"] as const)(
    "builds %s allowances from centralized limits",
    (key) => {
      const plan = pricing[key];
      const benefits = pricingPlanBenefits(key);

      expect(benefits).toContain(`${plan.searches} searches per month`);
      expect(benefits).toContain(`Up to ${plan.leads} leads per search`);
      expect(benefits).toContain(
        `Up to ${plan.monthlyLeads.toLocaleString()} leads per month`,
      );
    },
  );

  it("offers Free and Pro while keeping the other paid plans available in code", () => {
    expect(Object.keys(pricing)).toEqual(["free", "basic", "pro", "plus"]);
    expect(pricing.free.searches).toBe(1);
    expect(pricing.free.leads).toBe(20);
    expect(pricing.basic.searches).toBe(10);
    expect(pricing.pro.searches).toBe(30);
    expect(pricing.plus.searches).toBe(60);
    expect(publicPlanKeys).toEqual(["free", "pro"]);
    expect(offeredPlanKeys).toEqual(["pro"]);
  });

  it("describes the free allowance without paid monthly copy", () => {
    expect(pricingPlanBenefits("free")).toContain("1 full search");
    expect(pricingPlanBenefits("free")).toContain("Up to 20 leads");
  });
});
