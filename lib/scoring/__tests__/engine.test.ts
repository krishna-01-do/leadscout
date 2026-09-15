import { describe, it, expect } from "vitest";
import {
  calculateMatchScore,
  generateOpportunityFlags,
  generateQualificationReason,
  qualifyBusiness,
  getScoreLabel,
  scoringWeights,
} from "../engine";
import type { BusinessSearchQuery, NormalizedBusiness } from "@/types";

function makeQuery(overrides: Partial<BusinessSearchQuery> = {}): BusinessSearchQuery {
  return {
    businessCategory: "dental clinic",
    location: "Hyderabad",
    city: null,
    state: null,
    country: null,
    minRating: null,
    maxRating: null,
    minReviews: null,
    maxReviews: null,
    websiteCondition: "ANY",
    phoneRequired: false,
    emailRequired: false,
    keywords: [],
    resultLimit: 25,
    ...overrides,
  };
}

function makeBusiness(overrides: Partial<NormalizedBusiness> = {}): NormalizedBusiness {
  return {
    id: "test-1",
    provider: "mock",
    providerBusinessId: "test-1",
    name: "Test Dental Clinic",
    category: "Dental clinic",
    address: "Banjara Hills, Hyderabad",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    latitude: 17.4,
    longitude: 78.4,
    phone: "+91 98765 43210",
    email: "test@example.com",
    website: null,
    rating: 4.5,
    reviewCount: 120,
    googleMapsUrl: null,
    openingHours: null,
    socialLinks: null,
    metadata: {},
    ...overrides,
  };
}

