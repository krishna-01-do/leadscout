import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { validResponseHash, verifyPayment } from "@/lib/payments/payu";

const limits = { starter: { searches: 50, leads: 500 }, pro: { searches: 200, leads: 2000 } } as const;

export async function POST(request: NextRequest) {
  const data = Object.fromEntries(Array.from((await request.formData()).entries(), ([key, value]) => [key, String(value)]));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  if (!validResponseHash(data) || !data.txnid) return NextResponse.redirect(new URL("/app/account?payment=invalid", appUrl), 303);
  const db = createSupabaseAdmin();
  const { data: payment } = await db.from("payments").select("id,user_id,plan,amount,status").eq("txnid", data.txnid).maybeSingle();
  if (!payment || payment.status === "success") return NextResponse.redirect(new URL("/app/account?payment=complete", appUrl), 303);
  const verified = await verifyPayment(data.txnid).catch(() => null);
  const paid = data.status === "success" && verified?.status === "success" && Number(verified.amount) === Number(payment.amount);
  if (!paid) {
    await db.from("payments").update({ status: "failed", raw_response: data }).eq("id", payment.id);
    return NextResponse.redirect(new URL("/app/account?payment=failed", appUrl), 303);
  }
  const plan = payment.plan as keyof typeof limits;
  const start = new Date(); const end = new Date(start); end.setDate(end.getDate() + 30);
  await db.from("payments").update({ status: "success", payu_payment_id: verified.mihpayid ?? null, raw_response: data, completed_at: start.toISOString() }).eq("id", payment.id);
  await db.from("subscriptions").update({ plan, status: "active", monthly_search_limit: limits[plan].searches, monthly_lead_limit: limits[plan].leads, period_start: start.toISOString(), period_end: end.toISOString(), updated_at: start.toISOString() }).eq("user_id", payment.user_id);
  return NextResponse.redirect(new URL("/app/account?payment=success", appUrl), 303);
}
