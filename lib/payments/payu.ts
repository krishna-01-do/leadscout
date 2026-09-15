import "server-only";

import { randomBytes } from "crypto";
import { pricing } from "@/lib/branding";
import { createCheckoutHash, createResponseHash, createVerifyHash, hashesMatch } from "@/lib/payments/payu-hash";

export type PaidPlan = "starter" | "pro";

type PayUConfig = { key: string; salt: string; testMode: boolean };

function config(): PayUConfig | null {
  const key = process.env.PAYU_MERCHANT_KEY;
  const salt = process.env.PAYU_MERCHANT_SALT;
  if (!key || !salt) return null;
  return { key, salt, testMode: process.env.PAYU_ENVIRONMENT !== "production" };
}

export function payUIsConfigured() { return Boolean(config()); }

export function planDetails(plan: PaidPlan) {
  const item = pricing[plan];
  const configuredAmount = process.env[`PAYU_${plan.toUpperCase()}_AMOUNT_INR`];
  const amount = configuredAmount ? Number(configuredAmount) : Number.NaN;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { name: item.name, amount: amount.toFixed(2), searches: item.searches, leads: item.leads };
}

export function paymentEndpoint() {
  return config()?.testMode ? "https://test.payu.in/_payment" : "https://secure.payu.in/_payment";
}

export function newTransactionId() {
  return `LS${Date.now().toString(36)}${randomBytes(8).toString("hex")}`.slice(0, 25);
}

export function checkoutHash(input: { txnid: string; amount: string; productinfo: string; firstname: string; email: string; udf1?: string; udf2?: string }) {
  const settings = config();
  if (!settings) throw new Error("PayU is not configured");
  return createCheckoutHash({ ...input, key: settings.key, salt: settings.salt });
}

export function validResponseHash(values: Record<string, string>) {
  const settings = config();
  if (!settings || !values.hash || values.key !== settings.key) return false;
  return hashesMatch(createResponseHash(settings.salt, values), values.hash);
}

export async function verifyPayment(txnid: string) {
  const settings = config();
  if (!settings) throw new Error("PayU is not configured");
  const endpoint = settings.testMode ? "https://test.payu.in/merchant/postservice.php?form=2" : "https://info.payu.in/merchant/postservice.php?form=2";
  const body = new URLSearchParams({ key: settings.key, command: "verify_payment", var1: txnid, hash: createVerifyHash(settings.key, txnid, settings.salt) });
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
  if (!response.ok) throw new Error("PayU verification failed");
  const payload = await response.json() as { transaction_details?: Record<string, { status?: string; unmappedstatus?: string; mihpayid?: string; amount?: string }> };
  return payload.transaction_details?.[txnid] ?? null;
}
