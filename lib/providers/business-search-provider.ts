import type { BusinessSearchQuery, NormalizedBusiness, ProviderName } from "@/types";

export interface ProviderRun {
  runId: string;
  datasetId?: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
}

export interface BusinessSearchProvider {
  readonly name: ProviderName;
  startSearch(query: BusinessSearchQuery, callbackUrl?: string): Promise<ProviderRun>;
  getRun(runId: string): Promise<ProviderRun>;
  getResults(run: ProviderRun, query: BusinessSearchQuery): Promise<NormalizedBusiness[]>;
  searchBusinesses?(query: BusinessSearchQuery): Promise<NormalizedBusiness[]>;
}
