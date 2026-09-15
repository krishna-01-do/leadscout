import { NextResponse } from "next/server";
import { planDetails } from "@/lib/payments/payu";

export async function GET() {
  return NextResponse.json({ starter: planDetails("starter"), pro: planDetails("pro") });
}
