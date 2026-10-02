"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { PayUCheckoutButton } from "@/components/payments/payu-checkout-button";
import { Badge } from "@/components/ui/badge";
import { offeredPlanKeys, pricing, pricingPlanBenefits, type PaidPlanKey } from "@/lib/branding";
import { cn } from "@/lib/utils";

type Plan = {
  amount: string;
} | null;

export function PaymentPlanOptions({
  currentPlan,
  hasActivePlan = false,
}: {
  currentPlan: string;
  hasActivePlan?: boolean;
}) {
  const [plans, setPlans] = useState<Partial<Record<PaidPlanKey, Plan>> | null>(null);
  useEffect(() => {
    fetch("/api/payments/plans")
      .then((response) => response.json())
      .then(setPlans)
      .catch(() => setPlans(null));
  }, []);

  const choices = [...offeredPlanKeys];
  const featured = choices.includes("pro") ? "pro" : choices[0];
  const single = choices.length === 1;

  return (
    <div
      className={cn(
        "mt-6 grid gap-4",
        single ? "mx-auto max-w-3xl grid-cols-1" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
      )}
    >
      {choices.map((key) => {
        const plan = plans?.[key] ?? null;
        const planCopy = pricing[key];
        const isFeatured = key === featured && choices.length > 1;
        const isCurrent = hasActivePlan && currentPlan === key;
        const checkout = plan ? (
          <PayUCheckoutButton
            plan={key}
            label={isCurrent ? `Renew ${planCopy.name}` : single ? `Start with ${planCopy.name}` : `Get ${planCopy.name}`}
            featured={isFeatured || single}
          />
        ) : (
          <p className="text-sm text-muted-foreground">PayU pricing is not configured.</p>
        );

        return (
          <div
            key={key}
            className={cn(
              "premium-card relative flex min-h-full min-w-0 flex-col bg-background p-4 sm:p-6",
              (isFeatured || single) && "border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/30"
            )}
          >
            {isFeatured && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3">
                Most Popular
              </Badge>
            )}
            {isCurrent && (
              <Badge variant="secondary" className="absolute -top-3 right-4">
                Current
              </Badge>
            )}

            <div className={cn(single && "grid gap-8 md:grid-cols-2 md:items-center")}>
              <div>
                {single && <Badge className="mb-4">One plan</Badge>}
                <div className="space-y-1">
                  <p className="text-lg font-semibold tracking-tight">{planCopy.name}</p>
                  <p className="flex flex-wrap items-baseline gap-1">
                    <span className={cn("font-bold tracking-tight", single ? "text-4xl sm:text-5xl" : "text-3xl")}>
                      {plan ? `₹${Number(plan.amount).toLocaleString("en-IN")}` : "Configure"}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{planCopy.value}</p>
                {single && <div className="mt-6">{checkout}</div>}
              </div>

              <ul className={cn("space-y-3", !single && "mt-5 flex-1 border-t border-border/60 pt-5")}>
                {pricingPlanBenefits(key).map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm text-foreground/90">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {!single && <div className="mt-6">{checkout}</div>}
          </div>
        );
      })}
    </div>
  );
}
