// Bikaji Foods International Limited (NSE: BIKAJI). Values come from the
// FY2024-25 BRSR (Annual Report 2024-25, pp. 154-191, filed 22 Aug 2025) and
// the 2022 prospectus; see lib/clients/data/bikaji.json for every citation.

import raw from "./data/bikaji.json"
import { buildPublicProfile, type PublicPack } from "./public"
import type { Citation } from "./types"

const BRSR: Citation = { title: "Bikaji BRSR FY2024-25 (Annual Report 2024-25)", url: "https://nsearchives.nseindia.com/corporate/BIKAJIFOODS_22082025130708_62.pdf" }
const p = (page: string): Citation => ({ ...BRSR, page: `AR 2024-25 ${page}` })

export const BIKAJI = buildPublicProfile(raw as unknown as PublicPack, {
  id: "bikaji",
  name: "Bikaji Foods",
  shortName: "Bikaji",
  sector: "snacks",
  tagline: "Listed · packaged snacks · BRSR FY2024-25 filed",
  groupId: "grp-bikaji",
  reportingNote: "Standalone BRSR covering Bikaji's nine owned facilities. No BRSR Core assessment or assurance in FY2024-25.",
  people: [
    { id: "sh-bk-cs", name: "Rahul Joshi", role: "Company secretary", note: "Head – Legal and Company Secretary; BRSR contact named in the filed BRSR (p.154)" },
    { id: "sh-bk-esg", name: "ESG lead", role: "ESG lead", vacant: true },
    { id: "sh-bk-fc", name: "Finance controller", role: "Finance controller", vacant: true },
    { id: "sh-bk-proc", name: "Procurement head", role: "Procurement head", vacant: true },
  ],
  filedEvidence: {
    annualReport: { status: "sync", via: "Annual Report 2024-25 filed; FY2025-26 report due after year end", source: p("p.154") },
    "policy.esg": { status: "now", via: "Board-approved policies cover all nine principles (BRSR Section B, p.160)", source: p("p.160") },
    "policy.code": { status: "now", via: "Code of Conduct for the board and senior management; anti-corruption policy (p.164-165)", source: p("p.164") },
    "policy.whistleblower": { status: "now", via: "Whistleblower Policy (P3, p.169)", source: p("p.169") },
    "policy.posh": { status: "now", via: "POSH policy and complaints disclosure (P5, p.179)", source: p("p.179") },
    "policy.humanRights": { status: "now", via: "Human rights policy (P5, p.179)", source: p("p.179") },
    epr: { status: "now", via: "EPR applies to plastic packaging (P2 E4, p.167)", source: p("p.167") },
    scope3: { status: "now", via: "Scope 3 reported: 2,045.54 tCO2e in FY2024-25, categories not disclosed (P6 L2, p.185)", source: p("p.185") },
    assurance: {
      status: "open",
      via: "No assurance in the FY2024-25 filing",
      finding: "No BRSR Core assessment or assurance in the FY2024-25 filing (Section A Q14, p.154).",
      nextStep: "appointing a BRSR Core assessment or assurance provider (SEBI glide path: top 500 listed companies from FY2025-26, top 1,000 from FY2026-27)",
      ownerRole: "CFO",
      source: p("p.154"),
    },
    materiality: { status: "now", via: "Material issues disclosed (Section A Q26, p.157)", source: p("p.157") },
    targets: {
      status: "open",
      via: "Sustainability roadmap still being finalised",
      finding: "No quantified ESG targets yet; the FY2024-25 BRSR says the sustainability roadmap is being finalised (Section B Q6, p.161).",
      nextStep: "setting board-approved energy, water and emission targets",
      ownerRole: "ESG committee",
      source: p("p.161"),
    },
  },
})
