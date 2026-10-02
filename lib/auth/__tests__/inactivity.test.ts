import { describe, expect, it } from "vitest";
import { AUTH_INACTIVITY_MS, isAuthInactive, isRecentSignIn } from "../inactivity";

describe("auth inactivity", () => {
  it("keeps an active session before thirty minutes", () => {
    expect(isAuthInactive(1_000, 1_000 + AUTH_INACTIVITY_MS - 1)).toBe(false);
  });

  it("expires a session at thirty minutes", () => {
    expect(isAuthInactive(1_000, 1_000 + AUTH_INACTIVITY_MS)).toBe(true);
  });

  it("treats a sign-in from the last two minutes as new", () => {
    const now = Date.parse("2026-10-02T12:00:00.000Z");
    expect(isRecentSignIn("2026-10-02T11:59:00.000Z", now)).toBe(true);
    expect(isRecentSignIn("2026-10-02T11:00:00.000Z", now)).toBe(false);
  });
});
