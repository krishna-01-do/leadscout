import { afterEach, describe, expect, it, vi } from "vitest";
import { signupJustCompleted, trackMetaLead, trackMetaPurchase } from "@/lib/analytics/meta-pixel";

function mockWindow(fbq: ReturnType<typeof vi.fn>) {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal("window", { fbq, sessionStorage });
  return sessionStorage;
}

describe("trackMetaLead", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockLeadWindow(fbq?: ReturnType<typeof vi.fn>) {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      fbq,
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    });
  }

  it("fires the standard Lead event once for a completed signup", () => {
    const fbq = vi.fn();
    mockLeadWindow(fbq);

    expect(trackMetaLead("user-1")).toBe(true);
    expect(fbq).toHaveBeenCalledWith("trackSingle", "2106522826925737", "Lead");
    expect(trackMetaLead("user-1")).toBe(false);
    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it("treats a just-confirmed email as a completed signup", () => {
    const now = Date.parse("2026-10-08T12:00:00.000Z");
    expect(signupJustCompleted({
      created_at: "2026-10-07T12:00:00.000Z",
      email_confirmed_at: "2026-10-08T11:50:00.000Z",
    }, now)).toBe(true);
    expect(signupJustCompleted({
      created_at: "2026-01-01T00:00:00.000Z",
      email_confirmed_at: "2026-01-01T00:05:00.000Z",
    }, now)).toBe(false);
  });
});

describe("trackMetaPurchase", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fires Meta Purchase once per transaction", () => {
    const fbq = vi.fn();
    mockWindow(fbq);

    expect(
      trackMetaPurchase({
        txnid: "AVtxn123456",
        value: "599.00",
        plan: "basic",
      })
    ).toBe(true);

    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Purchase",
      {
        value: 599,
        currency: "INR",
        content_name: "basic",
        content_type: "product",
        contents: [{ id: "basic", quantity: 1 }],
        num_items: 1,
      },
      { eventID: "AVtxn123456" }
    );

    expect(
      trackMetaPurchase({
        txnid: "AVtxn123456",
        value: "599.00",
        plan: "basic",
      })
    ).toBe(false);
    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it("skips invalid amounts", () => {
    const fbq = vi.fn();
    mockWindow(fbq);
    expect(trackMetaPurchase({ txnid: "AVtxn123456", value: "0", plan: "basic" })).toBe(false);
    expect(fbq).not.toHaveBeenCalled();
  });
});
