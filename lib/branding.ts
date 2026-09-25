export const branding = {
  name: "ApplyVelocity",
  tagline: "Find your next customers with one prompt.",
  description:
    "Describe the businesses you want to target. We find, research and qualify the best prospects for you.",
  domain: "www.applyvelocity.com",
  email: "hello@applyvelocity.com",
} as const;

export const pricing = {
  basic: {
    name: "Basic",
    period: "month",
    searches: 10,
    leads: 50,
    monthlyLeads: 500,
    value:
      "Start focused prospecting with enough capacity for your first outreach campaigns.",
    features: [
      "Prioritize promising prospects with opportunity scores",
      "Export your results to CSV for outreach",
      "Reuse saved results without spending another search",
      "Get email support when you need help",
    ],
  },
  pro: {
    name: "Pro",
    period: "month",
    searches: 30,
    leads: 50,
    monthlyLeads: 1500,
    value:
      "Build a repeatable prospecting pipeline with capacity for consistent monthly outreach.",
    features: [
      "Keep every lead list focused with opportunity scores",
      "Move prospects into your outreach workflow with CSV export",
      "Reuse saved results without spending another search",
      "Get priority support when you need help",
    ],
  },
  plus: {
    name: "Plus",
    period: "month",
    searches: 60,
    leads: 50,
    monthlyLeads: 3000,
    value:
      "Scale prospecting across more markets with maximum capacity and precise targeting.",
    features: [
      "Target higher-fit prospects with advanced filters",
      "Prioritize larger lead lists with opportunity scores",
      "Move qualified prospects into your workflow with CSV export",
      "Revisit every saved campaign without rerunning it",
      "Get priority support as you scale",
    ],
  },
} as const;

export type PricingPlanKey = keyof typeof pricing;
export type PaidPlanKey = PricingPlanKey;

export function pricingPlanBenefits(key: PricingPlanKey) {
  const plan = pricing[key];
  return [
    `${plan.searches} searches every 30 days`,
    `Up to ${plan.leads} leads per search`,
    `Up to ${plan.monthlyLeads.toLocaleString()} leads every 30 days`,
    ...plan.features,
  ];
}

export function planDisplayName(plan: string | null | undefined) {
  if (plan === "basic") return "Basic";
  if (plan === "pro") return "Pro";
  if (plan === "plus") return "Plus";
  if (plan === "starter") return "Pro";
  if (plan === "free" || plan === "none" || !plan) return "No active plan";
  return plan;
}
