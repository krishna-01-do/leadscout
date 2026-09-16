import { describe, expect, it } from "vitest";
import { amountsMatch, normalizeVerification } from "../verification";
describe("PayU verification response", () => {
  it("uses original transaction amount when an offer changes amt", () => {
    expect(normalizeVerification({ status: "success", transaction_amount: "10000.00", amt: "9900.00", mihpayid: 123 }))
      .toEqual({ status: "success", amount: "10000.00", mihpayid: "123" });
  });
  it.each([undefined, null, "", " ", "NaN", "1e3", "-1", "0", "10.001"])("rejects invalid amount %s", value => {
    expect(amountsMatch(value, value)).toBe(false);
  });
  it("compares rupees without depending on formatting", () => { expect(amountsMatch("2900", "2900.00")).toBe(true); });
});
