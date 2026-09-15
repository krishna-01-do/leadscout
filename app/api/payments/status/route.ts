import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { reconcilePayUPayment } from "@/lib/payments/process-payu";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const txnid = z.string().min(8).max(50).safeParse(request.nextUrl.searchParams.get("txnid"));
  if (!txnid.success) return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
  const db = createSupabaseAdmin();
  const { data: existing, error: existingError } = await db.from("payments")
    .select("status,plan,completed_at").eq("txnid", txnid.data).eq("user_id", user.id).maybeSingle();
  if (existingError || !existing) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (existing.status === "pending") await reconcilePayUPayment(txnid.data, user.id);
  const { data, error } = await db.from("payments").select("status,plan,completed_at")
    .eq("txnid", txnid.data).eq("user_id", user.id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json({ payment: data }, { headers: { "Cache-Control": "private, no-store" } });
}
