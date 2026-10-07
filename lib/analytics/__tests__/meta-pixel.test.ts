import { afterEach, describe, expect, it, vi } from "vitest";
import { trackMetaLead, trackMetaPurchase } from "@/lib/analytics/meta-pixel";

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

  it("fires Lead once after Google sign-in", () => {
    const fbq = vi.fn();
    mockLeadWindow(fbq);
    const createdAt = new Date().toISOString();

    expect(trackMetaLead({ id: "user-1", createdAt, verified: true })).toBe(true);
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Lead",
      { content_name: "signup" },
      { eventID: "user-1" }
    );
    expect(trackMetaLead({ id: "user-1", createdAt, verified: true })).toBe(false);
    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it("counts a lead when the email is confirmed, even if signup was earlier", () => {
    const fbq = vi.fn();
    mockLeadWindow(fbq);

    expect(trackMetaLead({
      id: "user-1",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      confirmedAt: new Date().toISOString(),
      verified: true,
    })).toBe(true);
    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it("skips an email account until the address is confirmed", () => {
    const fbq = vi.fn();
    mockLeadWindow(fbq);

    expect(trackMetaLead({
      id: "user-1",
      createdAt: new Date().toISOString(),
      verified: false,
    })).toBe(false);
    expect(fbq).not.toHaveBeenCalled();
  });

  it("skips an older confirmed account", () => {
    const fbq = vi.fn();
    mockLeadWindow(fbq);
    const confirmedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

    expect(trackMetaLead({ id: "user-1", createdAt: confirmedAt, confirmedAt, verified: true })).toBe(false);
    expect(fbq).not.toHaveBeenCalled();
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
