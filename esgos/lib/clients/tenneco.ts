// Tenneco Clean Air India Limited (NSE: TENNIND, listed Nov 2025). Values come from the
// FY2025-26 BRSR filed with NSE on 6 Aug 2026, the Nov 2025 prospectus and Tenneco's India
// location list; see lib/clients/data/tenneco.json for every citation. Federal-Mogul
// Goetze, a fellow subsidiary that files its own BRSR, is shown outside the boundary.

import raw from "./data/tenneco.json"
import { buildPublicProfile, type PublicPack } from "./public"
import type { Citation } from "./types"

const BRSR: Citation = {
  title: "Tenneco Clean Air India Limited · BRSR FY2025-26",
  url: "https://nsearchives.nseindia.com/corporate/TENNECO_06082026231114_Tenneco_Clean_Air_India_-_BRSR_2025-26_Signed.pdf",
}
const SUMMARY: Citation = {
  title: "TCAIL BRSR FY2025-26, summary (ScanX)",
  url: "https://scanx.trade/stock-market-news/companies/tenneco-clean-air-india-releases-business-responsibility-and-sustainability-report-for-fy2025-26/47591683",
}

export const TENNECO = buildPublicProfile(raw as unknown as PublicPack, {
  id: "tenneco",
  name: "Tenneco India",
  shortName: "Tenneco",
  sector: "auto",
  tagline: "Listed · auto components · BRSR FY2025-26 filed",
  groupId: "grp-tenneco",
  reportingNote: "Standalone BRSR for Tenneco Clean Air India Limited. BRSR Core FY2025-26 reasonably assured. Subsidiaries are consolidated in the accounts only; Federal-Mogul Goetze files separately.",
  people: [
    { id: "sh-tn-esg", name: "Head of Sustainability, Tenneco India", role: "ESG lead", note: "Group sustainability lead; name to be entered" },
    { id: "sh-tn-cfo", name: "CFO, Tenneco Clean Air India", role: "Finance controller", note: "Name to be entered" },
    { id: "sh-tn-cs", name: "Company Secretary, Tenneco Clean Air India", role: "Company secretary", note: "Name to be entered" },
    { id: "sh-tn-proc", name: "Procurement head", role: "Procurement head", vacant: true },
  ],
  filedEvidence: {
    annualReport: { status: "sync", via: "BRSR FY2025-26 filed with NSE on 6 Aug 2026; the FY2026-27 report follows the year end", source: BRSR },
    targets: { status: "now", via: "Targets in the FY2025-26 BRSR: 50% renewable energy and a 50% cut in Scope 1 + 2 emissions by 2030, against 2024", source: SUMMARY },
    assurance: { status: "sync", via: "BRSR Core FY2025-26 reasonably assured by Adwin Advisory (standalone). FY2026-27 engagement to confirm", source: SUMMARY },
    scope3: {
      status: "open",
      via: "Scope 3 was not reported in the FY2025-26 BRSR",
      finding: "Scope 3 emissions were not reported for FY2025-26.",
      nextStep: "Start with purchased goods and upstream transport from the procurement ledger; report the material categories for FY2026-27.",
      ownerRole: "ESG lead",
      source: BRSR,
    },
  },
})
