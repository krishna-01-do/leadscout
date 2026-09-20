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
    features: [
      "Opportunity scoring",
      "CSV export",
      "Search history",
    ],
  },
  starter: {
    name: "Starter",
    period: "month",
    searches: 30,
    leads: 50,
    monthlyLeads: 1500,
    features: [
      "Opportunity scoring",
      "CSV export",
      "Search history",
      "Priority support",
    ],
  },
  pro: {
    name: "Pro",
    period: "month",
    searches: 60,
    leads: 50,
    monthlyLeads: 3000,
    features: [
      "Opportunity scoring",
      "CSV export",
      "Search history",
      "Priority support",
      "Advanced filters",
    ],
  },
} as const;

