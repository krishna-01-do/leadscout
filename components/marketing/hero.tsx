"use client";

import { Search, Star, MapPin, Building2, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const bars = [46, 62, 78, 54, 88, 70, 96, 64, 84, 58, 92, 72, 80, 50];

const sources = ["Google Maps", "Google", "LinkedIn", "Reddit", "Blogs", "News"];

const leads = [
  {
    name: "SmileCraft Dental",
    place: "Baner, Pune",
    rating: "4.8",
    reviews: "214 reviews",
    fit: "96",
    signal: "Hiring a front-desk coordinator on LinkedIn",
    sources: ["Maps", "LinkedIn"],
    note: "Books by phone. Strong buyer for reminders and follow-ups.",
  },
  {
    name: "CityCare Diagnostics",
    place: "Kothrud, Pune",
    rating: "4.6",
    reviews: "128 reviews",
    fit: "91",
    signal: "Blog post about long queues and missed reports",
    sources: ["Maps", "Blog"],
    note: "Busy visit volume. Strong buyer for queue and report automation.",
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="stage-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[min(42rem,120vw)] -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="aurora-bars" aria-hidden>
        {bars.map((height, index) => (
          <span
            key={`bar-${index}`}
            className="aurora-bar"
            style={{
              ["--bar-height" as string]: `${height}%`,
              animationDelay: `${index * 0.22}s`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
        <Badge className="mb-6 border border-cyan-200/20 bg-white/10 px-3 py-1 text-cyan-50 shadow-none backdrop-blur animate-fade-in-up hover:bg-white/10">
          <span className="mr-1.5 flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
          AI buyer matching across the public web
        </Badge>

        <h1 className="font-display animate-fade-in-up text-balance text-4xl leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl" style={{ animationDelay: "0.05s" }}>
          Find the clients
          <br />
          <span className="italic text-cyan-300">most ready to buy</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-cyan-50/75 animate-fade-in-up sm:text-lg" style={{ animationDelay: "0.1s" }}>
          Describe what you sell. ApplyVelocity scans Google Maps, Google, LinkedIn, Reddit, blogs, news, and company sites, then ranks who is most likely to convert.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <Link href="/signup" className="w-full sm:w-auto">
            <Button size="lg" className="w-full rounded-full bg-white text-slate-950 shadow-none hover:bg-cyan-50 sm:w-auto">
              Find Prospects
              <Search className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/#how-it-works" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto">
              See How It Works
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-14 max-w-3xl animate-fade-in-up text-left" style={{ animationDelay: "0.2s" }}>
          <div className="premium-card animate-float overflow-hidden border-white/10 bg-slate-950/55 shadow-2xl shadow-cyan-950/40">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-2.5">
              <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs font-medium text-cyan-100">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                Live match
              </div>
              <span className="text-xs text-cyan-50/60">6 sources · 2 high-fit buyers</span>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 sm:items-center">
                <Search className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200 sm:mt-0" />
                <span className="min-w-0 flex-1 text-left text-sm text-cyan-50/80">
                  I built appointment automation. Find clinics in Pune I can sell it to.
                </span>
                <span className="shrink-0 rounded-full border border-cyan-200/30 px-2 py-0.5 text-xs font-medium text-cyan-200">Pune</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {sources.map((source) => (
                  <span
                    key={source}
                    className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100"
                  >
                    {source}
                  </span>
                ))}
              </div>

              <div className="mt-3 space-y-2">
                {leads.map((lead) => (
                  <div key={lead.name} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-200">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="truncate text-sm font-medium text-white">{lead.name}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-cyan-50/70">
                            <MapPin className="h-3 w-3" />
                            {lead.place}
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                              {lead.rating}
                            </span>
                            <span>{lead.reviews}</span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold leading-none text-emerald-200">{lead.fit}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-emerald-200/70">fit</p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-300/15 px-2 py-0.5 text-[11px] font-medium text-amber-100">
                        <Sparkles className="h-3 w-3" />
                        {lead.signal}
                      </span>
                      {lead.sources.map((source) => (
                        <span key={source} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-cyan-50/70">
                          {source}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-left text-xs text-cyan-50/75">{lead.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
