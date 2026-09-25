import { describe, expect, it } from "vitest";
import { pricing, pricingPlanBenefits } from "@/lib/branding";

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

  it("defines the paid-only plan ladder", () => {
    expect(Object.keys(pricing)).toEqual(["basic", "pro", "plus"]);
    expect(pricing.basic.searches).toBe(10);
    expect(pricing.pro.searches).toBe(30);
    expect(pricing.plus.searches).toBe(60);
  });
});
