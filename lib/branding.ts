export const branding = {
  name: "LeadScout",
  tagline: "Find your next customers with one prompt.",
  description:
    "Describe the businesses you want to target. We find, research and qualify the best prospects for you.",
  domain: "leadscout.app",
  email: "hello@leadscout.app",
} as const;

export const pricing = {
  free: {
    name: "Free",
    price: 0,
    period: "forever",
    searches: 1,
    leads: 20,
    features: [
      "1 free prospect search",
      "Up to 20 leads per search",
      "Opportunity scoring",
      "CSV export",
      "Search history",
    ],
  },
  starter: {
    name: "Starter",
    price: 29,
    period: "month",
    searches: 50,
    leads: 500,
    features: [
      "50 searches per month",
      "Up to 500 leads per search",
      "Opportunity scoring",
      "CSV export",
      "Search history",
      "Priority support",
    ],
  },
  pro: {
    name: "Pro",
    price: 79,
    period: "month",
    searches: 200,
    leads: 2000,
    features: [
      "200 searches per month",
      "Up to 2,000 leads per search",
      "Opportunity scoring",
      "CSV export",
      "Search history",
      "Priority support",
      "Advanced filters",
    ],
  },
} as const;

export const freeTrialConfig = {
  freeSearchLimit: 1,
  freeResultLimit: 20,
} as const;
