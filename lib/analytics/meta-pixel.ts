const STORAGE_PREFIX = "applyvelocity:meta-purchase:";
const LEAD_STORAGE_PREFIX = "applyvelocity:meta-lead:";
const META_PIXEL_ID = "2106522826925737";
const SIGNUP_LEAD_WINDOW_MS = 30 * 60 * 1000;

type MetaPurchaseInput = {
  txnid: string;
  value: number | string;
  plan: string;
  currency?: string;
};

declare global {
  interface Window {
    fbq?: {
      (
        command: "trackSingle",
        pixelId: string,
        eventName: string,
        params?: Record<string, unknown>,
        options?: { eventID?: string }
      ): void;
      (
        command: string,
        eventName: string,
        params?: Record<string, unknown>,
        options?: { eventID?: string }
      ): void;
    };
  }
}

function purchaseValue(value: number | string) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function recent(value: string | null | undefined, now: number) {
  const time = Date.parse(value ?? "");
  return Number.isFinite(time) && now - time >= 0 && now - time <= SIGNUP_LEAD_WINDOW_MS;
}

export function signupJustCompleted(
  user: { created_at?: string | null; email_confirmed_at?: string | null },
  now = Date.now(),
) {
  return recent(user.email_confirmed_at, now) || recent(user.created_at, now);
}

export function trackMetaLead(userId: string) {
  if (typeof window === "undefined" || !userId || typeof window.fbq !== "function") return false;

  const storageKey = `${LEAD_STORAGE_PREFIX}${userId}`;
  try {
    if (window.localStorage.getItem(storageKey) === "1") return false;
  } catch {
    // Ignore storage failures and still attempt to send the event once.
  }

  window.fbq("trackSingle", META_PIXEL_ID, "Lead");

  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // Non-fatal: duplicate protection may weaken without localStorage.
  }

  return true;
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
