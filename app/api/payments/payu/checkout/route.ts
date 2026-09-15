import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import { checkoutHash, newTransactionId, paymentEndpoint, planDetails, type PaidPlan } from "@/lib/payments/payu";

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { plan?: PaidPlan; phone?: string } | null;
  if (body?.plan !== "starter" && body?.plan !== "pro") return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  const phone = body.phone?.replace(/\D/g, "") ?? "";
  if (phone.length < 10 || phone.length > 15) return NextResponse.json({ error: "Enter a valid phone number for PayU checkout." }, { status: 400 });
  const plan = planDetails(body.plan);
  if (!plan) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  const name = String(user.user_metadata.full_name ?? user.email?.split("@")[0] ?? "LeadScout customer").slice(0, 60);
  const txnid = newTransactionId();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return NextResponse.json({ error: "App URL is not configured" }, { status: 503 });
  const { error } = await createSupabaseAdmin().from("payments").insert({ user_id: user.id, txnid, plan: body.plan, amount: plan.amount });
  if (error) return NextResponse.json({ error: "Could not create payment" }, { status: 500 });
  const productinfo = `LeadScout ${plan.name} monthly plan`;
  const fields = { key: process.env.PAYU_MERCHANT_KEY!, txnid, amount: plan.amount, productinfo, firstname: name, email: user.email ?? "", phone, surl: `${appUrl}/api/payments/payu/callback`, furl: `${appUrl}/api/payments/payu/callback`, udf1: user.id, udf2: body.plan, hash: checkoutHash({ txnid, amount: plan.amount, productinfo, firstname: name, email: user.email ?? "" }) };
  return NextResponse.json({ endpoint: paymentEndpoint(), fields });
}
