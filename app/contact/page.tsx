"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { branding } from "@/lib/branding";

export default function ContactPage() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("sending");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    if (response.ok) { setState("sent"); event.currentTarget.reset(); return; }
    const body = await response.json().catch(() => ({})); setMessage(body.error ?? "Something went wrong."); setState("error");
  }
  return <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to {branding.name}</Link>
    <h1 className="mt-8 text-3xl font-bold tracking-tight">Contact us</h1>
    <p className="mt-3 text-muted-foreground">Have a question about ApplyVelocity or need help choosing a plan? Send us a message and we&apos;ll get back to you.</p>
    {supportEmail && <a className="mt-5 flex items-center gap-2 text-sm text-primary hover:underline" href={`mailto:${supportEmail}`}><Mail className="h-4 w-4" /> {supportEmail}</a>}
    <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-border/60 bg-card p-6">
      <input name="companyWebsite" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <input name="name" required minLength={2} placeholder="Your name" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" />
      <input name="email" required type="email" placeholder="you@example.com" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" />
      <input name="subject" required minLength={3} placeholder="How can we help?" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" />
      <textarea name="message" required minLength={10} rows={6} placeholder="Tell us more…" className="w-full rounded-lg border bg-background p-3 text-sm" />
      {state === "sent" && <p className="text-sm text-emerald-600">Thanks — your message has been received.</p>}
      {state === "error" && <p className="text-sm text-destructive">{message}</p>}
      <Button type="submit" disabled={state === "sending"}><Send className="mr-2 h-4 w-4" />{state === "sending" ? "Sending…" : "Send message"}</Button>
    </form>
  </main>;
}
