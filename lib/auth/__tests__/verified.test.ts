import { describe, expect, it } from "vitest";
import { hasVerifiedEmail } from "../verified";

describe("verified accounts", () => {
  it("accepts a confirmed email password account", () => {
    expect(hasVerifiedEmail({ email_confirmed_at: "2026-01-01T00:00:00Z" })).toBe(true);
  });

  it("accepts Google even when the email confirmation timestamp is missing", () => {
    expect(hasVerifiedEmail({
      email_confirmed_at: null,
      app_metadata: { provider: "google", providers: ["google"] },
    })).toBe(true);
  });

  it("rejects an unconfirmed email password account", () => {
    expect(hasVerifiedEmail({
      email_confirmed_at: null,
      app_metadata: { provider: "email", providers: ["email"] },
    })).toBe(false);
  });
});
