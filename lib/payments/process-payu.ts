import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { validResponseHash, verifyPayment } from "@/lib/payments/payu";
import { amountsMatch, isFinalFailure } from "./verification";

export type PaymentOutcome = "success" | "complete" | "failed" | "invalid" | "retry";

async function verifyWithRetry(txnid: string) {
  for (const delay of [0, 600, 1_200]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    const verified = await verifyPayment(txnid).catch(() => null);
    if (verified && (verified.status === "success" || isFinalFailure(verified.status))) return verified;
  }
  return null;
}

async function completeVerifiedPayment(
  payment: { id: string; txnid: string; amount: number | string; status: string },
  verified: { status?: string; mihpayid?: string; amount?: string },
  rawResponse: Record<string, unknown>
): Promise<PaymentOutcome> {
  const amountMatches = amountsMatch(verified.amount, payment.amount);
  if (verified.status === "success" && amountMatches && verified.mihpayid) {
    const { data: completed, error } = await createSupabaseAdmin().rpc("complete_payu_payment", {
      p_txnid: payment.txnid, p_payu_payment_id: verified.mihpayid, p_raw_response: rawResponse,
    });
    if (error) console.error("PayU subscription activation failed", { txnid: payment.txnid, code: error.code, message: error.message });
    return !error && completed ? "success" : "retry";
  }
  if (verified.status === "success") console.error("PayU verification mismatch", {
    txnid: payment.txnid, amountMatches, hasPaymentId: Boolean(verified.mihpayid),
  });
  return verified.status && isFinalFailure(verified.status) ? "failed" : "retry";
}

export async function processPayUResponse(values: Record<string, string>): Promise<PaymentOutcome> {
  if (!values.txnid || !validResponseHash(values)) return "invalid";
  const db = createSupabaseAdmin();
  const { data: payment, error } = await db.from("payments")
    .select("id,txnid,amount,status").eq("txnid", values.txnid).maybeSingle();
  if (error || !payment) return "invalid";
  if (payment.status === "success") return "complete";

  const verified = await verifyWithRetry(values.txnid);
  if (!verified) return "retry";
  const outcome = await completeVerifiedPayment(payment, verified, values);
  if (outcome === "failed") {
    await db.from("payments").update({ status: "failed", raw_response: values }).eq("id", payment.id).eq("status", "pending");
  }
  return outcome;
}

export async function reconcilePayUPayment(txnid: string, userId: string): Promise<PaymentOutcome> {
  const db = createSupabaseAdmin();
  const { data: payment, error } = await db.from("payments")
    .select("id,txnid,amount,status").eq("txnid", txnid).eq("user_id", userId).maybeSingle();
  if (error || !payment) return "invalid";
  if (payment.status === "success") return "complete";
  const verified = await verifyWithRetry(txnid);
  if (!verified) return "retry";
  const outcome = await completeVerifiedPayment(payment, verified, { source: "authenticated_reconciliation", verified });
  if (outcome === "failed") await db.from("payments").update({ status: "failed", raw_response: verified }).eq("id", payment.id).eq("status", "pending");
  return outcome;
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
