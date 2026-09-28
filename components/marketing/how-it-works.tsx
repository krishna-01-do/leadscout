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
          <p className="section-kicker">Workflow</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 text-muted-foreground">
            From prompt to qualified prospect list in four steps.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="premium-card relative p-5 text-left sm:text-center">
              <div className="mb-4 flex items-center justify-between sm:justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold tracking-[0.18em] text-primary/70 sm:absolute sm:right-4 sm:top-4">
                  0{i + 1}
                </span>
              </div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
