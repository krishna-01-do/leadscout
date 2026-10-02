import { z } from "zod";

const queryText = z.string().trim().min(2).max(180);

export const searchStrategySchema = z.object({
  productSummary: z.string().trim().min(2).max(200),
  targetMarket: z.object({
    countries: z.array(z.string().trim().min(2).max(80)).max(5).default([]),
    regions: z.array(z.string().trim().min(2).max(80)).max(5).default([]),
    cities: z.array(z.string().trim().min(2).max(80)).max(8).default([]),
  }),
  idealCustomerProfiles: z.array(z.object({
    industry: z.string().trim().min(2).max(80),
    businessTypes: z.array(z.string().trim().min(2).max(80)).min(1).max(6),
    reason: z.string().trim().min(2).max(240),
  })).min(1).max(6),
  mapsQueries: z.array(queryText).min(1).max(8),
  webIntentQueries: z.array(queryText).max(8).default([]),
  painSignals: z.array(queryText).max(8).default([]),
  positiveSignals: z.array(queryText).max(8).default([]),
  negativeSignals: z.array(queryText).max(8).default([]),
  decisionMakerRoles: z.array(z.string().trim().min(2).max(80)).max(8).default([]),
  searchExplanation: z.string().trim().max(400).default(""),
});

export type SearchStrategy = z.infer<typeof searchStrategySchema>;

export const braveWebResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  description: z.string().default(""),
  domain: z.string().default(""),
  query: z.string(),
  sourceType: z.literal("web"),
  publishedAt: z.string().nullable().default(null),
});

export type BraveWebResult = z.infer<typeof braveWebResultSchema>;

export const evidenceSchema = z.object({
  type: z.enum(["hiring", "expansion", "pain", "mention"]),
  title: z.string(),
  description: z.string(),
  sourceUrl: z.string().url(),
  strength: z.number().min(0).max(40),
  provider: z.literal("brave"),
});

export type ProspectEvidence = z.infer<typeof evidenceSchema>;

export const qualificationSchema = z.object({
  icpFit: z.number().int().min(0).max(40),
  painSignal: z.number().int().min(0).max(40),
  contactability: z.number().int().min(0).max(20),
  total: z.number().int().min(0).max(100),
  reason: z.string(),
  buyingSignal: z.boolean(),
  reasons: z.array(z.string()),
  suggestedPitch: z.string(),
  decisionMakerRoles: z.array(z.string()),
  evidence: z.array(evidenceSchema),
  sources: z.array(z.object({
    provider: z.enum(["google_maps", "brave"]),
    url: z.string().url(),
  })),
});

export type ProspectQualification = z.infer<typeof qualificationSchema>;
