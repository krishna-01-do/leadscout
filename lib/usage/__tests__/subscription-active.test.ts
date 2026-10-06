import { describe, expect, it } from "vitest";

function subscriptionIsActive(subscription: {
  plan: string;
  status: string;
  period_start: string;
  period_end: string;
}) {
  const activePlans = new Set(["free", "basic", "pro", "plus", "starter"]);
  if (subscription.status !== "active") return false;
  if (!activePlans.has(subscription.plan)) return false;
  if (subscription.plan === "free") return true;
  const now = Date.now();
  const start = new Date(subscription.period_start).getTime();
  const end = new Date(subscription.period_end).getTime();
  return now >= start && now <= end;
}

describe("subscription period handling", () => {
  it("treats a free plan as active even after a short window would have expired", () => {
    expect(
      subscriptionIsActive({
        plan: "free",
        status: "active",
        period_start: "2020-01-01T00:00:00.000Z",
        period_end: "2020-02-01T00:00:00.000Z",
      })
    ).toBe(true);
  });

  it("requires an active plan inside the current period", () => {
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
