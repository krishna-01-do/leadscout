import type { NormalizedBusiness } from "@/types";

export function deduplicateBusinesses(
  businesses: NormalizedBusiness[]
): NormalizedBusiness[] {
  const seen = new Map<string, NormalizedBusiness>();

  for (const business of businesses) {
    const fallback = [business.name, business.phone, business.address]
      .filter(Boolean).join("|").trim().toLowerCase();
    const primary = business.providerBusinessId.trim()
      ? `${business.provider}:${business.providerBusinessId}`
      : fallback;
    if (!primary) continue;
    if (seen.has(primary)) continue;
    seen.set(primary, business);
  }

  return Array.from(seen.values());
}
