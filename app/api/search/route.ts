import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { parseSearchPrompt } from "@/lib/ai/query-parser";
import { createSearch, processSearch } from "@/lib/services/search-service";
import { checkSearchQuota } from "@/lib/usage/service";
import { createSearchRequestSchema } from "@/schemas/search";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSearchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quota = await checkSearchQuota(user.id);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: quota.reason ?? "Search quota exceeded",
          quotaExceeded: true,
          plan: quota.plan,
        },
        { status: 403 }
      );
    }

    const parseResult = await parseSearchPrompt(parsed.data.prompt);

    if (parseResult.error || !parseResult.query) {
      return NextResponse.json(
        { error: parseResult.error ?? "Failed to parse search prompt" },
        { status: 422 }
      );
    }

    const { searchId, error } = await createSearch(user.id, parsed.data.prompt, parseResult.query);

    if (error || !searchId) {
      return NextResponse.json(
        { error: error ?? "Failed to create search" },
        { status: 500 }
      );
    }

    processSearch(searchId).catch((err) => {
      console.error("Search processing failed:", err);
    });

    return NextResponse.json({ searchId, parsedQuery: parseResult.query });
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
