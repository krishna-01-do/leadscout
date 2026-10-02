import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What does ApplyVelocity actually do?",
    a: "You describe what you sell, or who should buy it. ApplyVelocity searches Google Maps and the public web — Google, LinkedIn, Reddit, blogs, news, and company sites — then ranks the clients most likely to convert. You filter, sort, and export the list to CSV.",
  },
  {
    q: "Which sources does a search cover?",
    a: "Google Maps when you name a place, plus open-web results that can include Google pages, LinkedIn, Reddit, blogs, news, directories, and company websites. Public contact details are kept when they exist. We do not invent emails or phone numbers.",
  },
  {
    q: "What is an 'opportunity score'?",
    a: "Every prospect gets a score from 0 to 100. The model weighs how well they match the buyer profile, whether public pages show a buying signal such as hiring or expansion, and how reachable they are. The note beside each result explains the match.",
  },
  {
    q: "Can I export the results?",
    a: "Yes. You can export selected leads or all results to a CSV file with all the business details, match score, opportunity flags, and qualification reason.",
  },
  {
    q: "Is there a free trial?",
    a: "No free searches. Create an account, verify your email or sign up with Google, then start the monthly plan to find prospects.",
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
