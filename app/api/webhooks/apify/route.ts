import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { processProviderRun } from "@/lib/services/search-service";
import { z } from "zod";

export const runtime = "nodejs";

const payloadSchema = z.object({
  resource: z.object({ id: z.string().min(1).max(200) }),
}).passthrough();

function secretsMatch(received: string | null, expected: string | undefined) {
  if (!received || !expected || expected.length < 32) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  if (!secretsMatch(request.headers.get("x-leadscout-webhook-secret"), process.env.APIFY_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 64_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    await processProviderRun(parsed.data.resource.id);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
