import { describe, expect, it } from "vitest";

function subscriptionIsActive(subscription: {
  plan: string;
  status: string;
  period_start: string;
  period_end: string;
}) {
  const paid = new Set(["basic", "pro", "plus", "starter"]);
  if (subscription.status !== "active") return false;
  if (!paid.has(subscription.plan)) return false;
  const now = Date.now();
  const start = new Date(subscription.period_start).getTime();
  const end = new Date(subscription.period_end).getTime();
  return now >= start && now <= end;
}

describe("subscription period handling", () => {
  it("treats free and inactive plans as inactive", () => {
    expect(
      subscriptionIsActive({
        plan: "free",
        status: "trial",
        period_start: "2026-01-01T00:00:00.000Z",
        period_end: "2026-12-31T00:00:00.000Z",
      })
    ).toBe(false);
  });

  it("requires an active paid plan inside the current period", () => {
    const start = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(
      subscriptionIsActive({
        plan: "basic",
        status: "active",
        period_start: start,
        period_end: end,
      })
    ).toBe(true);
    expect(
      subscriptionIsActive({
        plan: "basic",
        status: "active",
        period_start: "2020-01-01T00:00:00.000Z",
        period_end: "2020-02-01T00:00:00.000Z",
      })
    ).toBe(false);
  });
});
