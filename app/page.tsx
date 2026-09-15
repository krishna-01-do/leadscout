import { MarketingNavbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ExampleSearches } from "@/components/marketing/example-searches";
import { WhoItsFor } from "@/components/marketing/who-its-for";
import { Features } from "@/components/marketing/features";
import { ValueProp } from "@/components/marketing/value-prop";
import { Pricing } from "@/components/marketing/pricing";
import { FAQ } from "@/components/marketing/faq";
import { MarketingFooter } from "@/components/marketing/footer";

export default function Home() {
  return (
    <>
      <MarketingNavbar />
      <main>
        <Hero />
        <HowItWorks />
        <ExampleSearches />
        <WhoItsFor />
        <Features />
        <ValueProp />
        <Pricing />
        <FAQ />
      </main>
      <MarketingFooter />
    </>
  );
}
