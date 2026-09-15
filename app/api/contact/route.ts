import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

const messageSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(5000),
});

export async function POST(request: NextRequest) {
  const input = messageSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
  const user = await requireUser(request);
  const { error } = await createSupabaseAdmin().from("contact_messages").insert({ ...input.data, user_id: user?.id ?? null });
  if (error) return NextResponse.json({ error: "We could not send your message. Please email us instead." }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
