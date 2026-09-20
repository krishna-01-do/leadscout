"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, History, User, LogOut, Loader2, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers";
import { branding } from "@/lib/branding";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AppNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const navItems = [
    { href: "/app/search", label: "Search", icon: Search },
    { href: "/app/history", label: "History", icon: History },
    { href: "/contact", label: "Contact", icon: MessageCircle },
  ];

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/");
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <Link href="/app/search" className="flex items-center gap-2 font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Search className="h-3.5 w-3.5" />
            </div>
            <span className="hidden sm:inline">{branding.name}</span>
          </Link>

          <nav className="flex items-center gap-0.5 sm:gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors sm:px-3 sm:py-1.5 ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
            <DropdownMenuItem asChild>
              <Link href="/app/account" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
              {signingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
