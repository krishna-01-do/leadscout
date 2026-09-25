import { NextResponse } from "next/server";
import { planDetails, type PaidPlan } from "@/lib/payments/payu";

export async function GET() {
  const plans = (["basic", "pro", "plus"] as PaidPlan[]).reduce(
    (acc, key) => {
      acc[key] = planDetails(key);
      return acc;
    },
    {} as Record<PaidPlan, ReturnType<typeof planDetails>>
  );
  return NextResponse.json(plans);
}
