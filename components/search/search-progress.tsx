import { Loader2 } from "lucide-react";
import type { SearchStatus } from "@/types";

const stages: { status: SearchStatus; label: string }[] = [
  { status: "QUEUED", label: "Understanding your offer" },
  { status: "SEARCHING", label: "Searching businesses" },
  { status: "PROCESSING", label: "Matching companies" },
  { status: "SCORING", label: "Ranking opportunities" },
  { status: "COMPLETED", label: "Preparing results" },
];

export function SearchProgress({ currentStatus }: { currentStatus: SearchStatus }) {
  const currentIndex = stages.findIndex((s) => s.status === currentStatus);
  const failed = currentStatus === "FAILED";

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-16">
      <div className="mb-5 flex items-center gap-3 sm:mb-8 sm:justify-center">
        {failed ? (
          <Loader2 className="h-5 w-5 shrink-0 text-destructive" />
        ) : (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
        )}
        <span className="min-w-0 text-base font-medium leading-snug sm:text-lg">
          {failed ? "Search failed" : stages[currentIndex]?.label ?? "Processing..."}
        </span>
      </div>

      <ol className="mx-auto w-full max-w-md space-y-2 md:hidden">
        {stages.map((stage, i) => {
          const isDone = !failed && (i < currentIndex || currentStatus === "COMPLETED");
          const isCurrent = !failed && i === currentIndex && currentStatus !== "COMPLETED";

          return (
            <li
              key={stage.status}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                isDone
                  ? "bg-primary/10 text-primary"
                  : isCurrent
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                {isDone ? "✓" : isCurrent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1 leading-snug [overflow-wrap:normal]">{stage.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="hidden flex-wrap items-center justify-center gap-y-2 md:flex">
        {stages.map((stage, i) => {
          const isDone = !failed && (i < currentIndex || currentStatus === "COMPLETED");
          const isCurrent = !failed && i === currentIndex && currentStatus !== "COMPLETED";

          return (
            <div key={stage.status} className="flex shrink-0 items-center">
              <div
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors [overflow-wrap:normal] ${
                  isDone
                    ? "bg-primary/10 text-primary"
                    : isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone && "✓"}
                {isCurrent && <Loader2 className="h-3 w-3 animate-spin" />}
                {stage.label}
              </div>
              {i < stages.length - 1 && (
                <div className={`mx-1 h-px w-6 ${isDone ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
