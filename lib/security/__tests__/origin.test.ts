import { describe, expect, it } from "vitest";
import { isTrustedRequestOrigin } from "@/lib/security/origin";

const request = {
  requestUrl: "https://leadscout-internal.vercel.app/api/contact",
  forwardedHost: "www.applyvelocity.com",
  host: "leadscout-internal.vercel.app",
  forwardedProto: "https",
  configuredAppUrl: "https://applyvelocity.com",
};

describe("contact request origin validation", () => {
  it("accepts the configured public domain", () => {
    expect(isTrustedRequestOrigin({ ...request, origin: "https://applyvelocity.com" })).toBe(true);
  });

  it("accepts the actual forwarded custom domain", () => {
    expect(isTrustedRequestOrigin({ ...request, origin: "https://www.applyvelocity.com" })).toBe(true);
  });

  it("rejects unrelated and missing origins", () => {
    expect(isTrustedRequestOrigin({ ...request, origin: "https://attacker.example" })).toBe(false);
    expect(isTrustedRequestOrigin({ ...request, origin: null })).toBe(false);
  });
});
