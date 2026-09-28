import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What does ApplyVelocity actually do?",
    a: "You describe your business, the service you sell, or the clients you want — for example, 'I built appointment automation. Find clinics in Pune I can sell it to.' You choose the area. We turn that into a scored client list you can filter, sort, and export to CSV.",
  },
  {
    q: "Do I need to know how to scrape Google Maps?",
    a: "No. That's the whole point. You just describe what you're looking for. We handle the search, data normalization, and qualification behind the scenes.",
  },
  {
    q: "What is an 'opportunity score'?",
    a: "Every business gets a match score from 0 to 100 based on how well it fits the clients you asked for — category, location, rating, reviews, and contact availability. The reason next to each result tells you why they belong on the list.",
  },
  {
    q: "Can I export the results?",
    a: "Yes. You can export selected leads or all results to a CSV file with all the business details, match score, opportunity flags, and qualification reason.",
  },
  {
    q: "Is there a free trial?",
    a: "No free trial searches. Create an account, verify your email, and choose Basic, Pro, or Plus to start finding prospects. You can also sign up with Google.",
  },
  {
    q: "Will my old searches rerun and cost me credits?",
    a: "No. Opening a past search from your history loads the stored results without running a new provider search. You only use a search credit when you submit a new prompt.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="section-kicker">Answers</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mt-10">
          <Accordion type="single" collapsible>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
