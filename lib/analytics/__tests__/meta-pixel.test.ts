import { afterEach, describe, expect, it, vi } from "vitest";
import { trackMetaPurchase } from "@/lib/analytics/meta-pixel";

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
