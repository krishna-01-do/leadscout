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
    period: "month",
    searches: 30,
    leads: 50,
    monthlyLeads: 1500,
    features: [
      "30 searches per month",
      "Up to 50 leads per search",
      "Up to 1,500 leads per month",
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
      "60 searches per month",
      "Up to 50 leads per search",
      "Up to 3,000 leads per month",
      "Opportunity scoring",
      "CSV export",
      "Search history",
      "Priority support",
      "Advanced filters",
    ],
  },
} as const;

