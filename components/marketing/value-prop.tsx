import { Clock, Zap, ArrowRight } from "lucide-react";

export function ValueProp() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-muted/50 to-card p-8 sm:p-12">
          <div className="grid items-center gap-8 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">Instead of</span>
              </div>
              <p className="mt-2 text-lg font-medium text-muted-foreground line-through decoration-muted-foreground/40">
                Hours searching Google Maps manually
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-primary">
                <Zap className="h-5 w-5" />
                <span className="text-sm font-medium">Use</span>
              </div>
              <p className="mt-2 text-xl font-bold">
                One prompt → qualified list
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <span>Stop scrolling through Google Maps</span>
            <ArrowRight className="h-4 w-4" />
            <span className="font-medium text-foreground">Start closing deals</span>
          </div>
        </div>
      </div>
    </section>
  );
}
