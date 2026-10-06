import { describe, expect, it } from "vitest";
import { currencyForCountry, formatDisplayPrice } from "@/lib/pricing/display-currency";

describe("display currency", () => {
  it("keeps India in rupees and shows dollars everywhere else", () => {
    expect(currencyForCountry("IN")).toBe("INR");
    expect(currencyForCountry("in")).toBe("INR");
    expect(currencyForCountry(null)).toBe("INR");
    expect(currencyForCountry("")).toBe("INR");
    expect(currencyForCountry("US")).toBe("USD");
    expect(currencyForCountry("GB")).toBe("USD");
    expect(currencyForCountry("CA")).toBe("USD");
    expect(currencyForCountry("AU")).toBe("USD");
  });

  it("converts the configured rupee price into whole dollars", () => {
    expect(formatDisplayPrice(499, "INR", 96.38)).toBe("₹499");
    expect(formatDisplayPrice(499, "USD", 96.38)).toBe("$5");
    expect(formatDisplayPrice(0, "USD", 96.38)).toBe("$0");
  });
});
