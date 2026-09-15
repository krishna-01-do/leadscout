import Link from "next/link";
import { Search } from "lucide-react";
import { branding } from "@/lib/branding";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Search className="h-3.5 w-3.5" />
            </div>
            {branding.name}
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link>
            <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="/#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/#faq" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Log In</Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {branding.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
