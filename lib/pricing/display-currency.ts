export type DisplayCurrency = "INR" | "USD";

const FALLBACK_INR_PER_USD = 96;

export function currencyForCountry(country: string | null | undefined): DisplayCurrency {
  const code = country?.trim().toUpperCase() ?? "";
  if (!code || code === "IN") return "INR";
  return "USD";
}

export function formatDisplayPrice(
  amountInr: number,
  currency: DisplayCurrency,
  inrPerUsd: number,
) {
  if (currency === "USD") {
    const dollars = Math.round(amountInr / inrPerUsd);
    return `$${dollars.toLocaleString("en-US")}`;
  }
  return `₹${Math.round(amountInr).toLocaleString("en-IN")}`;
}

export async function loadInrPerUsd() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 60 * 60 * 12 },
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) return FALLBACK_INR_PER_USD;
    const body = (await response.json()) as { rates?: { INR?: number } };
    const rate = body.rates?.INR;
    if (!rate || rate < 50 || rate > 200) return FALLBACK_INR_PER_USD;
    return rate;
  } catch {
    return FALLBACK_INR_PER_USD;
  }
}
