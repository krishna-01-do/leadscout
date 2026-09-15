import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { reconcilePayUPayment } from "@/lib/payments/process-payu";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createSupabaseAdmin();
  let requestedId = request.nextUrl.searchParams.get("txnid");
  if (!requestedId) {
    const { data: pending, error } = await db.from("payments").select("txnid")
      .eq("user_id", user.id).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return NextResponse.json({ error: "Could not load payment" }, { status: 503 });
    if (!pending) return NextResponse.json({ payment: null }, { headers: { "Cache-Control": "private, no-store" } });
    requestedId = pending.txnid;
  }
  const txnid = z.string().min(8).max(50).safeParse(requestedId);
  if (!txnid.success) return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
  const { data: existing, error: existingError } = await db.from("payments")
    .select("status,plan,completed_at").eq("txnid", txnid.data).eq("user_id", user.id).maybeSingle();
  if (existingError || !existing) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (existing.status !== "success") await reconcilePayUPayment(txnid.data, user.id);
  const { data, error } = await db.from("payments").select("status,plan,completed_at")
    .eq("txnid", txnid.data).eq("user_id", user.id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json({ payment: { ...data, txnid: txnid.data } }, { headers: { "Cache-Control": "private, no-store" } });
}
