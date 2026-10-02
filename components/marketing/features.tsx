import { MessageSquare, MapPin, Filter, Gauge, Phone, FileDown, History, Globe } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "One prompt, a buyer profile",
    description: "Describe the offer. AI turns it into who should buy, where they show up, and what to search.",
  },
  {
    icon: Globe,
    title: "Multi-source scan",
    description: "Google Maps, Google, LinkedIn, Reddit, blogs, news, and company sites in the same search.",
  },
  {
    icon: MapPin,
    title: "Local when it matters",
    description: "Name a city and Maps joins the scan, with ratings, reviews, and public contact details.",
  },
  {
    icon: Gauge,
    title: "Conversion ranking",
    description: "Fit, buying signals, and reachability combine into one score so the best calls rise to the top.",
  },
  {
    icon: Filter,
    title: "Signal-first filtering",
    description: "Narrow by rating, reviews, website, phone, and the reason each prospect matched.",
  },
  {
    icon: Phone,
    title: "Public contact details",
    description: "Phone, website, and email when they are already public. Nothing is invented.",
  },
  {
    icon: FileDown,
    title: "CSV export",
    description: "Export selected leads or the full ranked list into the workflow you already use.",
  },
  {
    icon: History,
    title: "Search history",
    description: "Reopen a past list without spending another search.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <p className="section-kicker">Product</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Core Features
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Built to find buyers who can convert, not a dump of every business in a city.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="premium-card group p-5"
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
