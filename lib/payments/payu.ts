import "server-only";

import { createHash, randomBytes } from "crypto";
import { pricing } from "@/lib/branding";

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

function sha512(value: string) { return createHash("sha512").update(value).digest("hex"); }

export function checkoutHash(input: { txnid: string; amount: string; productinfo: string; firstname: string; email: string }) {
  const settings = config();
  if (!settings) throw new Error("PayU is not configured");
  return sha512(`${settings.key}|${input.txnid}|${input.amount}|${input.productinfo}|${input.firstname}|${input.email}|||||||||||${settings.salt}`);
}

export function validResponseHash(values: Record<string, string>) {
  const settings = config();
  if (!settings || !values.hash || values.key !== settings.key) return false;
  const expected = sha512(`${settings.salt}|${values.status}||||||${values.udf5 ?? ""}|${values.udf4 ?? ""}|${values.udf3 ?? ""}|${values.udf2 ?? ""}|${values.udf1 ?? ""}|${values.email ?? ""}|${values.firstname ?? ""}|${values.productinfo ?? ""}|${values.amount ?? ""}|${values.txnid ?? ""}|${settings.key}`);
  return expected === values.hash;
}

export async function verifyPayment(txnid: string) {
  const settings = config();
  if (!settings) throw new Error("PayU is not configured");
  const endpoint = settings.testMode ? "https://test.payu.in/merchant/postservice.php?form=2" : "https://info.payu.in/merchant/postservice.php?form=2";
  const body = new URLSearchParams({ key: settings.key, command: "verify_payment", var1: txnid, hash: sha512(`${settings.key}|verify_payment|${txnid}|${settings.salt}`) });
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
  if (!response.ok) throw new Error("PayU verification failed");
  const payload = await response.json() as { transaction_details?: Record<string, { status?: string; mihpayid?: string; amount?: string }> };
  return payload.transaction_details?.[txnid] ?? null;
}
