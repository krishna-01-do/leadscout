"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { PayUCheckoutButton } from "@/components/payments/payu-checkout-button";

type Plan = {
  name: string;
  amount: string;
  searches: number;
  leads: number;
  monthlyLeads: number;
  features: string[];
} | null;

export function PaymentPlanOptions({ currentPlan }: { currentPlan: string }) {
  const [plans, setPlans] = useState<{ starter: Plan; pro: Plan } | null>(null);
  useEffect(() => { fetch("/api/payments/plans").then((response) => response.json()).then(setPlans).catch(() => setPlans(null)); }, []);
  const choices: Array<"starter" | "pro"> = currentPlan === "pro" ? ["pro"] : currentPlan === "starter" ? ["starter", "pro"] : ["starter", "pro"];
  return <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
    {choices.map((key) => {
      const plan = plans?.[key];
      return <div key={key} className="min-w-0 rounded-lg border border-border/60 p-3">
        <p className="text-sm font-semibold capitalize">{key}</p>
        <p className="flex flex-wrap items-baseline text-lg font-bold">{plan ? `₹${plan.amount}` : "Configure price"}<span className="text-xs font-normal text-muted-foreground">/30 days</span></p>
        <p className="mt-1 text-xs text-muted-foreground">{plan?.searches ?? (key === "starter" ? 30 : 60)} searches per period</p>
        <p className="text-xs text-muted-foreground">Up to {plan?.leads ?? 50} leads per search</p>
        <p className="text-xs text-muted-foreground">Up to {plan?.monthlyLeads ?? (key === "starter" ? 1500 : 3000)} leads per period</p> */}
        {plan && <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
          {plan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>)}
        </ul>}
        {plan ? <PayUCheckoutButton plan={key} /> : <p className="mt-3 text-xs text-muted-foreground">PayU pricing is not configured.</p>}
      </div>;
    })}
  </div>;
}
