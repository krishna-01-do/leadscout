import type { BraveWebResult, ProspectEvidence, SearchStrategy } from "@/schemas/prospecting";
import {
  evidenceFromResult,
  matchWebResult,
  normalizedDomain,
  looseWebBusiness,
  qualifyProspect,
  webOnlyBusiness,
} from "@/lib/search/prospects";
import type { NormalizedBusiness } from "@/types";

export interface BuiltProspect {
  business: NormalizedBusiness;
  evidence: ProspectEvidence[];
  qualification: ReturnType<typeof qualifyProspect>;
}

export function buildProspects(
  maps: NormalizedBusiness[],
  web: BraveWebResult[],
  strategy: SearchStrategy,
  location: string
): BuiltProspect[] {
  const leads: Array<{ business: NormalizedBusiness; evidence: ProspectEvidence[] }> = maps.map((business) => ({
    business,
    evidence: [],
  }));
  const seen = new Set(maps.map((business) => normalizedDomain(business.website)).filter(Boolean));

  for (const result of web) {
    const match = matchWebResult(result, leads.map((lead) => lead.business));
    const evidence = evidenceFromResult(result);
    if (match.index !== null) {
      const existing = leads[match.index].evidence.some((item) => item.sourceUrl === evidence.sourceUrl);
      if (!existing) leads[match.index].evidence.push(evidence);
      continue;
    }
    const created = webOnlyBusiness(result, strategy.targetMarket.countries[0] ?? null);
    const domain = normalizedDomain(created?.website);
    if (!created || !domain || seen.has(domain)) continue;
    seen.add(domain);
    leads.push({ business: created, evidence: [evidence] });
  }

  if (!leads.length) {
    const looseSeen = new Set<string>();
    for (const result of web) {
      const created = looseWebBusiness(result, strategy.targetMarket.countries[0] ?? null);
      if (!created || looseSeen.has(created.providerBusinessId)) continue;
      looseSeen.add(created.providerBusinessId);
      leads.push({ business: created, evidence: [evidenceFromResult(result)] });
    }
  }

  return leads
    .map((lead) => ({
      ...lead,
      qualification: qualifyProspect(lead.business, strategy, lead.evidence, location),
    }))
    .sort((left, right) => right.qualification.total - left.qualification.total || left.business.name.localeCompare(right.business.name));
}
