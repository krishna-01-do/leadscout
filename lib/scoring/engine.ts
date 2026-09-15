import type {
  BusinessSearchQuery,
  NormalizedBusiness,
  OpportunityFlag,
  QualifiedResult,
} from "@/types";

export const scoringWeights = {
  categoryMatch: 25,
  locationMatch: 20,
  websiteConditionMatch: 25,
  ratingMatch: 10,
  reviewMatch: 10,
  phoneAvailable: 5,
  emailAvailable: 5,
} as const;

const HIGH_RATING_THRESHOLD = 4.5;
const HIGH_REVIEW_THRESHOLD = 100;
const LOW_REVIEW_THRESHOLD = 10;

export function calculateMatchScore(
  business: NormalizedBusiness,
  query: BusinessSearchQuery
): number {
  let score = 0;

  if (
    business.category?.toLowerCase().includes(query.businessCategory.toLowerCase()) ||
    query.businessCategory.toLowerCase().includes(business.category?.toLowerCase() ?? "")
  ) {
    score += scoringWeights.categoryMatch;
  }

  if (
    business.city?.toLowerCase().includes(query.location.toLowerCase()) ||
    query.location.toLowerCase().includes(business.city?.toLowerCase() ?? "") ||
    business.address?.toLowerCase().includes(query.location.toLowerCase())
  ) {
    score += scoringWeights.locationMatch;
  }

  if (query.websiteCondition === "ANY") {
    score += scoringWeights.websiteConditionMatch;
  } else if (query.websiteCondition === "MISSING") {
    if (!business.website || business.website.trim() === "") {
      score += scoringWeights.websiteConditionMatch;
    }
  } else if (query.websiteCondition === "PRESENT") {
    if (business.website && business.website.trim() !== "") {
      score += scoringWeights.websiteConditionMatch;
    }
  } else if (query.websiteCondition === "MISSING_OR_POOR") {
    if (!business.website || business.website.trim() === "") {
      score += scoringWeights.websiteConditionMatch;
    } else {
      score += Math.floor(scoringWeights.websiteConditionMatch / 2);
    }
  }

  if (query.minRating !== null && business.rating !== null) {
    if (business.rating >= query.minRating) {
      score += scoringWeights.ratingMatch;
    }
  } else if (query.minRating === null) {
    score += scoringWeights.ratingMatch;
  }

  if (query.minReviews !== null && business.reviewCount !== null) {
    if (business.reviewCount >= query.minReviews) {
      score += scoringWeights.reviewMatch;
    }
  } else if (query.minReviews === null) {
    score += scoringWeights.reviewMatch;
  }

  if (query.phoneRequired && business.phone) {
    score += scoringWeights.phoneAvailable;
  } else if (!query.phoneRequired) {
    score += scoringWeights.phoneAvailable;
  }

  if (query.emailRequired && business.email) {
    score += scoringWeights.emailAvailable;
  } else if (!query.emailRequired) {
    score += scoringWeights.emailAvailable;
  }

  return Math.min(100, Math.max(0, score));
}

export function generateOpportunityFlags(
  business: NormalizedBusiness,
  query: BusinessSearchQuery
): OpportunityFlag[] {
  const flags: OpportunityFlag[] = [];

  if (!business.website || business.website.trim() === "") {
    flags.push("NO_WEBSITE");
  } else {
    flags.push("WEBSITE_PRESENT");
  }

  if (business.phone) flags.push("PHONE_AVAILABLE");
  if (business.email) flags.push("EMAIL_AVAILABLE");

  if (business.rating !== null && business.rating >= HIGH_RATING_THRESHOLD) {
    flags.push("HIGH_RATING");
  }

  if (business.reviewCount !== null && business.reviewCount >= HIGH_REVIEW_THRESHOLD) {
    flags.push("HIGH_REVIEW_COUNT");
  } else if (business.reviewCount !== null && business.reviewCount < LOW_REVIEW_THRESHOLD) {
    flags.push("LOW_REVIEW_COUNT");
  }

  if (business.website && business.website.trim() !== "") {
    if (query.websiteCondition === "MISSING_OR_POOR") {
      flags.push("NO_ONLINE_BOOKING");
      flags.push("NO_ONLINE_ORDERING");
    }
  }

  return flags;
}

export function generateQualificationReason(
  business: NormalizedBusiness,
  query: BusinessSearchQuery,
  score: number
): string {
  const parts: string[] = [];

  parts.push(business.category || business.name);

  const locationPart = business.city || query.location;
  if (locationPart) {
    parts.push(`in ${locationPart}`);
  }

  if (business.reviewCount !== null && business.reviewCount > 0) {
    parts.push(`with ${business.reviewCount} reviews`);
  }

  if (!business.website || business.website.trim() === "") {
    parts.push("and no listed website");
  } else if (business.rating !== null) {
    parts.push(`rated ${business.rating}`);
  }

  const reason = parts.join(" ") + ".";

  if (score >= 90) {
    return `Excellent match: ${reason}`;
  } else if (score >= 75) {
    return `Strong match: ${reason}`;
  } else if (score >= 60) {
    return `Moderate match: ${reason}`;
  } else {
    return `Weak match: ${reason}`;
  }
}

export function qualifyBusiness(
  business: NormalizedBusiness,
  query: BusinessSearchQuery,
  rank: number
): QualifiedResult {
  const matchScore = calculateMatchScore(business, query);
  const opportunityFlags = generateOpportunityFlags(business, query);
  const qualificationReason = generateQualificationReason(business, query, matchScore);
  const qualified = matchScore >= 60;

  return {
    ...business,
    matchScore,
    qualified,
    qualificationReason,
    opportunityFlags,
    rank,
  };
}

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Excellent", color: "text-emerald-600" };
  if (score >= 75) return { label: "Strong", color: "text-blue-600" };
  if (score >= 60) return { label: "Moderate", color: "text-amber-600" };
  return { label: "Weak", color: "text-muted-foreground" };
}
