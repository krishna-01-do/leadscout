export const branding = {
  name: "ApplyVelocity",
  tagline: "Find your next customers with one prompt.",
  description:
    "Describe the businesses you want to target. We find, research and qualify the best prospects for you.",
  domain: "www.applyvelocity.com",
  email: "hello@applyvelocity.com",
} as const;

export const pricing = {
  free: {
    name: "Free",
    price: 0,
    period: "forever",
    searches: 1,
    leads: 10,
    value:
      "Validate your prospecting idea and turn one focused search into an outreach-ready lead list.",
    features: [
      "Prioritize promising prospects with opportunity scores",
      "Export your results to CSV for outreach",
      "Revisit saved results without using another search",
    ],
  },
  starter: {
    name: "Starter",
    period: "month",
    searches: 30,
    leads: 50,
    monthlyLeads: 1500,
    value:
      "Build a repeatable prospecting pipeline with enough capacity for consistent monthly outreach.",
    features: [
      "Keep every lead list focused with opportunity scores",
      "Move prospects into your outreach workflow with CSV export",
      "Reuse saved results without spending another search",
      "Get priority support when you need help",
    ],
  },
  pro: {
    name: "Pro",
    period: "month",
    searches: 60,
    leads: 50,
    monthlyLeads: 3000,
    value:
      "Scale prospecting across more markets with maximum capacity and precise, advanced targeting.",
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

export function pricingPlanBenefits(key: PricingPlanKey) {
  if (key === "free") {
    const plan = pricing.free;
    return [
      `${plan.searches} focused search to try the full workflow`,
      `Up to ${plan.leads} prospects in your search`,
      ...plan.features,
    ];
  }

  const plan = pricing[key];
  return [
    `${plan.searches} searches every 30 days`,
    `Up to ${plan.leads} leads per search`,
    `Up to ${plan.monthlyLeads.toLocaleString()} leads every 30 days`,
    ...plan.features,
  ];
}

