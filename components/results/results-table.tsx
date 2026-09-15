"use client";

import { useState, useMemo } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  Globe,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Download,
  Search,
  Filter,
  X,
} from "lucide-react";
import type { SearchResultRow, OpportunityFlag } from "@/types";
import { getScoreLabel } from "@/lib/scoring/engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";

type SortField = "matchScore" | "rating" | "reviewCount" | "name";
type SortDir = "asc" | "desc";

const flagLabels: Record<OpportunityFlag, string> = {
  NO_WEBSITE: "No Website",
  WEBSITE_PRESENT: "Website Present",
  PHONE_AVAILABLE: "Phone Available",
  EMAIL_AVAILABLE: "Email Available",
  HIGH_RATING: "High Rating",
  HIGH_REVIEW_COUNT: "High Reviews",
  LOW_REVIEW_COUNT: "Low Reviews",
  NO_ONLINE_BOOKING: "No Booking",
  NO_ONLINE_ORDERING: "No Ordering",
};

interface ResultsTableProps {
  results: SearchResultRow[];
  onExport: (selectedOnly: boolean) => void;
  exporting: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function ResultsTable({ results, onExport, exporting, selectedIds, onSelectionChange }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>("matchScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [filterWebsite, setFilterWebsite] = useState<string>("all");
  const [filterMinScore, setFilterMinScore] = useState<string>("0");
  const [filterFlag, setFilterFlag] = useState<string>("all");
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set());
  const [detailRow, setDetailRow] = useState<SearchResultRow | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const selected = selectedIds ?? localSelected;
  const setSelected = (next: Set<string>) => {
    if (onSelectionChange) onSelectionChange(next);
    else setLocalSelected(next);
   };

  const filtered = useMemo(() => {
    let r = [...results];

    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (row) =>
          row.business.name.toLowerCase().includes(q) ||
          row.business.category?.toLowerCase().includes(q) ||
          row.business.city?.toLowerCase().includes(q) ||
          row.business.address?.toLowerCase().includes(q)
      );
    }

    if (filterWebsite === "no") r = r.filter((row) => !row.business.website);
    else if (filterWebsite === "yes") r = r.filter((row) => row.business.website);

    const minScore = parseInt(filterMinScore);
    if (minScore > 0) r = r.filter((row) => row.matchScore >= minScore);

    if (filterFlag !== "all") {
      r = r.filter((row) => row.opportunityFlags.includes(filterFlag as OpportunityFlag));
    }

    r.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.business.name.localeCompare(b.business.name);
      } else if (sortField === "matchScore") {
        cmp = a.matchScore - b.matchScore;
      } else if (sortField === "rating") {
        cmp = (a.business.rating ?? 0) - (b.business.rating ?? 0);
      } else if (sortField === "reviewCount") {
        cmp = (a.business.reviewCount ?? 0) - (b.business.reviewCount ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return r;
  }, [results, search, filterWebsite, filterMinScore, filterFlag, sortField, sortDir]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someSelected = filtered.some((r) => selected.has(r.id));

  function toggleSelectAll() {
    if (allSelected) {
      const next = new Set(selected);
      filtered.forEach((r) => next.delete(r.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((r) => next.add(r.id));
      setSelected(next);
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search within results..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <span className="text-xs text-muted-foreground">
              {selected.size} selected
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport(true)}
            disabled={selected.size === 0 || exporting}
            className="h-9"
          >
            <Download className="h-3.5 w-3.5" />
            Export Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport(false)}
            disabled={exporting}
            className="h-9"
          >
            <Download className="h-3.5 w-3.5" />
            Export All
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Website:</span>
            <Select value={filterWebsite} onValueChange={setFilterWebsite}>
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="no">No website</SelectItem>
                <SelectItem value="yes">Has website</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Min Score:</span>
            <Select value={filterMinScore} onValueChange={setFilterMinScore}>
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All</SelectItem>
                <SelectItem value="60">60+</SelectItem>
                <SelectItem value="75">75+</SelectItem>
                <SelectItem value="90">90+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Flag:</span>
            <Select value={filterFlag} onValueChange={setFilterFlag}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All flags</SelectItem>
                {Object.entries(flagLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterWebsite("all");
              setFilterMinScore("0");
              setFilterFlag("all");
            }}
            className="h-8"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "result" : "results"}
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b border-border/60">
                <th className="w-10 p-3">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th
                  className="cursor-pointer p-3 text-left font-medium hover:text-foreground"
                  onClick={() => toggleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    Business
                    <SortIcon field="name" />
                  </div>
                </th>
                <th className="p-3 text-left font-medium">Category</th>
                <th className="p-3 text-left font-medium">Location</th>
                <th className="p-3 text-left font-medium">Phone</th>
                <th className="p-3 text-left font-medium">Website</th>
                <th
                  className="cursor-pointer p-3 text-left font-medium hover:text-foreground"
                  onClick={() => toggleSort("rating")}
                >
                  <div className="flex items-center gap-1">
                    Rating
                    <SortIcon field="rating" />
                  </div>
                </th>
                <th
                  className="cursor-pointer p-3 text-left font-medium hover:text-foreground"
                  onClick={() => toggleSort("reviewCount")}
                >
                  <div className="flex items-center gap-1">
                    Reviews
                    <SortIcon field="reviewCount" />
                  </div>
                </th>
                <th
                  className="cursor-pointer p-3 text-left font-medium hover:text-foreground"
                  onClick={() => toggleSort("matchScore")}
                >
                  <div className="flex items-center gap-1">
                    Match
                    <SortIcon field="matchScore" />
                  </div>
                </th>
                <th className="p-3 text-left font-medium">Opportunity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const scoreLabel = getScoreLabel(row.matchScore);
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border/40 transition-colors hover:bg-muted/30 cursor-pointer"
                    onClick={() => setDetailRow(row)}
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggleSelect(row.id)}
                      />
                    </td>
                    <td className="p-3 font-medium">{row.business.name}</td>
                    <td className="p-3 text-muted-foreground">{row.business.category ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {row.business.city ?? row.business.address ?? "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {row.business.phone ?? "—"}
                    </td>
                    <td className="p-3">
                      {row.business.website ? (
                        <a
                          href={row.business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="h-3.5 w-3.5" />
                          Visit
                        </a>
                      ) : (
                        <Badge variant="outline" className="text-xs text-destructive">
                          No Website
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {row.business.rating !== null ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {row.business.rating.toFixed(1)}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {row.business.reviewCount ?? "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-semibold ${scoreLabel.color}`}>
                          {row.matchScore}%
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {row.opportunityFlags.slice(0, 2).map((flag) => (
                          <Badge key={flag} variant="secondary" className="text-xs">
                            {flagLabels[flag]}
                          </Badge>
                        ))}
                        {row.opportunityFlags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{row.opportunityFlags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-sm">No results match your filters.</p>
            <p className="mt-1 text-xs">Try clearing filters or adjusting your search.</p>
          </div>
        )}
      </div>

      <Sheet open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {detailRow && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{detailRow.business.name}</SheetTitle>
                <SheetDescription className="text-left">
                  {detailRow.qualificationReason}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-bold ${getScoreLabel(detailRow.matchScore).color}`}>
                    {detailRow.matchScore}%
                  </div>
                  <Badge variant="secondary">
                    {getScoreLabel(detailRow.matchScore).label}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {detailRow.business.category && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Category</span>
                      <span className="text-sm font-medium">{detailRow.business.category}</span>
                    </div>
                  )}

                  {detailRow.business.address && (
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> Address
                      </span>
                      <span className="text-sm font-medium text-right">{detailRow.business.address}</span>
                    </div>
                  )}

                  {detailRow.business.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> Phone
                      </span>
                      <span className="text-sm font-medium">{detailRow.business.phone}</span>
                    </div>
                  )}

                  {detailRow.business.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> Email
                      </span>
                      <span className="text-sm font-medium">{detailRow.business.email}</span>
                    </div>
                  )}

                  {detailRow.business.website && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" /> Website
                      </span>
                      <a
                        href={detailRow.business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {detailRow.business.rating !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rating</span>
                      <span className="text-sm font-medium flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {detailRow.business.rating.toFixed(1)} ({detailRow.business.reviewCount} reviews)
                      </span>
                    </div>
                  )}

                  {detailRow.business.googleMapsUrl && (
                    <a
                      href={detailRow.business.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      View on Google Maps
                    </a>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Opportunity Flags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailRow.opportunityFlags.map((flag) => (
                      <Badge key={flag} variant="secondary">
                        {flagLabels[flag]}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Qualification</p>
                  <p className="text-sm">{detailRow.qualificationReason}</p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
