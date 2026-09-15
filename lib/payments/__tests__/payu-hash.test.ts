import { describe, expect, it } from "vitest";
import { createCheckoutHash, createResponseHash, createVerifyHash, hashesMatch } from "@/lib/payments/payu-hash";

const values = {
  key: "key123", salt: "salt456", txnid: "txn123", amount: "2900.00",
  productinfo: "LeadScout Starter monthly plan", firstname: "Krishna",
  email: "user@example.com", udf1: "user-uuid", udf2: "starter",
};

describe("PayU hashing", () => {
  it("includes UDF values in the checkout hash in PayU order", () => {
    expect(createCheckoutHash(values)).toBe("126d9127ce90c419322fd5368598a815956935c91d304552c9b812446a380b387ec20239bbf60826f18bd88f57efeba3cb3d5ac8f768376d5406544a2c52c148");
  });

  it("builds and compares the reverse response hash", () => {
    const response = { ...values, status: "success" };
    const hash = createResponseHash(values.salt, response);
    expect(hash).toBe("c52da0756dce1d66cad765112554a124da290478715c583faa074ea5045f51741d4295099a99dcd8fc766ebf9fc07def679237181954edc0f59dec24b7e0246d");
    expect(hashesMatch(hash, hash)).toBe(true);
    expect(hashesMatch(hash, "0".repeat(128))).toBe(false);
  });

  it("includes additional charges in the response hash when PayU sends them", () => {
    expect(createResponseHash(values.salt, { ...values, status: "success", additionalCharges: "12.00" }))
      .toBe("ea730f8de350c4cec02f591f1eb7f947dd70e101bf57d428c54249701d99cd58f4a2eb506dbc6af6fd4eac6c4ffac20d33c67d0fd42e52ec5671955a9bc98a59");
  });

  it("builds the verify-payment command hash", () => {
    expect(createVerifyHash("key123", "txn123", "salt456")).toMatch(/^[a-f0-9]{128}$/);
  });
});
