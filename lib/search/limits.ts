export const prospectingLimits = {
  maxMapQueries: 2,
  maxBraveQueries: 6,
  maxBraveResultsPerQuery: 8,
  maxAiLeadsForDeepAnalysis: 12,
  braveTimeoutMs: 12_000,
  braveRetries: 2,
} as const;

export const scoreWeights = {
  icp: 40,
  pain: 40,
  contact: 20,
} as const;

export function braveProspectingEnabled() {
  if (process.env.ENABLE_BRAVE_PROSPECTING === "false") return false;
  return process.env.ENABLE_BRAVE_PROSPECTING === "true" || Boolean(process.env.BRAVE_SEARCH_API_KEY);
}
