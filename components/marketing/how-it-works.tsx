import { PenLine, Search, CheckCircle2, Download } from "lucide-react";

const steps = [
  {
    icon: PenLine,
    title: "Describe",
    description: "Tell us what businesses you're looking for in plain English. No filters or operators needed.",
  },
  {
    icon: Search,
    title: "Search",
    description: "We search across local business directories and Google Maps data to find matching prospects.",
  },
  {
    icon: CheckCircle2,
    title: "Qualify",
    description: "Each prospect is scored and qualified based on your criteria — website status, rating, reviews, and more.",
  },
  {
    icon: Download,
    title: "Export",
    description: "Review your results in a polished table, then export to CSV for your outreach workflow.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 text-muted-foreground">
            From prompt to qualified prospect list in four steps.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="absolute top-8 left-1/2 hidden h-px w-full bg-border lg:block" />
              )}
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <step.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
