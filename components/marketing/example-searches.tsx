"use client";

const examples = [
  "Appointment automation for clinics in Pune",
  "Review follow-ups for restaurants in Mumbai",
  "Booking software for gyms in Bengaluru",
  "Accounting help for retail shops in Jaipur",
  "Hiring software for coaching centres in Delhi",
  "POS systems for cafes in Hyderabad",
  "CRM setup for real-estate agencies in Chennai",
  "WhatsApp support for salons in Ahmedabad",
];

export function ExampleSearches() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight">
          Try searches like these
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Describe the offer, or name the clients. Pick the area and we build the list.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {examples.map((ex) => (
            <span
              key={ex}
              className="cursor-default rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground hover:shadow-md"
            >
              {ex}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
