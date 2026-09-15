import type { BusinessSearchQuery, NormalizedBusiness, ProviderName } from "@/types";

export interface BusinessSearchProvider {
  readonly name: ProviderName;
  searchBusinesses(query: BusinessSearchQuery): Promise<NormalizedBusiness[]>;
}

export interface ProviderRunResult {
  businesses: NormalizedBusiness[];
  externalRunId: string | null;
  metadata: Record<string, unknown>;
}
