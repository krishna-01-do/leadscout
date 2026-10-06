export const branding = {
  name: "ApplyVelocity",
  tagline: "Find the clients most ready to buy.",
  description:
    "Describe what you sell. ApplyVelocity scans Google Maps, Google, LinkedIn, Reddit, blogs, news, and company sites, then ranks the clients most likely to convert.",
  domain: "www.applyvelocity.com",
  email: "hello@applyvelocity.com",
} as const;

export const pricing = {
  free: {
    name: "Free",
    period: "forever",
    searches: 1,
    leads: 20,
    monthlyLeads: 20,
    value:
      "Run one complete client search and see how ApplyVelocity turns a prompt into an outreach-ready list.",
    features: [
      "Search Google Maps and public web sources",
      "Rank prospects with opportunity scores",
      "Export your results to CSV",
      "Revisit your saved results without another search",
    ],
  },
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
export type PaidPlanKey = Exclude<PricingPlanKey, "free">;

// Plans displayed publicly.
export const publicPlanKeys = ["free", "pro"] as const satisfies readonly PricingPlanKey[];

// Paid checkout offer. Uncomment a key to sell that paid plan again.
export const offeredPlanKeys = [
  // "basic",
  "pro",
  // "plus",
] as const satisfies readonly PaidPlanKey[];

export function pricingPlanBenefits(key: PricingPlanKey) {
  const plan = pricing[key];
  if (key === "free") {
    return [
      `${plan.searches} full search`,
      `Up to ${plan.leads} leads`,
      ...plan.features,
    ];
  }
  return [
    `${plan.searches} searches per month`,
    `Up to ${plan.leads} leads per search`,
    `Up to ${plan.monthlyLeads.toLocaleString()} leads per month`,
    ...plan.features,
  ];
}

export function planDisplayName(plan: string | null | undefined) {
  if (plan === "free") return "Free";
  if (plan === "basic") return "Basic";
  if (plan === "pro") return "Pro";
  if (plan === "plus") return "Plus";
  if (plan === "starter") return "Pro";
  if (plan === "none" || !plan) return "No active plan";
  return plan;
}
