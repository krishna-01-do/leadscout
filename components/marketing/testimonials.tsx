"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    quote:
      "I used to spend evenings copying dental clinics from Google Maps into a sheet. With ApplyVelocity I typed one prompt for Hyderabad clinics without websites and had a scored list ready the same afternoon. Closed two website projects from that first batch.",
    name: "Ananya Reddy",
    role: "Freelance web designer",
    location: "Hyderabad",
    rating: 5,
  },
  {
    quote:
      "Our appointment setters kept wasting time on gyms that already had solid booking pages. Filtering for phone + weak online presence changed that. The CSV export goes straight into our dialer, so we stopped rebuilding lists every Monday.",
    name: "Rohit Mehra",
    role: "Ops lead, FitCall Appointments",
    location: "Pune",
    rating: 5,
  },
  {
    quote:
      "Honestly expected another vague AI tool. What sold me was the match score. We only call 75%+ leads now and our salon outreach reply rate jumped. Search history is underrated — I reopen last week's Jaipur run without burning another credit.",
    name: "Meera Kapoor",
    role: "Founder, LocalLift Agency",
    location: "Jaipur",
    rating: 5,
  },
  {
    quote:
      "We pitch SEO to clinics and coaching centres across Bangalore. Being able to ask for businesses with lots of reviews but no website is exactly how we find people who already get footfall and still need digital help.",
    name: "Vikram Nair",
    role: "SEO consultant",
    location: "Bengaluru",
    rating: 4,
  },
  {
    quote:
      "Basic plan covers our weekly city sweeps. I run one search per locality, score the list, export the top 20, and hand it to sales. Support also replied within an hour when I asked about result limits — that mattered when we were onboarding the team.",
    name: "Farah Siddiqui",
    role: "Sales manager, Northline Leads",
    location: "Delhi NCR",
    rating: 5,
  },
  {
    quote:
      "Started on Basic for pet clinics in Coimbatore without a website. Got a solid scored list with phones, then moved to Pro once outreach was working. Beats rebuilding those lists manually every week.",
    name: "Arjun Iyer",
    role: "Independent marketer",
    location: "Coimbatore",
    rating: 5,
  },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Testimonials() {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const onSelect = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return;
    setSelectedIndex(carouselApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  useEffect(() => {
    if (!api || isPaused) return;
    const timer = window.setInterval(() => {
      api.scrollNext();
    }, 5500);
    return () => window.clearInterval(timer);
  }, [api, isPaused]);

  return (
    <section
      id="testimonials"
      className="border-y border-border/40 bg-muted/30 py-20 sm:py-28"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What prospectors are saying
          </h2>
          <p className="mt-3 text-muted-foreground">
            How freelancers and agencies describe finding local businesses with{" "}
            {branding.name}.
          </p>
        </div>

        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: true }}
          className="mt-12"
          aria-label="Customer testimonials"
        >
          <CarouselContent className="-ml-3 sm:-ml-4">
            {testimonials.map((item) => (
              <CarouselItem
                key={item.name}
                className="basis-[88%] pl-3 sm:basis-1/2 sm:pl-4 lg:basis-[45%]"
              >
                <figure className="flex h-full min-w-0 flex-col rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
                  <div
                    className="flex items-center gap-0.5"
                    aria-label={`${item.rating} out of 5 stars`}
                  >
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={cn(
                          "h-3.5 w-3.5",
                          index < item.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>

                  <blockquote className="mt-4 flex-1 text-sm leading-6 text-foreground/90">
                    “{item.quote}”
                  </blockquote>

                  <figcaption className="mt-6 flex min-w-0 items-center gap-3 border-t border-border/60 pt-4">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary"
                      aria-hidden
                    >
                      {initials(item.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.role} · {item.location}
                      </p>
                    </div>
                  </figcaption>
                </figure>
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              aria-label="Previous review"
              onClick={() => api?.scrollPrev()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div
              className="flex items-center gap-1.5"
              role="tablist"
              aria-label="Testimonial slides"
            >
              {testimonials.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  role="tab"
                  aria-label={`Show review from ${item.name}`}
                  aria-selected={selectedIndex === index}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    selectedIndex === index
                      ? "w-6 bg-primary"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                  onClick={() => api?.scrollTo(index)}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              aria-label="Next review"
              onClick={() => api?.scrollNext()}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Carousel>
      </div>
    </section>
  );
}
