import type { BusinessSearchProvider } from "./business-search-provider";
import { ApifyBusinessSearchProvider } from "./apify-provider";
import { MockBusinessSearchProvider } from "./mock-provider";

export function getProvider(): BusinessSearchProvider {
  const useMock = process.env.APIFY_API_TOKEN == null || process.env.APIFY_API_TOKEN === "";
  if (useMock) {
    return new MockBusinessSearchProvider();
  }
  return new ApifyBusinessSearchProvider();
}

export function getProviderName(): string {
  const useMock = process.env.APIFY_API_TOKEN == null || process.env.APIFY_API_TOKEN === "";
  return useMock ? "mock" : "apify";
}

export type { BusinessSearchProvider };
