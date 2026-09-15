import { z } from "zod";

export const websiteConditionSchema = z.enum([
  "ANY",
  "MISSING",
  "PRESENT",
  "MISSING_OR_POOR",
]);

export const businessSearchQuerySchema = z.object({
  businessCategory: z.string().min(1, "Business category is required"),
  location: z.string().min(1, "Location is required"),
  city: z.string().nullable().default(null),
  state: z.string().nullable().default(null),
  country: z.string().nullable().default(null),
  minRating: z.number().min(0).max(5).nullable().default(null),
  maxRating: z.number().min(0).max(5).nullable().default(null),
  minReviews: z.number().int().min(0).nullable().default(null),
  maxReviews: z.number().int().min(0).nullable().default(null),
  websiteCondition: websiteConditionSchema.default("ANY"),
  phoneRequired: z.boolean().default(false),
  emailRequired: z.boolean().default(false),
  keywords: z.array(z.string()).default([]),
  resultLimit: z.number().int().min(1).max(100).default(25),
});

export type BusinessSearchQuerySchema = z.infer<typeof businessSearchQuerySchema>;

export const createSearchRequestSchema = z.object({
  prompt: z.string().min(3, "Please describe the businesses you want to find").max(500),
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
