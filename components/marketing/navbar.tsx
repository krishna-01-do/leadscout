"use client";

import Link from "next/link";
import { Search, Menu, X, User, Loader2 } from "lucide-react";
import { useState } from "react";
import { branding } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers";

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const accountActions = loading ? <Loader2 aria-label="Loading account" className="h-4 w-4 animate-spin" /> : user ? (
    <>
      <Link href="/app/account" onClick={() => setOpen(false)}><Button variant="ghost" size="sm"><User className="mr-2 h-4 w-4" />Account</Button></Link>
      <Link href="/app/search" onClick={() => setOpen(false)}><Button size="sm">Find Leads</Button></Link>
    </>
  ) : (
    <>
      <Link href="/login" onClick={() => setOpen(false)}><Button variant="ghost" size="sm">Log In</Button></Link>
      <Link href="/signup" onClick={() => setOpen(false)}><Button size="sm">Get Started</Button></Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2 text-base font-semibold sm:text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Search className="h-4 w-4" />
          </div>
          <span className="truncate">{branding.name}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </Link>
          <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            FAQ
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {accountActions}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="flex flex-col gap-4 px-4 py-4">
            <Link href="/#how-it-works" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">
              How It Works
            </Link>
            <Link href="/#features" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="/#pricing" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/#faq" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">
              FAQ
            </Link>
            <div className="flex flex-wrap gap-2 pt-2">
              {accountActions}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
