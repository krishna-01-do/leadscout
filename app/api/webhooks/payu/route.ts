import { NextRequest, NextResponse } from "next/server";
import { parsePayUPayload, processPayUResponse } from "@/lib/payments/process-payu";

export async function POST(request: NextRequest) {
  const values = await parsePayUPayload(request);
  if (!values) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const outcome = await processPayUResponse(values);
  if (outcome === "invalid") return NextResponse.json({ error: "Invalid signature or transaction" }, { status: 400 });
  if (outcome === "retry") return NextResponse.json({ error: "Verification temporarily unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true, outcome });
}
