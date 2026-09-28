"use client";

import { Search, Star, MapPin, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const bars = [46, 62, 78, 54, 88, 70, 96, 64, 84, 58, 92, 72, 80, 50];

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

      <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
        <Badge className="mb-6 border border-cyan-200/20 bg-white/10 px-3 py-1 text-cyan-50 shadow-none backdrop-blur animate-fade-in-up hover:bg-white/10">
          <span className="mr-1.5 flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
          AI-powered prospect discovery
        </Badge>

        <h1 className="font-display animate-fade-in-up text-balance text-4xl leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl" style={{ animationDelay: "0.05s" }}>
          Find your next customers
          <br />
          <span className="italic text-cyan-300">with one prompt.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-balance text-base text-cyan-50/75 animate-fade-in-up sm:text-lg" style={{ animationDelay: "0.1s" }}>
          Describe your business, your service, or the clients you want. We
          find the best client list in the area you choose.
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

        <div className="mx-auto mt-14 max-w-2xl animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="premium-card animate-float border-white/10 bg-slate-950/50 p-4 text-left shadow-2xl shadow-cyan-950/40 sm:p-5">
            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 sm:items-center">
              <Search className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200 sm:mt-0" />
              <span className="min-w-0 flex-1 text-left text-sm text-cyan-50/80">
                I built appointment automation. Find clinics in Pune I can sell it to.
              </span>
              <span className="shrink-0 rounded-full border border-cyan-200/30 px-2 py-0.5 text-xs font-medium text-cyan-200">Pune</span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-200">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium text-white">SmileCraft Dental</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-cyan-50/70">
                        <MapPin className="h-3 w-3" />
                        Baner, Pune
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                          4.8
                        </span>
                        <span>214 reviews</span>
                      </div>
                    </div>
                  </div>
                  <Badge className="shrink-0 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15">96% fit</Badge>
                </div>
                <p className="mt-2 text-left text-xs text-cyan-50/75">Books by phone. A strong buyer for reminders and follow-ups.</p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-200">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium text-white">CityCare Diagnostics</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-cyan-50/70">
                        <MapPin className="h-3 w-3" />
                        Kothrud, Pune
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                          4.6
                        </span>
                        <span>128 reviews</span>
                      </div>
                    </div>
                  </div>
                  <Badge className="shrink-0 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/15">91% fit</Badge>
                </div>
                <p className="mt-2 text-left text-xs text-cyan-50/75">Busy visit volume. A strong buyer for queue and report automation.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
