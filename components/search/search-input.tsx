"use client";

import { useState, useCallback } from "react";
import { Search, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const promptChips = [
  "I build appointment automation for clinics",
  "I sell review follow-ups to restaurants",
  "Find gyms that need booking software",
  "Local clinics for a marketing agency",
];

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

interface SearchInputProps {
  onSearch: (prompt: string, filters: AdvancedFilters | null) => void;
  loading: boolean;
  disabled?: boolean;
}

export function SearchInput({ onSearch, loading, disabled }: SearchInputProps) {
  const [prompt, setPrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>({
    businessCategory: "",
    location: "",
    minRating: "",
    maxRating: "",
    minReviews: "",
    maxReviews: "",
    websiteCondition: "ANY",
    phoneRequired: false,
    emailRequired: false,
    resultLimit: "25",
  });

  const handleSearch = useCallback(() => {
    if (!prompt.trim() || loading || disabled) return;
    onSearch(prompt.trim(), filters);
  }, [prompt, loading, disabled, onSearch, filters]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you sell, and who do you want to sell it to?"
          className="max-h-48 min-h-[120px] resize-none overflow-y-auto border-2 pr-12 text-base leading-relaxed [overflow-wrap:break-word]"
          disabled={disabled}
        />
        <Search className="absolute right-4 top-4 h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {promptChips.map((chip) => (
          <button
            key={chip}
            onClick={() => setPrompt(chip)}
            disabled={disabled}
            className="max-w-full rounded-full border border-border/60 bg-card px-3 py-1.5 text-left text-xs leading-snug text-muted-foreground transition-colors [overflow-wrap:normal] hover:border-primary/40 hover:text-foreground disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={disabled}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Advanced filters
        </button>

        <Button
          onClick={handleSearch}
          disabled={!prompt.trim() || loading || disabled}
          size="lg"
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Find Clients
            </>
          )}
        </Button>
      </div>

      {showAdvanced && (
        <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="target-business-type" className="text-xs">Client type</Label>
              <Input
                id="target-business-type"
                value={filters.businessCategory}
                onChange={(e) => setFilters({ ...filters, businessCategory: e.target.value })}
                placeholder="Optional, e.g., dental clinics"
                className="h-11 text-base sm:h-9 sm:text-sm"
                disabled={disabled}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="target-location" className="text-xs">Location</Label>
              <Input
                id="target-location"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                placeholder="Optional, e.g., Hyderabad"
                className="h-11 text-base sm:h-9 sm:text-sm"
                disabled={disabled}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Website Status</Label>
              <Select
                value={filters.websiteCondition}
                onValueChange={(v) => setFilters({ ...filters, websiteCondition: v })}
              >
                <SelectTrigger className="h-11 text-base sm:h-9 sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANY">Any</SelectItem>
                  <SelectItem value="MISSING">Missing</SelectItem>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="MISSING_OR_POOR">Missing or Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Min Rating</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={filters.minRating}
                onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
                placeholder="e.g., 4.0"
                className="h-11 text-base sm:h-9 sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Min Reviews</Label>
              <Input
                type="number"
                min="0"
                value={filters.minReviews}
                onChange={(e) => setFilters({ ...filters, minReviews: e.target.value })}
                placeholder="e.g., 50"
                className="h-11 text-base sm:h-9 sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Result Count</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={filters.resultLimit}
                onChange={(e) => setFilters({ ...filters, resultLimit: e.target.value })}
                className="h-11 text-base sm:h-9 sm:text-sm"
              />
            </div>

            <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border/60 px-3 sm:justify-start sm:border-0 sm:px-0">
              <Label className="text-sm sm:text-xs">Phone required</Label>
              <Switch
                checked={filters.phoneRequired}
                onCheckedChange={(v) => setFilters({ ...filters, phoneRequired: v })}
              />
            </div>

            <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border/60 px-3 sm:justify-start sm:border-0 sm:px-0">
              <Label className="text-sm sm:text-xs">Email required</Label>
              <Switch
                checked={filters.emailRequired}
                onCheckedChange={(v) => setFilters({ ...filters, emailRequired: v })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
