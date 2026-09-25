import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import { checkoutHash, isPaidPlan, newTransactionId, paymentEndpoint, payUIsConfigured, planDetails, type PaidPlan } from "@/lib/payments/payu";
import { enforceRateLimit } from "@/lib/usage/service";
import { branding } from "@/lib/branding";

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await enforceRateLimit(user.id, "payment_checkout", 5, 300))) return NextResponse.json({ error: "Too many checkout attempts. Please wait a few minutes." }, { status: 429 });
  const body = await request.json().catch(() => null) as { plan?: PaidPlan; phone?: string } | null;
  if (!body || !isPaidPlan(body.plan)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  const selectedPlan = body.plan;
  const phone = body.phone?.replace(/\D/g, "") ?? "";
  if (phone.length < 10 || phone.length > 15) return NextResponse.json({ error: "Enter a valid phone number for PayU checkout." }, { status: 400 });
  const plan = planDetails(selectedPlan);
  if (!plan) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  if (!payUIsConfigured()) return NextResponse.json({ error: "PayU credentials are not configured yet." }, { status: 503 });
  const name = String(user.user_metadata.full_name ?? user.email?.split("@")[0] ?? `${branding.name} customer`).slice(0, 60);
  const txnid = newTransactionId();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return NextResponse.json({ error: "App URL is not configured" }, { status: 503 });
  const { error } = await createSupabaseAdmin().from("payments").insert({ user_id: user.id, txnid, plan: selectedPlan, amount: plan.amount });
  if (error) return NextResponse.json({ error: "Could not create payment" }, { status: 500 });
  const productinfo = `${branding.name} ${plan.name} monthly plan`;
  const udf1 = user.id; const udf2 = selectedPlan;
  const fields = { key: process.env.PAYU_MERCHANT_KEY!, txnid, amount: plan.amount, productinfo, firstname: name, email: user.email ?? "", phone, surl: `${appUrl}/api/payments/payu/callback`, furl: `${appUrl}/api/payments/payu/callback`, udf1, udf2, udf3: "", udf4: "", udf5: "", hash: checkoutHash({ txnid, amount: plan.amount, productinfo, firstname: name, email: user.email ?? "", udf1, udf2 }) };
  return NextResponse.json({ endpoint: paymentEndpoint(), fields });
}
