"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { History, Search, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/providers";
import { createBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SearchRecord } from "@/types";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<SearchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;

      try {
        const res = await fetch("/api/search/history", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch history");
        const data = await res.json();
        setHistory(data.history);
      } catch {
        setError("Failed to load search history.");
      } finally {
        setLoading(false);
      }
    }

    if (user) fetchHistory();
  }, [user]);

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function statusBadge(status: string) {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">Completed</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      case "QUEUED":
      case "SEARCHING":
      case "PROCESSING":
      case "SCORING":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your past searches. Click any search to view its results without re-running the provider.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {history.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card px-4 py-12 text-center sm:py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <History className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No searches yet</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Your search history will appear here. Start by finding your first prospects.
          </p>
          <Button className="mt-6" onClick={() => router.push("/app/search")}>
            <Search className="mr-2 h-4 w-4" />
            Start Searching
          </Button>
        </div>
      ) : (
        <div className="contents">
        <div className="space-y-3 md:hidden">
          {history.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full rounded-xl border border-border/60 bg-card p-4 text-left transition-colors hover:bg-muted/30"
              onClick={() => router.push(`/app/search?search=${item.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 font-medium leading-snug">{item.prompt}</p>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(item.createdAt)}</span>
                <span>{item.resultCount} results</span>
                {statusBadge(item.status)}
              </div>
            </button>
          ))}
        </div>
        <div className="hidden overflow-hidden rounded-xl border border-border/60 md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border/60">
                  <th className="p-3 text-left font-medium">Prompt</th>
                  <th className="p-3 text-left font-medium">Date</th>
                  <th className="p-3 text-left font-medium">Results</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/40 transition-colors hover:bg-muted/30 cursor-pointer"
                    onClick={() => router.push(`/app/search?search=${item.id}`)}
                  >
                    <td className="p-3 font-medium max-w-md truncate">{item.prompt}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(item.createdAt)}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{item.resultCount}</td>
                    <td className="p-3">{statusBadge(item.status)}</td>
                    <td className="p-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
