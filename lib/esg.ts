import type { EntityId } from "./entities"
import type { Source } from "./sites"

// What each entity has already done or committed to, from public sources only.

export type EntityEsg = {
  entityId: EntityId
  headline: string
  facts: string[]
  sources: Source[]
}

export const ENTITY_ESG: EntityEsg[] = [
  {
    entityId: "fmgil",
    headline: "Bengaluru runs mostly on wheeled wind and solar; the group files BRSR with ISO 14001 and ISO 50001 systems.",
    facts: [
      "Renewable energy rose to 35% of total energy in FY2025-26 (from 32% in FY2024-25)",
      "About 95% wheeling energy from wind, hydro and solar, and a switch from LPG to piped natural gas (CARE Ratings, Mar 2024)",
      "26% stake in Real Captive Power Pvt Ltd since 2015: a group-captive structure already exists",
      "Sites managed to ISO 14001 and ISO 50001 (FY2023-24 BRSR)",
      "79% of waste recovered in FY2025-26",
    ],
    sources: [
      { label: "CARE Ratings, Mar 2024", url: "https://www.careratings.com/upload/CompanyFiles/PR/202403130339_Federal_Mogul_Goetze_India_Limited.pdf" },
      { label: "FMGIL BRSR FY2023-24", url: "https://nsearchives.nseindia.com/corporate/Federal_25072024210447_BRSR.pdf" },
      { label: "FMGIL company summary", url: "https://www.indiainfoline.com/company/federal-mogul-goetze-india-ltd/summary" },
    ],
  },
  {
    entityId: "tcail",
    headline: "Targets set: 50% renewable energy and a 50% cut in Scope 1 + 2 by 2030, against 2024.",
    facts: [
      "Renewable share up from 11% to 23% of energy in one year (FY2024-25 to FY2025-26)",
      "Scope 1 + 2 down 16% year on year",
      "Chennai: over 90% of energy from solar and wind through a PPA",
      "Chakan: 920 kWp rooftop solar, about 870 MWh and 350 tCO₂e avoided a year",
      "BRSR Core reasonably assured (standalone: Chakan I and II, Chennai, Pithampur)",
    ],
    sources: [
      { label: "TCAIL BRSR FY2025-26", url: "https://nsearchives.nseindia.com/corporate/TENNECO_06082026231114_Tenneco_Clean_Air_India_-_BRSR_2025-26_Signed.pdf" },
      { label: "BRSR summary (ScanX)", url: "https://scanx.trade/stock-market-news/companies/tenneco-clean-air-india-releases-business-responsibility-and-sustainability-report-for-fy2025-26/47591683" },
    ],
  },
]

export type Cover = "filed" | "partial" | "none"

export const COVERAGE_COLS = ["Energy", "Renewable %", "Scope 1 + 2", "Water", "Waste", "By plant"] as const

export const COVERAGE: { entityId: EntityId; cells: Cover[]; note: string }[] = [
  { entityId: "fmgil", cells: ["filed", "filed", "filed", "filed", "filed", "partial"], note: "BRSR filed; Bengaluru figures from the plant note" },
  { entityId: "tcail", cells: ["filed", "filed", "filed", "filed", "filed", "partial"], note: "BRSR standalone covers 4 plants; two site facts public" },
  { entityId: "taipl", cells: ["none", "none", "none", "none", "none", "none"], note: "5 ride-control plants; unlisted, no BRSR of its own" },
  { entityId: "fmipl", cells: ["none", "none", "none", "none", "none", "none"], note: "Bhiwadi; unlisted subsidiary" },
  { entityId: "fmbil", cells: ["none", "none", "none", "none", "none", "none"], note: "Parwanoo; unlisted subsidiary" },
  { entityId: "fmsil", cells: ["none", "none", "none", "none", "none", "none"], note: "Chakan; unlisted subsidiary" },
  { entityId: "fmtpr", cells: ["none", "none", "none", "none", "none", "none"], note: "Bengaluru; inside FMGIL's consolidation" },
]
