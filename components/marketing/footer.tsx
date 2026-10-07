import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { branding } from "@/lib/branding";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Search className="h-3.5 w-3.5" />
            </div>
            {branding.name}
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm text-muted-foreground">
            <Link href="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link>
            <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="/#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/#faq" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Log In</Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://maidensail.com/startup/applyvelocity"
              rel="dofollow noopener noreferrer"
              target="_blank"
              aria-label="ApplyVelocity featured on Maidensail"
              className="shrink-0"
            >
              <Image
                src="https://maidensail.com/badge/applyvelocity.svg"
                alt="Featured on Maidensail"
                width={176}
                height={44}
                className="h-11 max-w-full object-contain"
              />
            </a>
            <a
              href="https://viberank.dev/apps/ApplyVelocity"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <img
                src="https://viberank.dev/badge?app=ApplyVelocity&theme=dark"
                alt="ApplyVelocity on VibeRank"
                className="h-11 w-auto"
              />
            </a>
            <a
              href="https://www.producthunt.com/products/applyvelocity?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-applyvelocity"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <img
                alt="ApplyVelocity - Find the clients most ready to buy with one prompt | Product Hunt"
                width={250}
                height={54}
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1272366&theme=neutral&t=1791389553221"
              />
            </a>
        </div>

        <div className="mt-8 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {branding.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
