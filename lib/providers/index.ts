import type { BusinessSearchProvider } from "./business-search-provider";
import { ApifyBusinessSearchProvider } from "./apify-provider";
import { MockBusinessSearchProvider } from "./mock-provider";

export function getProvider(): BusinessSearchProvider {
  const production = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
  const useMock = process.env.BUSINESS_SEARCH_PROVIDER === "mock" && !production;
  if (useMock) {
    return new MockBusinessSearchProvider();
  }
  return new ApifyBusinessSearchProvider();
}

export function getProviderName(): string {
  const production = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
  const useMock = process.env.BUSINESS_SEARCH_PROVIDER === "mock" && !production;
  return useMock ? "mock" : "apify";
}

export type { BusinessSearchProvider };