describe("calculateMatchScore", () => {
  it("should return a score between 0 and 100", () => {
    const query = makeQuery();
    const business = makeBusiness();
    const score = calculateMatchScore(business, query);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("should award points for category match", () => {
    const query = makeQuery({ businessCategory: "dental clinic" });
    const matched = makeBusiness({ category: "Dental clinic" });
    const unmatched = makeBusiness({ category: "Gym" });

    const matchScore = calculateMatchScore(matched, query);
    const unmatchScore = calculateMatchScore(unmatched, query);
    expect(matchScore).toBeGreaterThan(unmatchScore);
    expect(matchScore - unmatchScore).toBe(scoringWeights.categoryMatch);
  });

  it("should award points for location match", () => {
    const query = makeQuery({ location: "Hyderabad", websiteCondition: "MISSING", minRating: 4.0, minReviews: 50 });
    const matched = makeBusiness({ city: "Hyderabad", website: null, rating: 4.5, reviewCount: 120 });
    const unmatched = makeBusiness({ city: "Mumbai", address: "Andheri, Mumbai", website: null, rating: 4.5, reviewCount: 120 });

    const matchedScore = calculateMatchScore(matched, query);
    const unmatchedScore = calculateMatchScore(unmatched, query);
    expect(matchedScore).toBeGreaterThan(unmatchedScore);
  });

  it("should award points for missing website when condition is MISSING", () => {
    const query = makeQuery({ websiteCondition: "MISSING" });
    const noWebsite = makeBusiness({ website: null });
    const withWebsite = makeBusiness({ website: "https://example.com" });

    expect(calculateMatchScore(noWebsite, query)).toBeGreaterThan(calculateMatchScore(withWebsite, query));
  });

  it("should award points for present website when condition is PRESENT", () => {
    const query = makeQuery({ websiteCondition: "PRESENT" });
    const noWebsite = makeBusiness({ website: null });
    const withWebsite = makeBusiness({ website: "https://example.com" });

    expect(calculateMatchScore(withWebsite, query)).toBeGreaterThan(calculateMatchScore(noWebsite, query));
  });

  it("should award points for rating threshold match", () => {
    const query = makeQuery({ minRating: 4.0 });
    const highRated = makeBusiness({ rating: 4.5 });
    const lowRated = makeBusiness({ rating: 3.5 });

    expect(calculateMatchScore(highRated, query)).toBeGreaterThan(calculateMatchScore(lowRated, query));
  });

  it("should award points for review threshold match", () => {
    const query = makeQuery({ minReviews: 50 });
    const highReviews = makeBusiness({ reviewCount: 120 });
    const lowReviews = makeBusiness({ reviewCount: 30 });

    expect(calculateMatchScore(highReviews, query)).toBeGreaterThan(calculateMatchScore(lowReviews, query));
  });

  it("should enforce maximum rating and review thresholds", () => {
    const query = makeQuery({ maxRating: 4, maxReviews: 50 });
    const withinRange = makeBusiness({ rating: 3.9, reviewCount: 40 });
    const outsideRange = makeBusiness({ rating: 4.8, reviewCount: 120 });
    expect(calculateMatchScore(withinRange, query)).toBeGreaterThan(calculateMatchScore(outsideRange, query));
  });

  it("should not treat an empty provider category as a match", () => {
    const query = makeQuery({ businessCategory: "dentist" });
    expect(calculateMatchScore(makeBusiness({ category: "" }), query))
      .toBeLessThan(calculateMatchScore(makeBusiness({ category: "Dentist" }), query));
  });

  it("should cap score at 100", () => {
    const query = makeQuery({
      websiteCondition: "MISSING",
      minRating: 4.0,
      minReviews: 50,
      phoneRequired: true,
      emailRequired: true,
    });
    const business = makeBusiness({
      website: null,
      rating: 4.5,
      reviewCount: 120,
      phone: "+91 123",
      email: "test@test.com",
    });
    const score = calculateMatchScore(business, query);
    expect(score).toBe(100);
  });
});

describe("generateOpportunityFlags", () => {
  it("should generate NO_WEBSITE flag when website is missing", () => {
    const flags = generateOpportunityFlags(makeBusiness({ website: null }), makeQuery());
    expect(flags).toContain("NO_WEBSITE");
  });

  it("should generate WEBSITE_PRESENT flag when website exists", () => {
    const flags = generateOpportunityFlags(makeBusiness({ website: "https://example.com" }), makeQuery());
    expect(flags).toContain("WEBSITE_PRESENT");
  });

  it("should generate PHONE_AVAILABLE flag when phone exists", () => {
    const flags = generateOpportunityFlags(makeBusiness({ phone: "+91 123" }), makeQuery());
    expect(flags).toContain("PHONE_AVAILABLE");
  });

  it("should generate EMAIL_AVAILABLE flag when email exists", () => {
    const flags = generateOpportunityFlags(makeBusiness({ email: "test@test.com" }), makeQuery());
    expect(flags).toContain("EMAIL_AVAILABLE");
  });

  it("should generate HIGH_RATING flag for rating >= 4.5", () => {
    const flags = generateOpportunityFlags(makeBusiness({ rating: 4.5 }), makeQuery());
    expect(flags).toContain("HIGH_RATING");
  });

  it("should generate HIGH_REVIEW_COUNT flag for reviewCount >= 100", () => {
    const flags = generateOpportunityFlags(makeBusiness({ reviewCount: 100 }), makeQuery());
    expect(flags).toContain("HIGH_REVIEW_COUNT");
  });

  it("should generate LOW_REVIEW_COUNT flag for reviewCount < 10", () => {
    const flags = generateOpportunityFlags(makeBusiness({ reviewCount: 5 }), makeQuery());
    expect(flags).toContain("LOW_REVIEW_COUNT");
  });

  it("should not invent flags not supported by data", () => {
    const flags = generateOpportunityFlags(
      makeBusiness({ rating: null, reviewCount: null, phone: null, email: null, website: null }),
      makeQuery()
    );
    expect(flags).toContain("NO_WEBSITE");
    expect(flags).not.toContain("HIGH_RATING");
    expect(flags).not.toContain("PHONE_AVAILABLE");
    expect(flags).not.toContain("EMAIL_AVAILABLE");
  });
});

describe("generateQualificationReason", () => {
  it("should generate a human-readable reason", () => {
    const reason = generateQualificationReason(makeBusiness(), makeQuery(), 90);
    expect(reason).toContain("Dental clinic");
    expect(reason).toContain("Hyderabad");
    expect(reason).toContain("120 reviews");
  });

  it("should use Excellent prefix for scores >= 90", () => {
    const reason = generateQualificationReason(makeBusiness(), makeQuery(), 90);
    expect(reason).toContain("Excellent");
  });

  it("should use Strong prefix for scores 75-89", () => {
    const reason = generateQualificationReason(makeBusiness(), makeQuery(), 80);
    expect(reason).toContain("Strong");
  });

  it("should use Moderate prefix for scores 60-74", () => {
    const reason = generateQualificationReason(makeBusiness(), makeQuery(), 65);
    expect(reason).toContain("Moderate");
  });

  it("should use Weak prefix for scores < 60", () => {
    const reason = generateQualificationReason(makeBusiness(), makeQuery(), 50);
    expect(reason).toContain("Weak");
  });
});

describe("qualifyBusiness", () => {
  it("should return a qualified result with all fields", () => {
    const result = qualifyBusiness(makeBusiness(), makeQuery(), 1);
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
    expect(result.qualified).toBeDefined();
    expect(result.qualificationReason).toBeTruthy();
    expect(result.opportunityFlags).toBeInstanceOf(Array);
    expect(result.rank).toBe(1);
  });

  it("should mark as qualified when score >= 60", () => {
    const query = makeQuery({
      websiteCondition: "MISSING",
      minRating: 4.0,
      minReviews: 50,
    });
    const business = makeBusiness({ website: null, rating: 4.5, reviewCount: 120 });
    const result = qualifyBusiness(business, query, 1);
    expect(result.qualified).toBe(true);
  });
});

describe("getScoreLabel", () => {
  it("should return Excellent for scores >= 90", () => {
    expect(getScoreLabel(90).label).toBe("Excellent");
    expect(getScoreLabel(100).label).toBe("Excellent");
  });

  it("should return Strong for scores 75-89", () => {
    expect(getScoreLabel(75).label).toBe("Strong");
    expect(getScoreLabel(89).label).toBe("Strong");
  });

  it("should return Moderate for scores 60-74", () => {
    expect(getScoreLabel(60).label).toBe("Moderate");
    expect(getScoreLabel(74).label).toBe("Moderate");
  });

  it("should return Weak for scores < 60", () => {
    expect(getScoreLabel(59).label).toBe("Weak");
    expect(getScoreLabel(0).label).toBe("Weak");
  });
});
