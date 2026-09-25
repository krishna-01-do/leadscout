const STORAGE_PREFIX = "applyvelocity:meta-purchase:";

type MetaPurchaseInput = {
  txnid: string;
  value: number | string;
  plan: string;
  currency?: string;
};

declare global {
  interface Window {
    fbq?: (
      command: string,
      eventName: string,
      params?: Record<string, unknown>,
      options?: { eventID?: string }
    ) => void;
  }
}

function purchaseValue(value: number | string) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function trackMetaPurchase(input: MetaPurchaseInput) {
  if (typeof window === "undefined") return false;
  const value = purchaseValue(input.value);
  if (!value || !input.txnid || !input.plan) return false;

  const storageKey = `${STORAGE_PREFIX}${input.txnid}`;
  try {
    if (window.sessionStorage.getItem(storageKey) === "1") return false;
  } catch {
    // Ignore storage failures and still attempt to send the event once.
  }

  if (typeof window.fbq !== "function") return false;

  window.fbq(
    "track",
    "Purchase",
    {
      value,
      currency: input.currency ?? "INR",
      content_name: input.plan,
      content_type: "product",
      contents: [{ id: input.plan, quantity: 1 }],
      num_items: 1,
    },
    { eventID: input.txnid }
  );

  try {
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // Non-fatal: duplicate protection may weaken without sessionStorage.
  }

  return true;
}
