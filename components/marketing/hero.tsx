"use client";

import { Search, Star, MapPin, Globe, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute -top-40 left-1/2 h-96 w-[min(800px,130vw)] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
        <Badge variant="secondary" className="mb-6 animate-fade-in-up">
          <span className="mr-1.5 flex h-1.5 w-1.5 rounded-full bg-primary" />
          AI-powered prospect discovery
        </Badge>

        <h1 className="animate-fade-in-up text-balance text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl" style={{ animationDelay: "0.05s" }}>
          Find your next customers
          <br />
          with <span className="gradient-text">one prompt.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Describe the businesses you want to target. We find, research and
          qualify the best prospects for you.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <Link href="/signup" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">
              Find Prospects
              <Search className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/#how-it-works" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              See How It Works
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-12 max-w-2xl animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-lg shadow-primary/5">
            <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/50 px-3 py-2.5 sm:items-center">
              <Search className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground sm:mt-0" />
              <span className="min-w-0 flex-1 text-left text-sm text-muted-foreground">
                Find dental clinics in Hyderabad without a website
              </span>
              <span className="shrink-0 text-xs font-medium text-primary">Try it</span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex flex-col gap-3 rounded-lg border border-border/40 bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium">ABC Dental Clinic</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      Hyderabad
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        4.7
                      </span>
                      <span>186 reviews</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge variant="outline" className="text-xs">No website</Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
                    94% Match
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 p-2.5 text-left">
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 inline h-3 w-3 text-primary" />
                  <span className="font-medium text-foreground">Opportunity:</span>{" "}
                  Strong website-development prospect
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
