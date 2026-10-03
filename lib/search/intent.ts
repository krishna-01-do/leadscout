import type { WebsiteCondition } from "@/types";

const placeStop = new Set([
  "which", "that", "with", "who", "where", "without", "not", "having",
  "for", "and", "the", "a", "my", "our", "their", "this", "those", "these",
]);

const buyerSkip = new Set([
  "the", "a", "an", "all", "some", "any", "local", "find", "list", "show",
  "get", "me", "want", "need", "looking", "for", "my", "our", "i", "we",
  "clients", "client", "customers", "customer", "businesses", "business",
  "owners", "owner", "companies", "company", "and", "with", "who", "which",
]);

export function placeFromPrompt(prompt: string): string {
  const match = prompt.match(/\b(?:in|from|around|near|at)\s+([a-z][a-z.'-]{1,}(?:\s+[a-z][a-z.'-]{1,}){0,3})/i);
  if (!match) return "";
  const kept: string[] = [];
  for (const word of match[1].split(/\s+/)) {
    if (placeStop.has(word.toLowerCase())) break;
    kept.push(word);
  }
  const place = kept.join(" ").trim();
  return place.length >= 2 ? place.slice(0, 160) : "";
}

export function buyerFromPrompt(prompt: string): string {
  const match = prompt.match(/\b([a-z][a-z]*(?:\s+[a-z][a-z]*){0,4})\s+(?:in|from|around|near|at)\s+[a-z]/i);
  if (!match) return "";
  const words = match[1].split(/\s+/).filter((word) => !buyerSkip.has(word.toLowerCase()));
  const buyer = words.slice(-3).join(" ").trim();
  return buyer.length >= 3 ? buyer.slice(0, 80) : "";
}

export function websiteFromPrompt(prompt: string): WebsiteCondition | null {
  const text = prompt.toLowerCase();
  if (/no website|without (?:a )?website|not having (?:a )?website|missing website|don'?t have (?:a )?website|does not have (?:a )?website/.test(text)) {
    return "MISSING";
  }
  if (/with (?:a )?website|has (?:a )?website|having (?:a )?website/.test(text)) return "PRESENT";
  return null;
}

export function resultCountFromPrompt(prompt: string): number | null {
  const match = prompt.match(/\b(\d{1,3})\s+(?:results|clients|leads|businesses|places|cafes|owners)\b/i);
  if (!match) return null;
  const count = Number(match[1]);
  if (!Number.isFinite(count)) return null;
  return Math.min(50, Math.max(20, count));
}

export function minimumResultLimit(value: number) {
  if (!Number.isFinite(value)) return 25;
  return Math.min(50, Math.max(20, Math.round(value)));
}
