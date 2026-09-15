import { NextRequest, NextResponse } from "next/server";
import { generateCsv } from "@/lib/export/csv";
import { getSearchResults } from "@/lib/services/search-service";
import { requireUser } from "@/lib/supabase/server";
import { z } from "zod";

const selectedIdsSchema = z.array(z.string().uuid()).max(100);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const parsedId = z.string().uuid().safeParse((await params).id);
    if (!parsedId.success) return NextResponse.json({ error: "Invalid search ID" }, { status: 400 });

    const selectedValue = new URL(request.url).searchParams.get("selected");
    const selected = selectedIdsSchema.safeParse(selectedValue?.split(",").filter(Boolean) ?? []);
    if (!selected.success) return NextResponse.json({ error: "Invalid selection" }, { status: 400 });

    const { results, search, error } = await getSearchResults(parsedId.data, user.id);
    if (!search) return NextResponse.json({ error: "Search not found" }, { status: 404 });
    if (error) return NextResponse.json({ error }, { status: 500 });
    const selectedSet = new Set(selected.data);
    const exported = selectedSet.size ? results.filter((result) => selectedSet.has(result.id)) : results;

    return new NextResponse(`\uFEFF${generateCsv(exported)}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="leadscout-export.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
