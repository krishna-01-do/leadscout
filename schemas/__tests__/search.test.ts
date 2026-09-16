import { describe, it, expect } from "vitest";
import { businessSearchQuerySchema, createSearchRequestSchema } from "../search";

describe("businessSearchQuerySchema", () => {
  it("should validate a complete query", () => {
    const input = {
      businessCategory: "dental clinic",
      location: "Hyderabad",
      city: null,
      state: null,
      country: "India",
      minRating: 4.2,
      maxRating: null,
      minReviews: 50,
      maxReviews: null,
      websiteCondition: "MISSING",
      phoneRequired: false,
      emailRequired: false,
      keywords: [],
      resultLimit: 25,
    };
    const result = businessSearchQuerySchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should apply defaults for optional fields", () => {
    const input = {
      businessCategory: "gym",
      location: "Pune",
    };
    const result = businessSearchQuerySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.websiteCondition).toBe("ANY");
      expect(result.data.phoneRequired).toBe(false);
      expect(result.data.resultLimit).toBe(25);
      expect(result.data.keywords).toEqual([]);
    }
  });

  it("should reject empty business category", () => {
    const input = {
      businessCategory: "",
      location: "Hyderabad",
    };
    const result = businessSearchQuerySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject empty location", () => {
    const input = {
      businessCategory: "gym",
      location: "",
    };
    const result = businessSearchQuerySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject invalid website condition", () => {
    const input = {
      businessCategory: "gym",
      location: "Pune",
      websiteCondition: "INVALID",
    };
    const result = businessSearchQuerySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject rating above 5", () => {
    const input = {
      businessCategory: "gym",
      location: "Pune",
      minRating: 6,
    };
    const result = businessSearchQuerySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject result limit above the paid-plan cap", () => {
    const input = {
      businessCategory: "gym",
      location: "Pune",
      resultLimit: 51,
    };
    const result = businessSearchQuerySchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("createSearchRequestSchema", () => {
  it("should validate a valid prompt", () => {
    const result = createSearchRequestSchema.safeParse({
      prompt: "Find dental clinics in Hyderabad without a website",
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("should reject a too-short prompt", () => {
    const result = createSearchRequestSchema.safeParse({
      prompt: "ab",
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a too-long prompt", () => {
    const result = createSearchRequestSchema.safeParse({
      prompt: "x".repeat(501),
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("should require a valid idempotency key", () => {
    const result = createSearchRequestSchema.safeParse({ prompt: "Find gyms in Pune" });
    expect(result.success).toBe(false);
  });
});
