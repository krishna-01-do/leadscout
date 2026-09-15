import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHmac } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import { contactNotificationConfigured, sendContactNotification } from "@/lib/contact/notify";

const messageSchema = z.object({
  name: z.string().trim().min(2).max(100).regex(/^[^\r\n]+$/),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(150).regex(/^[^\r\n]+$/),
  message: z.string().trim().min(10).max(5000),
  companyWebsite: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > 10_000) return NextResponse.json({ error: "Message is too large" }, { status: 413 });
  const input = messageSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
  if (input.data.companyWebsite) return NextResponse.json({ ok: true }, { status: 201 });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const origin = request.headers.get("origin");
  if (appUrl && (!origin || origin !== new URL(appUrl).origin)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const rateSecret = process.env.CONTACT_RATE_LIMIT_SECRET;
  if (!rateSecret || (process.env.APP_ENV === "production" && !contactNotificationConfigured())) {
    return NextResponse.json({ error: "Contact service is not configured. Please use the support email." }, { status: 503 });
  }
  const user = await requireUser(request);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHmac("sha256", rateSecret).update(forwarded).digest("hex");
  const message = { name: input.data.name, email: input.data.email, subject: input.data.subject, message: input.data.message };
  const db = createSupabaseAdmin();
  const { data: messageId, error } = await db.rpc("submit_contact_message", {
    p_name: message.name, p_email: message.email, p_subject: message.subject,
    p_message: message.message, p_ip_hash: ipHash, p_user_id: user?.id ?? null,
  });
  if (error) {
    const rateLimited = error.message.includes("contact_rate_limit_exceeded");
    return NextResponse.json({ error: rateLimited ? "Too many messages. Please try again later." : "We could not send your message. Please email us instead." }, { status: rateLimited ? 429 : 500 });
  }
  const notified = await sendContactNotification(message).catch(() => false);
  await db.from("contact_messages").update({ notification_status: notified ? "sent" : "failed" }).eq("id", messageId);
  return NextResponse.json({ ok: true, notificationDelayed: !notified }, { status: notified ? 201 : 202 });
}
