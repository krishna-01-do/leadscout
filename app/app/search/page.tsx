"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, AlertCircle, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/components/providers";
import { createBrowserClient } from "@/lib/supabase/client";
import { SearchInput } from "@/components/search/search-input";
import { SearchProgress } from "@/components/search/search-progress";
import { ResultsTable } from "@/components/results/results-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  BusinessSearchQuery,
  SearchResultRow,
  SearchRecord,
  SearchStatus,
} from "@/types";

interface AdvancedFilters {
  businessCategory: string;
  location: string;
  minRating: string;
  maxRating: string;
  minReviews: string;
  maxReviews: string;
  websiteCondition: string;
  phoneRequired: boolean;
  emailRequired: boolean;
  resultLimit: string;
}

export default function SearchPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatus | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [parsedQuery, setParsedQuery] = useState<BusinessSearchQuery | null>(null);
  const [results, setResults] = useState<SearchResultRow[]>([]);
  const [search, setSearch] = useState<SearchRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [usage, setUsage] = useState<{ searchesUsed: number; searchLimit: number; plan: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!user) return;
    const supabase = createBrowserClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return;

    const res = await fetch("/api/usage", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUsage(data.stats);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchUsage();
  }, [user, fetchUsage]);

  useEffect(() => {
    const existingSearchId = searchParams.get("search");
    if (!user || !existingSearchId) return;

    async function loadExistingSearch() {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;

      try {
        const res = await fetch(`/api/search/${existingSearchId}/results`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.search) {
          setSearchId(data.search.id);
          setParsedQuery(data.search.parsedQuery);
          setSearchStatus(data.search.status);
          setResults(data.results);
          setSearch(data.search);
        }
      } catch {
        // ignore
      }
    }

    loadExistingSearch();
  }, [user, searchParams]);

  const pollSearchStatus = useCallback(
    async (id: string) => {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;

      const poll = async () => {
        let res: Response;
        try {
          res = await fetch(`/api/search/${id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        } catch {
          return;
        }
        if (!res.ok) {
          if (res.status === 401 || res.status === 404) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setError(res.status === 401 ? "Your session expired. Please sign in again." : "Search not found.");
            setSearchLoading(false);
          }
          return;
        }

        const data = await res.json();
        const status = data.search.status as SearchStatus;
        setSearchStatus(status);

        if (status === "COMPLETED" || status === "FAILED") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;

          if (status === "COMPLETED") {
            const resultsRes = await fetch(`/api/search/${id}/results`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (resultsRes.ok) {
              const resultsData = await resultsRes.json();
              setResults(resultsData.results);
              setSearch(resultsData.search);
            }
            fetchUsage();
          } else if (status === "FAILED") {
            setError(data.search.errorMessage ?? "Search failed. Please try again.");
          }
          setSearchLoading(false);
        }
      };

      poll();
      pollRef.current = setInterval(poll, 3000);
    },
    [fetchUsage]
  );

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleSearch(prompt: string, filters: AdvancedFilters | null) {
    setError(null);
    setQuotaExceeded(false);
    setResults([]);
    setSearch(null);
    setSearchLoading(true);
    setSearchStatus("QUEUED");

    const supabase = createBrowserClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) {
      setSearchLoading(false);
      setSearchStatus(null);
      router.push("/login");
      return;
    }

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt,
          filters,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.quotaExceeded) {
          setQuotaExceeded(true);
          setSearchLoading(false);
          setSearchStatus(null);
          return;
        }
        setError(data.error ?? "Failed to start search");
        setSearchLoading(false);
        setSearchStatus(null);
        return;
      }

      setSearchId(data.searchId);
      setParsedQuery(data.parsedQuery);
      pollSearchStatus(data.searchId);
    } catch {
      setError("Network error. Please try again.");
      setSearchLoading(false);
      setSearchStatus(null);
    }
  }

  async function handleExport(selectedOnly: boolean) {
    if (!searchId) return;
    setExporting(true);

    const supabase = createBrowserClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) return;

    try {
      const selectedParam = selectedOnly
        ? `?selected=${Array.from(selectedIds).join(",")}`
        : "";
      const res = await fetch(`/api/search/${searchId}/export${selectedParam}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        setError("Failed to export CSV.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leadscout-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export CSV.");
    } finally {
      setExporting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Find Prospects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe the businesses you want to target. We'll find, research, and qualify them for you.
        </p>
      </div>

      {usage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant={usage.searchesUsed >= usage.searchLimit ? "destructive" : "secondary"}>
            {usage.searchesUsed} / {usage.searchLimit} searches used
          </Badge>
          <span className="capitalize">Plan: {usage.plan}</span>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <SearchInput onSearch={handleSearch} loading={searchLoading} disabled={quotaExceeded} />
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Please refine your prompt and try again.
            </p>
          </div>
        </div>
      )}

      {quotaExceeded && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">You've used your free lead search.</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Upgrade to continue finding qualified prospects with unlimited searches.
          </p>
          <Button className="mt-6" onClick={() => router.push("/app/account")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Upgrade to Continue
          </Button>
        </div>
      )}

      {searchLoading && searchStatus && !quotaExceeded && (
        <div className="rounded-2xl border border-border/60 bg-card">
          <SearchProgress currentStatus={searchStatus} />
        </div>
      )}

      {parsedQuery && !searchLoading && searchStatus === "COMPLETED" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-2">Search Interpretation</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <Search className="mr-1 h-3 w-3" />
                {parsedQuery.businessCategory}
              </Badge>
              <Badge variant="secondary">{parsedQuery.location}</Badge>
              {parsedQuery.minRating !== null && (
                <Badge variant="secondary">Min rating: {parsedQuery.minRating}</Badge>
              )}
              {parsedQuery.minReviews !== null && (
                <Badge variant="secondary">Min reviews: {parsedQuery.minReviews}</Badge>
              )}
              {parsedQuery.websiteCondition !== "ANY" && (
                <Badge variant="secondary">Website: {parsedQuery.websiteCondition.toLowerCase()}</Badge>
              )}
            </div>
          </div>

          {results.length > 0 ? (
            <ResultsTable 
              results={results} 
              onExport={handleExport} 
              exporting={exporting}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card py-16 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold">No results found</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Try broadening your search criteria or using a different location.
              </p>
            </div>
          )}
        </div>
      )}

      {searchStatus === "FAILED" && !searchLoading && !quotaExceeded && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 py-16 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Search Failed</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {search?.errorMessage ?? "Something went wrong. Please try again."}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearchStatus(null);
              setError(null);
            }}
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
