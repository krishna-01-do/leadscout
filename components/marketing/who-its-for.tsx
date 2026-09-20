import { Code2, User, Search, Target, Phone, Megaphone } from "lucide-react";

const audiences = [
  { icon: Code2, label: "Web development agencies" },
  { icon: User, label: "Freelancers" },
  { icon: Search, label: "SEO agencies" },
  { icon: Target, label: "Lead-generation agencies" },
  { icon: Phone, label: "Appointment setters" },
  { icon: Megaphone, label: "Marketing agencies" },
];

export function WhoItsFor() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight">
          Who It's For
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Built for anyone who needs to find local business prospects.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((a) => (
            <div
              key={a.label}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <a.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{a.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
