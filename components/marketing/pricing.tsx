import { Check } from "lucide-react";
import { headers } from "next/headers";
import { pricing, pricingPlanBenefits, publicPlanKeys, type PricingPlanKey } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { planDetails } from "@/lib/payments/payu";
import {
  currencyForCountry,
  formatDisplayPrice,
  loadInrPerUsd,
  type DisplayCurrency,
} from "@/lib/pricing/display-currency";

function shownPrice(amountInr: number | null, currency: DisplayCurrency, inrPerUsd: number) {
  if (amountInr === null) return "Contact us";
  return formatDisplayPrice(amountInr, currency, inrPerUsd);
}

function PlanPrice({ label }: { label: string }) {
  return (
    <div className="mt-3 flex items-baseline gap-1">
      <span className="text-4xl font-bold tracking-tight sm:text-5xl">{label}</span>
      <span className="text-sm text-muted-foreground">/month</span>
    </div>
  );
}

function BenefitList({ planKey }: { planKey: PricingPlanKey }) {
  return (
    <ul className="space-y-3">
      {pricingPlanBenefits(planKey).map((benefit) => (
        <li key={benefit} className="flex items-start gap-2.5 text-sm">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span>{benefit}</span>
        </li>
      ))}
    </ul>
  );
}

export async function Pricing() {
  const country = (await headers()).get("x-vercel-ip-country");
  const currency = currencyForCountry(country);
  const inrPerUsd = currency === "USD" ? await loadInrPerUsd() : 1;
  const planKeys = [...publicPlanKeys];

  const onlyPlan = planKeys.length === 1 ? planKeys[0] : null;
  if (onlyPlan) {
    const key = onlyPlan;
    const plan = pricing[key];
    const paid = key === "free" ? null : planDetails(key);
    const amountInr = key === "free" ? 0 : paid ? Number(paid.amount) : null;
    return (
      <section id="pricing" className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-4xl tracking-tight sm:text-5xl">Pricing</h2>
            <p className="mt-3 text-muted-foreground">
              One monthly plan. Describe what you sell and start finding clients.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-3xl">
            <div className="premium-card relative overflow-hidden border-primary/40 p-6 shadow-xl shadow-primary/15 ring-1 ring-primary/30 sm:p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
              <div className="grid gap-8 md:grid-cols-2 md:items-center">
                <div>
                  <Badge>One plan</Badge>
                  <h3 className="mt-4 text-2xl font-semibold">{plan.name}</h3>
                  <PlanPrice label={shownPrice(amountInr, currency, inrPerUsd)} />
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{plan.value}</p>
                  <Link href="/signup" className="mt-8 block">
                    <Button size="lg" className="w-full">
                      Start with {plan.name}
                    </Button>
                  </Link>
                </div>
                <BenefitList planKey={key} />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const featuredIndex = planKeys.indexOf("pro");

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-4xl tracking-tight sm:text-5xl">Pricing</h2>
          <p className="mt-3 text-muted-foreground">
            Start free, then upgrade to Pro when you need more searches.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {planKeys.map((key, i) => {
            const plan = pricing[key];
            const paid = key === "free" ? null : planDetails(key);
            const amountInr = key === "free" ? 0 : paid ? Number(paid.amount) : null;
            return (
              <div
                key={plan.name}
                className={`premium-card relative flex min-h-full min-w-0 flex-col p-5 sm:p-6 ${
                  i === featuredIndex
                    ? "border-primary shadow-xl shadow-primary/20 ring-1 ring-primary/30"
                    : ""
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
                    {shownPrice(amountInr, currency, inrPerUsd)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{key === "free" ? plan.period : "month"}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {plan.value}
                </p>

                <ul className="mt-6 flex-1 space-y-3">
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
                    {key === "free" ? "Start Free" : `Get ${plan.name}`}
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
