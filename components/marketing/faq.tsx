import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What does ApplyVelocity actually do?",
    a: "You describe the businesses you want to target in plain English — like 'Find dental clinics in Hyderabad without a website.' We interpret your prompt, search for matching businesses, score each one based on your criteria, and present the results in a clean table you can filter, sort, and export to CSV.",
  },
  {
    q: "Do I need to know how to scrape Google Maps?",
    a: "No. That's the whole point. You just describe what you're looking for. We handle the search, data normalization, and qualification behind the scenes.",
  },
  {
    q: "What is an 'opportunity score'?",
    a: "Every business in your results gets a match score from 0 to 100 based on how well it meets your criteria — category, location, website status, rating, reviews, and contact availability. This helps you prioritize which prospects to reach out to first.",
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
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently Asked Questions
        </h2>

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
