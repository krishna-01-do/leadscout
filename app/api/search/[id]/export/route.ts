import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSearchResults } from "@/lib/services/search-service";
import { generateCsv } from "@/lib/export/csv";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const url = new URL(request.url);
    const selectedIds = url.searchParams.get("selected")?.split(",").filter(Boolean);

    const { results, error } = await getSearchResults(params.id, user.id);

    if (error) {
      return NextResponse.json({ error }, { status: 404 });
    }

    const toExport = selectedIds && selectedIds.length > 0
      ? results.filter((r) => selectedIds.includes(r.id))
      : results;

    const csv = generateCsv(toExport);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leadscout-export.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
