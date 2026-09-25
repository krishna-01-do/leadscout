import { Check } from "lucide-react";
import { pricing, pricingPlanBenefits, type PricingPlanKey } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { planDetails } from "@/lib/payments/payu";

export function Pricing() {
  const planKeys = Object.keys(pricing) as PricingPlanKey[];
  const featuredIndex = planKeys.indexOf("pro");

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple Pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            Choose a 30-day plan and start finding qualified local prospects.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {planKeys.map((key, i) => {
            const plan = pricing[key];
            const paid = planDetails(key);
            return (
              <div
                key={plan.name}
                className={`relative min-w-0 rounded-2xl border bg-card p-5 sm:p-6 ${
                  i === featuredIndex
                    ? "border-primary shadow-lg shadow-primary/10 lg:scale-105"
                    : "border-border/60"
                }`}
              >
                {i === featuredIndex && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {paid ? `₹${paid.amount}` : "Contact us"}
                  </span>
                  <span className="text-sm text-muted-foreground">/30 days</span>
                </div>

                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {plan.value}
                </p>

                <ul className="mt-6 space-y-3">
                  {pricingPlanBenefits(key).map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/signup" className="mt-8 block">
                  <Button
                    className="w-full"
                    variant={i === featuredIndex ? "default" : "outline"}
                  >
                    Get {plan.name}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
