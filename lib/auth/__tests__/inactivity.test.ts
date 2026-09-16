import { describe, expect, it } from "vitest";
import { AUTH_INACTIVITY_MS, isAuthInactive } from "../inactivity";

describe("auth inactivity", () => {
  it("keeps an active session before thirty minutes", () => {
    expect(isAuthInactive(1_000, 1_000 + AUTH_INACTIVITY_MS - 1)).toBe(false);
  });

  it("expires a session at thirty minutes", () => {
    expect(isAuthInactive(1_000, 1_000 + AUTH_INACTIVITY_MS)).toBe(true);
  });
});
