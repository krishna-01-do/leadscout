import { NextRequest, NextResponse } from "next/server";
import { parsePayUPayload, processPayUResponse } from "@/lib/payments/process-payu";

export async function POST(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const values = await parsePayUPayload(request);
  const outcome = values ? await processPayUResponse(values) : "invalid";
  return NextResponse.redirect(new URL(`/app/account?payment=${outcome}`, appUrl), 303);
}
