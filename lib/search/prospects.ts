import { braveWebResultSchema, type BraveWebResult, type ProspectEvidence, type ProspectQualification, type SearchStrategy } from "@/schemas/prospecting";
import { scoreWeights } from "@/lib/search/limits";
import type { NormalizedBusiness } from "@/types";

const ignoredDomains = new Set([
  "google.com", "linkedin.com", "reddit.com", "facebook.com", "instagram.com",
  "indeed.com", "glassdoor.com", "youtube.com", "x.com", "twitter.com",
]);

export function usableWebResults(value: unknown): BraveWebResult[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = braveWebResultSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function normalizedDomain(value: string | null | undefined) {
  if (!value) return "";
  try {
    const url = value.includes("://") ? new URL(value) : new URL(`https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function normalizedName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(incorporated|inc|llc|ltd|limited|pvt|private|co|company)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phoneKey(value: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

export interface MatchResult {
  index: number | null;
  confidence: number;
  reasons: string[];
}

export function matchWebResult(result: BraveWebResult, businesses: NormalizedBusiness[]): MatchResult {
  const domain = normalizedDomain(result.url);
  const title = normalizedName(result.title);
  const description = normalizedName(result.description);
  let best: MatchResult = { index: null, confidence: 0, reasons: [] };

  businesses.forEach((business, index) => {
    const reasons: string[] = [];
    const businessDomain = normalizedDomain(business.website);
    const name = normalizedName(business.name);
    if (domain && businessDomain && domain === businessDomain) reasons.push("same_domain");
    if (name.length > 3 && (title.includes(name) || description.includes(name))) reasons.push("same_company_name");
    const city = business.city?.toLowerCase() ?? "";
    if (city && `${result.title} ${result.description}`.toLowerCase().includes(city)) reasons.push("same_city");
    const phone = phoneKey(business.phone);
    if (phone && result.description.replace(/\D/g, "").includes(phone)) reasons.push("same_phone");

    const domainMatch = reasons.includes("same_domain");
    const nameAndPlace = reasons.includes("same_company_name") && (reasons.includes("same_city") || reasons.includes("same_phone") || domainMatch);
    const exactName = reasons.includes("same_company_name") && title === name;
    if (!domainMatch && !nameAndPlace && !exactName) return;
    const confidence = domainMatch ? 0.95 : exactName ? 0.8 : 0.7;
    if (confidence > best.confidence) best = { index, confidence, reasons };
  });
  return best;
}

function evidenceType(text: string): ProspectEvidence["type"] {
  if (/hir(e|ing)|job opening|now hiring|careers/.test(text)) return "hiring";
  if (/opening|expansion|new location|new warehouse|new branch|expanding/.test(text)) return "expansion";
  if (/discrepanc|manual|complaint|missed calls|stockout|inaccurate/.test(text)) return "pain";
  return "mention";
}

export function evidenceFromResult(result: BraveWebResult): ProspectEvidence {
  const text = `${result.title} ${result.description}`.toLowerCase();
  const type = evidenceType(text);
  return {
    type,
    title: result.title,
    description: result.description,
    sourceUrl: result.url,
    strength: type === "hiring" ? 20 : type === "expansion" || type === "pain" ? 15 : 6,
    provider: "brave",
  };
}

export function looksLikeArticle(title: string) {
  return /^\s*\d+\s+\w+/.test(title) || /\b(how to|ways to|guide to|what is|top \d+|best \d+)\b/i.test(title);
}

function nameFromDomain(domain: string) {
  const brand = domain.split(".")[0]?.replace(/[-_]/g, " ").trim() ?? "";
  if (brand.length < 3 || brand.split(/\s+/).length > 3) return "";
  return brand.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function webOnlyBusiness(result: BraveWebResult, country: string | null): NormalizedBusiness | null {
  const domain = normalizedDomain(result.url);
  const rootDomain = domain.split(".").slice(-2).join(".");
  if (!domain || ignoredDomains.has(domain) || ignoredDomains.has(rootDomain) || looksLikeArticle(result.title)) return null;
  const headline = result.title.split(/[|\-–:]/)[0]?.trim() ?? "";
  const fromTitle = headline.replace(/\b(announces|announced|hiring|is hiring|opens|opening|launches).*/i, "").trim().slice(0, 120);
  const name = fromTitle && fromTitle.split(/\s+/).length <= 8 ? fromTitle : nameFromDomain(domain);
  if (!name) return null;
  return {
    id: "",
    provider: "brave",
    providerBusinessId: `web:${domain}`,
    name,
    category: "Web discovery",
    address: null,
    city: null,
    state: null,
    country,
    latitude: null,
    longitude: null,
    phone: null,
    email: null,
    website: `https://${domain}`,
    rating: null,
    reviewCount: null,
    googleMapsUrl: null,
    openingHours: null,
    socialLinks: null,
    metadata: {},
  };
}

export function looseWebBusiness(result: BraveWebResult, country: string | null): NormalizedBusiness | null {
  let url: URL;
  try {
    url = new URL(result.url);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const domain = normalizedDomain(result.url);
  if (!domain || ignoredDomains.has(domain) || domain.endsWith(".google.com") || looksLikeArticle(result.title)) return null;
  const name = result.title.trim().slice(0, 120) || nameFromDomain(domain);
  if (!name) return null;
  return {
    id: "",
    provider: "brave",
    providerBusinessId: `loose:${result.url}`.slice(0, 200),
    name,
    category: "Possible match",
    address: null,
    city: null,
    state: null,
    country,
    latitude: null,
    longitude: null,
    phone: null,
    email: null,
    website: url.toString(),
    rating: null,
    reviewCount: null,
    googleMapsUrl: null,
    openingHours: null,
    socialLinks: null,
    metadata: { looseMatch: true },
  };
}

function clamp(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

export function qualifyProspect(
  business: NormalizedBusiness,
  strategy: SearchStrategy,
  evidence: ProspectEvidence[],
  location: string
): ProspectQualification {
  const haystack = `${business.name} ${business.category} ${business.city ?? ""} ${business.country ?? ""}`.toLowerCase();
  const types = strategy.idealCustomerProfiles.flatMap((profile) => profile.businessTypes);
  const typeMatch = types.some((type) => haystack.includes(type.toLowerCase()));
  const locationMatch = Boolean(location) && haystack.includes(location.toLowerCase());
  const icpFit = clamp(
    (typeMatch ? 20 : 8) + (locationMatch || business.provider === "apify" ? 12 : 0) + (business.website ? 8 : 0),
    scoreWeights.icp
  );
  const painSignal = clamp(evidence.reduce((sum, item) => sum + (item.type === "mention" ? 0 : item.strength), 0), scoreWeights.pain);
  const contactability = clamp((business.phone ? 8 : 0) + (business.website ? 7 : 0) + (business.email ? 5 : 0), scoreWeights.contact);
  const loose = business.metadata?.looseMatch === true;
  const buyingSignal = !loose && evidence.some((item) => item.type !== "mention");
  const reasons = [
    typeMatch ? `Matches a buyer type from the offer: ${types.find((type) => haystack.includes(type.toLowerCase()))}.` : "Business was discovered for this offer, without a closer category match.",
    locationMatch ? `Located in ${location}.` : null,
    ...evidence.filter((item) => item.type !== "mention").map((item) => item.title),
    !buyingSignal ? "No direct buying signal was found." : null,
    business.phone ? "Phone is available." : null,
    business.website ? "Website is available." : null,
  ].filter((reason): reason is string => Boolean(reason));
  const signal = evidence.find((item) => item.type !== "mention");
  const reason = loose
    ? `Closest public page found for this offer: "${evidence[0]?.title ?? business.name}". This is a possible lead, not a confirmed buyer.`
    : buyingSignal
    ? `${business.name} matches the buyer profile and has public evidence: ${signal?.title}.`
    : icpFit >= 20
      ? "Strong ICP match based on business type and location, but no direct buying signal was found."
      : "Limited match based on the available listing, and no direct buying signal was found.";
  const pitch = signal
    ? `Noticed this public update: "${signal.title}". ${strategy.productSummary} may be relevant to that work.`
    : `${strategy.productSummary} may fit this business type. No public buying signal was found.`;

  return {
    icpFit,
    painSignal,
    contactability,
    total: icpFit + painSignal + contactability,
    reason,
    buyingSignal,
    reasons,
    suggestedPitch: pitch,
    decisionMakerRoles: strategy.decisionMakerRoles,
    evidence,
    sources: [
      ...(business.googleMapsUrl ? [{ provider: "google_maps" as const, url: business.googleMapsUrl }] : []),
      ...evidence.map((item) => ({ provider: "brave" as const, url: item.sourceUrl })),
    ],
  };
}
