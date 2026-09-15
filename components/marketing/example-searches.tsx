"use client";

const examples = [
  "Gyms without websites",
  "Dentists with 100+ reviews",
  "Restaurants without online ordering",
  "Salons with weak websites",
  "Local businesses with no booking system",
  "Clinics rated above 4.5",
  "Cafes with no social media",
  "Auto repair shops without websites",
];

export function ExampleSearches() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight">
          Try searches like these
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Just type what you're looking for. Our AI handles the rest.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {examples.map((ex) => (
            <span
              key={ex}
              className="cursor-default rounded-full border border-border/60 bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {ex}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
