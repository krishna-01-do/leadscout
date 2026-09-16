export interface VerifiedPayment {
  status: string;
  mihpayid?: string;
  amount?: string;
}

// Hosted Checkout's verify_payment response uses amt/transaction_amount,
// unlike the callback's amount field. Prefer the original transaction amount
// over the amount debited after offers or additional charges.
export function normalizeVerification(value: unknown): VerifiedPayment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.status !== "string") return null;
  const amount = row.transaction_amount ?? row.amt ?? row.amount;
  const id = row.mihpayid;
  return {
    status: row.status.toLowerCase().trim(),
    amount: typeof amount === "string" || typeof amount === "number" ? String(amount) : undefined,
    mihpayid: typeof id === "string" || typeof id === "number" ? String(id) : undefined,
  };
}

export function amountsMatch(actual: unknown, expected: unknown) {
  const cents = (value: unknown) => {
    if (typeof value !== "string" && typeof value !== "number") return null;
    if (!/^\d+(\.\d{1,2})?$/.test(String(value))) return null;
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : null;
  };
  const amount = cents(actual);
  return amount !== null && amount === cents(expected);
}

export function isFinalFailure(status: string) {
  return ["failure", "failed", "cancelled", "canceled"].includes(status);
}
