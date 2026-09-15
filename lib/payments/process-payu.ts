import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { validResponseHash, verifyPayment } from "@/lib/payments/payu";

export type PaymentOutcome = "success" | "complete" | "failed" | "invalid" | "retry";

export async function processPayUResponse(values: Record<string, string>): Promise<PaymentOutcome> {
  if (!values.txnid || !validResponseHash(values)) return "invalid";
  const db = createSupabaseAdmin();
  const { data: payment, error } = await db.from("payments")
    .select("id,txnid,amount,status").eq("txnid", values.txnid).maybeSingle();
  if (error || !payment) return "invalid";
  if (payment.status === "success") return "complete";

  const verified = await verifyPayment(values.txnid).catch(() => null);
  if (!verified) return "retry";
  const amountMatches = Number.isFinite(Number(verified.amount))
    && Number(verified.amount) === Number(payment.amount);
  const captured = verified.status === "success"
    && (!verified.unmappedstatus || verified.unmappedstatus === "captured");

  if (captured && amountMatches && verified.mihpayid) {
    const { data: completed, error: completionError } = await db.rpc("complete_payu_payment", {
      p_txnid: values.txnid,
      p_payu_payment_id: verified.mihpayid,
      p_raw_response: values,
    });
    return !completionError && completed ? "success" : "retry";
  }

  if (verified.status && verified.status !== "success") {
    await db.from("payments").update({ status: "failed", raw_response: values }).eq("id", payment.id);
    return "failed";
  }
  return "retry";
}

export async function parsePayUPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return Object.fromEntries(Object.entries(body).map(([key, value]) => [key, String(value ?? "")]));
  }
  const form = await request.formData().catch(() => null);
  return form ? Object.fromEntries(Array.from(form.entries(), ([key, value]) => [key, String(value)])) : null;
}
