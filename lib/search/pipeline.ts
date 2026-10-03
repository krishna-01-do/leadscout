import type { BraveWebResult, ProspectEvidence, SearchStrategy } from "@/schemas/prospecting";
import {
  evidenceFromResult,
  fillerWebBusiness,
  matchWebResult,
  normalizedDomain,
  looseWebBusiness,
  qualifyProspect,
  webOnlyBusiness,
} from "@/lib/search/prospects";
import type { NormalizedBusiness } from "@/types";

export interface BuildProspectOptions {
  allowWebLeads?: boolean;
  minimum?: number;
  reserve?: NormalizedBusiness[];
}

export interface BuiltProspect {
  business: NormalizedBusiness;
  evidence: ProspectEvidence[];
  qualification: ReturnType<typeof qualifyProspect>;
}

export function buildProspects(
  maps: NormalizedBusiness[],
  web: BraveWebResult[],
  strategy: SearchStrategy,
  location: string,
  options: BuildProspectOptions = {}
): BuiltProspect[] {
  const allowWebLeads = options.allowWebLeads ?? maps.length === 0;
  const minimum = options.minimum ?? 0;
  const country = strategy.targetMarket.countries[0] ?? null;
  const leads: Array<{ business: NormalizedBusiness; evidence: ProspectEvidence[] }> = maps.map((business) => ({
    business,
    evidence: [],
  }));
  const seenIds = new Set(leads.map((lead) => lead.business.providerBusinessId));
  const seenDomains = new Set(maps.map((business) => normalizedDomain(business.website)).filter(Boolean));

  function addLead(business: NormalizedBusiness | null, evidence: ProspectEvidence[]) {
    if (!business || seenIds.has(business.providerBusinessId)) return false;
    const domain = normalizedDomain(business.website);
    if (domain && seenDomains.has(domain) && business.provider !== "apify") return false;
    seenIds.add(business.providerBusinessId);
    if (domain) seenDomains.add(domain);
    leads.push({ business, evidence });
    return true;
  }

  for (const result of web) {
    const match = matchWebResult(result, leads.map((lead) => lead.business));
    const evidence = evidenceFromResult(result);
    if (match.index !== null) {
      const existing = leads[match.index].evidence.some((item) => item.sourceUrl === evidence.sourceUrl);
      if (!existing) leads[match.index].evidence.push(evidence);
      continue;
    }
    if (!allowWebLeads || maps.length > 0) continue;
    addLead(webOnlyBusiness(result, country), [evidence]);
  }

  if (!leads.length && allowWebLeads) {
    for (const result of web) {
      addLead(looseWebBusiness(result, country), [evidenceFromResult(result)]);
    }
  }

  if (minimum > leads.length) {
    for (const business of options.reserve ?? []) {
      if (leads.length >= minimum) break;
      addLead(business, []);
    }
  }

  if (minimum > leads.length) {
    for (const result of web) {
      if (leads.length >= minimum) break;
      const evidence = [evidenceFromResult(result)];
      const webBusiness = webOnlyBusiness(result, country);
      const broaderBusiness = webBusiness
        ? {
            ...webBusiness,
            metadata: { ...(webBusiness.metadata ?? {}), broaderMatch: true },
          }
        : null;
      if (!addLead(broaderBusiness, evidence)) {
        addLead(looseWebBusiness(result, country) ?? fillerWebBusiness(result, country), evidence);
      }
    }
  }

  function tier(business: NormalizedBusiness) {
    if (business.metadata?.looseMatch === true || business.metadata?.broaderMatch === true) return 2;
    if (business.provider === "apify" || business.provider === "mock") return 0;
    return 1;
  }

  return leads
    .map((lead) => ({
      ...lead,
      qualification: qualifyProspect(lead.business, strategy, lead.evidence, location),
    }))
    .sort((left, right) =>
      tier(left.business) - tier(right.business)
      || right.qualification.total - left.qualification.total
      || left.business.name.localeCompare(right.business.name)
    );
}
