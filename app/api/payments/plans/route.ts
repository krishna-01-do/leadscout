import { NextResponse } from "next/server";
import { offeredPlanKeys } from "@/lib/branding";
import { planDetails, type PaidPlan } from "@/lib/payments/payu";

export async function GET() {
  const plans = (offeredPlanKeys as readonly PaidPlan[]).reduce(
    (acc, key) => {
      acc[key] = planDetails(key);
      return acc;
    },
    {} as Record<PaidPlan, ReturnType<typeof planDetails>>
  );
  return NextResponse.json(plans);
}
