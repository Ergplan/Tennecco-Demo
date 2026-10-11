// Asian Paints Limited (NSE: ASIANPAINT). Values come from the FY2024-25 BRSR
// (Integrated Annual Report 2024-25, pp. 297-339) and public registry and GST
// records; see lib/clients/data/asianpaints.json for every citation.

import raw from "./data/asianpaints.json"
import { buildPublicProfile, type PublicPack } from "./public"
import type { Citation } from "./types"

const BRSR: Citation = { title: "Asian Paints BRSR FY2024-25 (Integrated Annual Report 2024-25)", url: "https://www.asianpaints.com/AnnualReports.html" }
const p = (page: string): Citation => ({ ...BRSR, page: `IAR 2024-25 ${page}` })

export const ASIAN_PAINTS = buildPublicProfile(raw as unknown as PublicPack, {
  id: "asianpaints",
  name: "Asian Paints",
  shortName: "Asian Paints",
  sector: "paints",
  tagline: "Listed · paints and coatings · BRSR FY2024-25 filed",
  groupId: "grp-asianpaints",
  reportingNote: "Standalone BRSR covering locations under operational control. FY2024-25 was assured by Deloitte Haskins & Sells LLP (reasonable assurance on BRSR Core).",
  people: [
    { id: "sh-ap-cs", name: "R J Jeyamurugan", role: "Company secretary", note: "CFO & Company Secretary; BRSR contact named in the filed BRSR (p.297)" },
    { id: "sh-ap-esg", name: "ESG lead", role: "ESG lead", vacant: true },
    { id: "sh-ap-fc", name: "Finance controller", role: "Finance controller", vacant: true },
    { id: "sh-ap-proc", name: "Procurement head", role: "Procurement head", vacant: true },
  ],
  filedEvidence: {
    annualReport: { status: "sync", via: "Integrated Annual Report 2024-25 filed; FY2025-26 report due after year end", source: p("p.297") },
    "policy.esg": { status: "now", via: "Board-approved policies cover all nine principles (BRSR Section B, p.303)", source: p("p.303") },
    "policy.code": { status: "now", via: "Codes of Conduct for employees and business partners; anti-bribery position statement (p.305, p.308)", source: p("p.305") },
    "policy.whistleblower": { status: "now", via: "Whistle Blower Policy (BRSR Section B, p.305)", source: p("p.305") },
    "policy.posh": { status: "now", via: "POSH policy under the Code of Conduct (P3, p.307)", source: p("p.307") },
    "policy.humanRights": { status: "now", via: "Human Rights Position Statement (BRSR Section B, p.305)", source: p("p.305") },
    epr: { status: "now", via: "EPR applies: plastic and e-waste obligations met in FY2024-25 (P2 E4, p.311)", source: p("p.311") },
    scope3: { status: "now", via: "Scope 3 reported: 32.2 lakh tCO2e in FY2024-25 (P6 L2, p.333)", source: p("p.333") },
    assurance: { status: "sync", via: "Deloitte Haskins & Sells LLP: reasonable assurance on FY2024-25 BRSR Core (pp. 549-556). FY2025-26 engagement to confirm", source: p("pp. 549-556") },
    materiality: { status: "now", via: "Material issues disclosed (Section A Q26, p.302)", source: p("p.302") },
    targets: { status: "now", via: "ESG targets set and tracked (Section B Q5-6, p.303)", source: p("p.303") },
  },
})
