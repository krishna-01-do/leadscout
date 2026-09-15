export type WebsiteCondition = "ANY" | "MISSING" | "PRESENT" | "MISSING_OR_POOR";

export type SearchStatus =
  | "QUEUED"
  | "SEARCHING"
  | "PROCESSING"
  | "SCORING"
  | "COMPLETED"
  | "FAILED";

export type OpportunityFlag =
  | "NO_WEBSITE"
  | "WEBSITE_PRESENT"
  | "PHONE_AVAILABLE"
  | "EMAIL_AVAILABLE"
  | "HIGH_RATING"
  | "HIGH_REVIEW_COUNT"
  | "LOW_REVIEW_COUNT"
  | "NO_ONLINE_BOOKING"
  | "NO_ONLINE_ORDERING";

export type ProviderName = "apify" | "mock" | "brightdata";

export interface BusinessSearchQuery {
  businessCategory: string;
  location: string;
  city: string | null;
  state: string | null;
  country: string | null;
  minRating: number | null;
  maxRating: number | null;
  minReviews: number | null;
  maxReviews: number | null;
  websiteCondition: WebsiteCondition;
  phoneRequired: boolean;
  emailRequired: boolean;
  keywords: string[];
  resultLimit: number;
}

export interface NormalizedBusiness {
  id: string;
  provider: ProviderName;
  providerBusinessId: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  googleMapsUrl: string | null;
  openingHours: Record<string, string> | null;
  socialLinks: string[] | null;
  metadata: Record<string, unknown> | null;
}

export interface QualifiedResult extends NormalizedBusiness {
  matchScore: number;
  qualified: boolean;
  qualificationReason: string;
  opportunityFlags: OpportunityFlag[];
  rank: number;
}

export interface SearchResultRow {
  id: string;
  searchId: string;
  businessId: string;
  matchScore: number;
  qualified: boolean;
  qualificationReason: string;
  opportunityFlags: OpportunityFlag[];
  rank: number;
  business: NormalizedBusiness;
}

export interface SearchRecord {
  id: string;
  userId: string;
  prompt: string;
  parsedQuery: BusinessSearchQuery | null;
  provider: ProviderName;
  status: SearchStatus;
  requestedResultLimit: number;
  resultCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface UsageRecord {
  id: string;
  userId: string;
  searchId: string | null;
  type: string;
  amount: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  plan: string;
  status: string;
  monthlySearchLimit: number;
  monthlyLeadLimit: number;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
}
