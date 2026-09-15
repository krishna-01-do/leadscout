"use client";

import { useEffect, useState } from "react";
import { PayUCheckoutButton } from "@/components/payments/payu-checkout-button";

type Plan = { name: string; amount: string; searches: number; leads: number } | null;

export function PaymentPlanOptions({ currentPlan }: { currentPlan: string }) {
  const [plans, setPlans] = useState<{ starter: Plan; pro: Plan } | null>(null);
  useEffect(() => { fetch("/api/payments/plans").then((response) => response.json()).then(setPlans).catch(() => setPlans(null)); }, []);
  const choices: Array<"starter" | "pro"> = currentPlan === "pro" ? ["pro"] : currentPlan === "starter" ? ["starter", "pro"] : ["starter", "pro"];
  return <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
    {choices.map((key) => {
      const plan = plans?.[key];
      return <div key={key} className="rounded-lg border border-border/60 p-3">
        <p className="text-sm font-semibold capitalize">{key}</p>
        <p className="text-lg font-bold">{plan ? `₹${plan.amount}` : "Configure price"}<span className="text-xs font-normal text-muted-foreground">/30 days</span></p>
        <p className="mt-1 text-xs text-muted-foreground">{plan?.searches ?? (key === "starter" ? 50 : 200)} searches per period</p>
        {plan ? <PayUCheckoutButton plan={key} /> : <p className="mt-3 text-xs text-muted-foreground">PayU pricing is not configured.</p>}
      </div>;
    })}
  </div>;
}
