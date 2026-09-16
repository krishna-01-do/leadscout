import { Check } from "lucide-react";
import { pricing } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { planDetails } from "@/lib/payments/payu";

export function Pricing() {
  const plans = [pricing.free, pricing.starter, pricing.pro];
  const featuredIndex = 1;

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple Pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => {
            const paid = plan.name === "Starter" ? planDetails("starter") : plan.name === "Pro" ? planDetails("pro") : null;
            return (
            <div
              key={plan.name}
              className={`relative rounded-2xl border bg-card p-6 ${
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
                <span className="text-3xl font-bold">{plan.name === "Free" ? "₹0" : paid ? `₹${paid.amount}` : "Contact us"}</span>
                <span className="text-sm text-muted-foreground">/{plan.name === "Free" ? plan.period : "30 days"}</span>
              </div>

              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                <p>{plan.searches} searches per month</p>
                <p>Up to {plan.leads} leads per search</p>
                {"monthlyLeads" in plan && <p>Up to {plan.monthlyLeads.toLocaleString()} leads per month</p>}
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/signup" className="mt-8 block">
                <Button
                  className="w-full"
                  variant={i === featuredIndex ? "default" : "outline"}
                >
                  {plan.name === "Free" ? "Start Free" : `Get ${plan.name}`}
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
