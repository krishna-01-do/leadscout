import type { NormalizedBusiness } from "@/types";

export function deduplicateBusinesses(
  businesses: NormalizedBusiness[]
): NormalizedBusiness[] {
  const seen = new Map<string, NormalizedBusiness>();

  for (const business of businesses) {
    const primary = `${business.provider}:${business.providerBusinessId}`;
    if (seen.has(primary)) continue;
    seen.set(primary, business);
  }

  return Array.from(seen.values());
}
