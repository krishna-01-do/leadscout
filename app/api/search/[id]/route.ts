import { NextRequest, NextResponse } from "next/server";
import { getSearchResults, recoverSearch } from "@/lib/services/search-service";
import { requireUser } from "@/lib/supabase/server";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const parsedId = z.string().uuid().safeParse((await params).id);
    if (!parsedId.success) return NextResponse.json({ error: "Invalid search ID" }, { status: 400 });

    await recoverSearch(parsedId.data, user.id);
    const { search } = await getSearchResults(parsedId.data, user.id);
    if (!search) return NextResponse.json({ error: "Search not found" }, { status: 404 });
    return NextResponse.json({ search }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to fetch search" }, { status: 500 });
  }
}
