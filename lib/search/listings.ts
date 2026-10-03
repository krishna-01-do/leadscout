import type { BusinessSearchQuery, NormalizedBusiness } from "@/types";

export function listingMatches(business: NormalizedBusiness, query: BusinessSearchQuery) {
  const hasWebsite = Boolean(business.website?.trim());
  if (query.websiteCondition === "MISSING" || query.websiteCondition === "MISSING_OR_POOR") {
    if (hasWebsite) return false;
  } else if (query.websiteCondition === "PRESENT" && !hasWebsite) {
    return false;
  }
  if (query.phoneRequired && !business.phone) return false;
  if (query.emailRequired && !business.email) return false;
  if (query.minRating !== null && (business.rating === null || business.rating < query.minRating)) return false;
  if (query.maxRating !== null && (business.rating === null || business.rating > query.maxRating)) return false;
  if (query.minReviews !== null && (business.reviewCount === null || business.reviewCount < query.minReviews)) return false;
  if (query.maxReviews !== null && (business.reviewCount === null || business.reviewCount > query.maxReviews)) return false;
  return true;
}

export function selectListings(businesses: NormalizedBusiness[], query: BusinessSearchQuery) {
  return businesses.filter((business) => listingMatches(business, query)).slice(0, query.resultLimit);
}
