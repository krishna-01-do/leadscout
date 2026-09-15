"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function PayUCheckoutButton({ plan }: { plan: "starter" | "pro" }) {
  const { session } = useAuth(); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [phone, setPhone] = useState(""); const [open, setOpen] = useState(false);
  async function checkout() {
    if (!session) return; setLoading(true); setError("");
    const response = await fetch("/api/payments/payu/checkout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ plan, phone }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error ?? "Could not start checkout."); setLoading(false); return; }
    const form = document.createElement("form"); form.method = "POST"; form.action = body.endpoint;
    Object.entries(body.fields as Record<string, string>).forEach(([name, value]) => { const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; form.appendChild(input); });
    document.body.appendChild(form); form.submit();
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="sm" className="mt-3 w-full">Upgrade with PayU</Button></DialogTrigger>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Continue to PayU</DialogTitle><DialogDescription>PayU requires a valid mobile number for payment security and fraud prevention.</DialogDescription></DialogHeader>
      <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="Mobile number" aria-label="Mobile number for PayU checkout" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" />
      <Button className="w-full" onClick={checkout} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Continue to secure checkout</Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </DialogContent>
  </Dialog>;
}
