import { PenLine, Search, CheckCircle2, Download, MapPin, Globe, Briefcase, MessageCircle, Newspaper, Building2 } from "lucide-react";

const steps = [
  {
    icon: PenLine,
    title: "Describe",
    description: "Say what you sell, or who should buy it. The AI turns that prompt into a buyer profile and the searches most likely to find them.",
  },
  {
    icon: Search,
    title: "Scan",
    description: "We search Google Maps and the public web at once: Google, LinkedIn, Reddit, blogs, news, directories, and company sites.",
  },
  {
    icon: CheckCircle2,
    title: "Rank",
    description: "A scoring model weighs buyer fit, public buying signals, and how easy they are to reach, then explains why each one made the list.",
  },
  {
    icon: Download,
    title: "Export",
    description: "Open a ranked table, keep the best fits, and export CSV straight into your outreach.",
  },
];

const sources = [
  { icon: MapPin, name: "Google Maps", detail: "Local businesses, ratings, phones, and addresses." },
  { icon: Globe, name: "Google", detail: "Company pages and the rest of the open web." },
  { icon: Briefcase, name: "LinkedIn", detail: "Hiring posts and public company updates." },
  { icon: MessageCircle, name: "Reddit", detail: "Threads where buyers describe the problem." },
  { icon: Newspaper, name: "Blogs and news", detail: "Launches, expansions, and operating pain." },
  { icon: Building2, name: "Company sites", detail: "The pages that show who they are and how to reach them." },
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
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            One prompt in. A ranked list of buyers out. The scan covers the places your next client already shows up.
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

        <div className="premium-card mt-10 p-5 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Where we look</p>
              <h3 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">Every public clue, in one pass</h3>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Maps finds the business. The web finds the reason they might buy now.
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => (
              <div key={source.name} className="flex gap-3 rounded-xl border border-border/70 bg-background/40 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <source.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{source.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{source.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
