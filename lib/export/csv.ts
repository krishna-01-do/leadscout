import type { SearchResultRow } from "@/types";

const CSV_HEADERS = [
  "Business Name",
  "Category",
  "Address",
  "City",
  "State",
  "Country",
  "Phone",
  "Email",
  "Website",
  "Rating",
  "Reviews",
  "Match Score",
  "Opportunity Flags",
  "Qualification Reason",
  "Google Maps URL",
];

function escapeCsvField(value: string): string {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (safeValue.includes(",") || safeValue.includes('"') || safeValue.includes("\n") || safeValue.includes("\r")) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
}

export function generateCsv(results: SearchResultRow[]): string {
  const rows = [CSV_HEADERS.join(",")];

  for (const result of results) {
    const b = result.business;
    const fields = [
      b.name ?? "",
      b.category ?? "",
      b.address ?? "",
      b.city ?? "",
      b.state ?? "",
      b.country ?? "",
      b.phone ?? "",
      b.email ?? "",
      b.website ?? "",
      b.rating?.toString() ?? "",
      b.reviewCount?.toString() ?? "",
      result.matchScore.toString(),
      result.opportunityFlags.join("; "),
      result.qualificationReason ?? "",
      b.googleMapsUrl ?? "",
    ];
    rows.push(fields.map(escapeCsvField).join(","));
  }

  return rows.join("\r\n");
}
