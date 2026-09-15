import { Loader2 } from "lucide-react";
import type { SearchStatus } from "@/types";

const stages: { status: SearchStatus; label: string }[] = [
  { status: "QUEUED", label: "Queued" },
  { status: "SEARCHING", label: "Finding businesses" },
  { status: "PROCESSING", label: "Researching prospects" },
  { status: "SCORING", label: "Qualifying matches" },
  { status: "COMPLETED", label: "Preparing results" },
];

export function SearchProgress({ currentStatus }: { currentStatus: SearchStatus }) {
  const currentIndex = stages.findIndex((s) => s.status === currentStatus);
  const failed = currentStatus === "FAILED";

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="flex items-center gap-3 mb-8">
        {failed ? (
          <Loader2 className="h-5 w-5 text-destructive" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        <span className="text-lg font-medium">
          {failed ? "Search failed" : stages[currentIndex]?.label ?? "Processing..."}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {stages.map((stage, i) => {
          const isDone = !failed && (i < currentIndex || currentStatus === "COMPLETED");
          const isCurrent = !failed && i === currentIndex && currentStatus !== "COMPLETED";

          return (
            <div key={stage.status} className="flex items-center">
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors ${
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
