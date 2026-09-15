import { MessageSquare, MapPin, Filter, Gauge, Phone, FileDown, History, Globe } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Natural-language prospect search",
    description: "Describe what you want in plain English. No complex filters or operators.",
  },
  {
    icon: MapPin,
    title: "Local business discovery",
    description: "Search across Google Maps data for businesses in any city or region.",
  },
  {
    icon: Filter,
    title: "Smart filtering",
    description: "Filter by rating, reviews, website status, phone availability, and more.",
  },
  {
    icon: Gauge,
    title: "Opportunity scoring",
    description: "Every prospect gets a match score so you know which leads to prioritize.",
  },
  {
    icon: Phone,
    title: "Contact details",
    description: "Get phone numbers, emails, and addresses for every prospect.",
  },
  {
    icon: FileDown,
    title: "CSV export",
    description: "Export selected leads or all results to CSV for your outreach workflow.",
  },
  {
    icon: History,
    title: "Search history",
    description: "Revisit past searches and results without running a new provider search.",
  },
  {
    icon: Globe,
    title: "Website status detection",
    description: "Identify businesses without websites — your strongest sales opportunities.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Core Features
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need to find and qualify local business prospects.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-sm">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
