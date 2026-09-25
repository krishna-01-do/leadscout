"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { PayUCheckoutButton } from "@/components/payments/payu-checkout-button";
import { pricing, pricingPlanBenefits, type PaidPlanKey } from "@/lib/branding";

type Plan = {
  amount: string;
} | null;

function planChoices(currentPlan: string): PaidPlanKey[] {
  if (currentPlan === "plus") return ["plus"];
  if (currentPlan === "pro") return ["pro", "plus"];
  if (currentPlan === "basic") return ["basic", "pro", "plus"];
  return ["basic", "pro", "plus"];
}

export function PaymentPlanOptions({ currentPlan }: { currentPlan: string }) {
  const [plans, setPlans] = useState<Partial<Record<PaidPlanKey, Plan>> | null>(null);
  useEffect(() => {
    fetch("/api/payments/plans")
      .then((response) => response.json())
      .then(setPlans)
      .catch(() => setPlans(null));
  }, []);

  const choices = planChoices(currentPlan);

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {choices.map((key) => {
        const plan = plans?.[key] ?? null;
        const planCopy = pricing[key];
        return (
          <div key={key} className="min-w-0 rounded-lg border border-border/60 p-3">
            <p className="text-sm font-semibold">{planCopy.name}</p>
            <p className="flex flex-wrap items-baseline text-lg font-bold">
              {plan ? `₹${plan.amount}` : "Configure price"}
              <span className="text-xs font-normal text-muted-foreground">/30 days</span>
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{planCopy.value}</p>
            <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
              {pricingPlanBenefits(key).map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            {plan ? (
              <PayUCheckoutButton plan={key} />
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">PayU pricing is not configured.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
