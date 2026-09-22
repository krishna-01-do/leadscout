import { describe, expect, it } from "vitest";
import { pricing, pricingPlanBenefits } from "@/lib/branding";

describe("pricingPlanBenefits", () => {
  it("builds free-plan allowances from centralized limits", () => {
    const benefits = pricingPlanBenefits("free");

    expect(benefits).toContain(
      `${pricing.free.searches} focused search to try the full workflow`,
    );
    expect(benefits).toContain(
      `Up to ${pricing.free.leads} prospects in your search`,
    );
  });

  it.each(["starter", "pro"] as const)(
    "builds %s allowances from centralized limits",
    (key) => {
      const plan = pricing[key];
      const benefits = pricingPlanBenefits(key);

      expect(benefits).toContain(`${plan.searches} searches every 30 days`);
      expect(benefits).toContain(`Up to ${plan.leads} leads per search`);
      expect(benefits).toContain(
        `Up to ${plan.monthlyLeads.toLocaleString()} leads every 30 days`,
      );
    },
  );
});
