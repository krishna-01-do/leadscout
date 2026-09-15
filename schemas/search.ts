import { z } from "zod";

export const websiteConditionSchema = z.enum([
  "ANY",
  "MISSING",
  "PRESENT",
  "MISSING_OR_POOR",
]);

export const businessSearchQuerySchema = z.object({
  businessCategory: z.string().trim().min(2, "Business category is required").max(100),
  location: z.string().trim().min(2, "Location is required").max(160),
  city: z.string().trim().max(100).nullable().default(null),
  state: z.string().trim().max(100).nullable().default(null),
  country: z.string().trim().max(100).nullable().default(null),
  minRating: z.number().min(0).max(5).nullable().default(null),
  maxRating: z.number().min(0).max(5).nullable().default(null),
  minReviews: z.number().int().min(0).max(1_000_000).nullable().default(null),
  maxReviews: z.number().int().min(0).max(1_000_000).nullable().default(null),
  websiteCondition: websiteConditionSchema.default("ANY"),
  phoneRequired: z.boolean().default(false),
  emailRequired: z.boolean().default(false),
  keywords: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  resultLimit: z.number().int().min(1).max(100).default(25),
}).superRefine((query, context) => {
  if (query.minRating !== null && query.maxRating !== null && query.minRating > query.maxRating) {
    context.addIssue({ code: "custom", message: "Minimum rating cannot exceed maximum rating" });
  }
  if (query.minReviews !== null && query.maxReviews !== null && query.minReviews > query.maxReviews) {
    context.addIssue({ code: "custom", message: "Minimum reviews cannot exceed maximum reviews" });
  }
});

export type BusinessSearchQuerySchema = z.infer<typeof businessSearchQuerySchema>;

export const createSearchRequestSchema = z.object({
  prompt: z.string().trim().min(8, "Please describe the businesses you want to find").max(500),
  idempotencyKey: z.string().uuid(),
  filters: z.object({
    businessCategory: z.string().trim().max(100),
    location: z.string().trim().max(160),
    minRating: z.string().max(16),
    maxRating: z.string().max(16),
    minReviews: z.string().max(16),
    maxReviews: z.string().max(16),
    websiteCondition: websiteConditionSchema,
    phoneRequired: z.boolean(),
    emailRequired: z.boolean(),
    resultLimit: z.string().max(4),
  }).nullable().optional(),
});

export type CreateSearchRequest = z.infer<typeof createSearchRequestSchema>;

export const opportunityFlagSchema = z.enum([
  "NO_WEBSITE",
  "WEBSITE_PRESENT",
  "PHONE_AVAILABLE",
  "EMAIL_AVAILABLE",
  "HIGH_RATING",
  "HIGH_REVIEW_COUNT",
  "LOW_REVIEW_COUNT",
  "NO_ONLINE_BOOKING",
  "NO_ONLINE_ORDERING",
]);

export const searchStatusSchema = z.enum([
  "QUEUED",
  "SEARCHING",
  "PROCESSING",
  "SCORING",
  "COMPLETED",
  "FAILED",
]);
