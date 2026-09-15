"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers";

export function PayUCheckoutButton({ plan }: { plan: "starter" | "pro" }) {
  const { session } = useAuth(); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [phone, setPhone] = useState("");
  async function checkout() {
    if (!session) return; setLoading(true); setError("");
    const response = await fetch("/api/payments/payu/checkout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ plan, phone }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "Could not start checkout."); setLoading(false); return; }
    const form = document.createElement("form"); form.method = "POST"; form.action = body.endpoint;
    Object.entries(body.fields as Record<string, string>).forEach(([name, value]) => { const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; form.appendChild(input); });
    document.body.appendChild(form); form.submit();
  }
  return <div className="mt-3"><input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="Phone number for checkout" aria-label="Phone number for PayU checkout" className="mb-2 h-8 w-full rounded-md border bg-background px-2 text-xs" /><Button size="sm" className="w-full" onClick={checkout} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Upgrade with PayU</Button>{error && <p className="mt-2 text-xs text-destructive">{error}</p>}</div>;
}
