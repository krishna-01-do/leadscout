import { NextRequest, NextResponse } from "next/server";
import { parsePayUPayload, processPayUResponse } from "@/lib/payments/process-payu";

export async function POST(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const values = await parsePayUPayload(request);
  const outcome = values ? await processPayUResponse(values) : "invalid";
  const destination = new URL("/app/account", appUrl);
  destination.searchParams.set("payment", outcome);
  if (values?.txnid) destination.searchParams.set("txnid", values.txnid);
  return NextResponse.redirect(destination, 303);
}
