// Haldiram Snacks Food Private Limited: unlisted, preparing for an IPO. No
// BRSR has been filed, so the footprint comes from public records (regulator,
// rating-agency and news pages, read through search extracts) and from the
// plant energy workbook the client shared. Bikaji Foods is the listed peer.
// See lib/clients/data/haldiram.json for every citation.

import raw from "./data/haldiram.json"
import { roleSeats } from "./public"
import { energyFileSummary, energyRows, fileSummary } from "./haldiramEnergy"
import type { Citation, ClientProfile, PublicEntity, PublicGst, PublicSite } from "./types"
import { FISCAL_YEAR, PERIOD } from "../demoData"

type Pack = {
  readNote: string
  company: { legalName: string; cin: string; pan: string; registeredOffice: string; ipo: string; excluded: string; source: Citation; shareholders: { name: string; source: Citation }[] }
  revenue: { fy: string; value: number; source: Citation; note: string }
  sites: PublicSite[]
  entities: PublicEntity[]
  gst: PublicGst[]
  notPublic: string[]
}

const pack = raw as unknown as Pack

// Workbook row → site name. Every row in the file is a plant in Uttar Pradesh.
const FILE_ROWS: Record<string, string> = {
  A12: "Noida A-12",
  A11: "Noida A-11, Sector 68",
  B1: "Noida B-1, Sector 63",
  B2: "Noida B-2",
  "A2/3/4 Sector65": "Noida A-2/3/4, Sector 65",
  C3: "Noida C-3, Sector 67",
  C1: "Noida C-1",
  "Greater Noida": "Greater Noida",
  Sandila: "Sandila (Hardoi)",
  "155": "Plant 155",
}

const CAVEATS = [
  `Units: the file is in kVAh. BRSR reports energy in GJ from kWh, which needs each plant's power factor; esgOS uses 0.98 as a placeholder and flags every converted value.`,
  `Period: calendar year 2025 (January to December). BRSR uses the financial year; ${FISCAL_YEAR} needs April 2025 to March 2026.`,
  `Readings: ${Math.round(fileSummary.actualShare * 100)}% of the kVAh are meter or bill readings. The rest are averages, copied months, one reading split three ways, one value repeated every month (C1) or connected load × hours × load factor (Greater Noida, Sandila, 155). BRSR Core assessment needs bills or meter logs.`,
  `Solar: the 28 MW is group-level and estimated at 17% capacity utilisation, not metered, and is not allocated to plants. Open-access and captive settlement statements give the actual units.`,
  `Coverage: the file has the 10 plants in Uttar Pradesh only. Rudrapur and the Nagpur plants are not in it.`,
  `Fuel: there is no boiler fuel, diesel or gas in the file. For a snacks maker fuel is usually most of the energy: 84% of Bikaji's FY2024-25 energy was fuel.`,
]

const factories = pack.sites.filter((s) => s.type === "factory")
const SOURCES: Citation[] = [pack.company.source, pack.revenue.source, ...pack.company.shareholders.map((s) => s.source)]
const people = [
  { id: "sh-hs-esg", name: "ESG lead", role: "ESG lead" as const, vacant: true },
  { id: "sh-hs-fc", name: "Finance controller", role: "Finance controller" as const, vacant: true },
  { id: "sh-hs-cs", name: "Company secretary", role: "Company secretary" as const, vacant: true },
  { id: "sh-hs-proc", name: "Procurement head", role: "Procurement head" as const, vacant: true },
]

export const HALDIRAM: ClientProfile = {
  id: "haldiram",
  kind: "public",
  name: "Haldiram's",
  shortName: "Haldiram",
  legalName: pack.company.legalName,
  sector: "snacks",
  tagline: "Unlisted · IPO under consideration · no BRSR yet",
  label: `Public records and client file: ${pack.company.legalName} (unlisted)`,
  group: { id: "grp-haldiram", name: "Haldiram Snacks Food", pans: [pack.company.pan], fiscalYear: FISCAL_YEAR, period: PERIOD },
  cin: pack.company.cin,
  registeredOffice: pack.company.registeredOffice,
  incorporated: "2022",
  reportingNote: `No BRSR filed yet (unlisted). ${pack.readNote} Plant electricity comes from the client's own file.`,
  preIpo: {
    status: pack.company.ipo,
    applicability:
      "Once listed, Haldiram Snacks Food must publish a BRSR with its annual report if it ranks in the top 1,000 listed companies by market capitalisation (SEBI LODR Regulation 34(2)(f)). At the valuation reported for the 2025 stake sales (about US$10 bn) it would rank near the top 100 (an inference, not a published ranking), so BRSR Core assessment or assurance (top 1,000 from FY2026-27) applies from its first BRSR, and the value-chain disclosures (voluntary, top 250) are expected by investors.",
    plannedListing: "IPO under consideration; no DRHP filed",
    peerId: "bikaji",
    peerNote: `Bikaji Foods is the closest listed packaged-snacks peer with a filed BRSR. Haldiram's FY2024-25 revenue (about ₹${pack.revenue.value.toLocaleString("en-IN")} crore, CRISIL) is about five times Bikaji's, so values scaled from Bikaji show order of magnitude only.`,
    revenueCr: { fy: pack.revenue.fy, value: pack.revenue.value, source: pack.revenue.source, note: pack.revenue.note },
    ours: {
      electricity: {
        value: Math.round(fileSummary.totalMWhAssumed * 3.6),
        unit: "GJ",
        basis: `Your energy file: ${(fileSummary.totalKvah / 1e6).toFixed(1)} million kVAh across the 10 UP plants in calendar 2025 × assumed power factor 0.98 × 3.6 GJ/MWh. ${Math.round(fileSummary.actualShare * 100)}% from readings; the rest estimated. Rudrapur and Nagpur are not in the file.`,
        estimate: true,
      },
      reShare: {
        value: Math.round(fileSummary.greenShareAsComputed * 1000) / 10,
        unit: "%",
        basis: `As computed in your file: ${fileSummary.solarMWh.toLocaleString("en-IN")} MWh of solar (28 MW × 8,760 h × 17%, an estimate) ÷ plant kVAh. If the solar is on top of plant consumption, the like-for-like share is ${Math.round(fileSummary.greenShareKwh * 100)}%.`,
        estimate: true,
      },
    },
    plantSources: {
      title: "Public records and your energy file",
      reading: "Reading plants from pollution-board, rating-agency and news records, then your energy file…",
      narration: "No BRSR has been filed yet. Next, plants on public record: the pollution board's Noida action plan, CRISIL rating reports and news. Then the plants in the energy file you shared.",
    },
    boundaryQuestion: "Haldiram Snacks Food is the company that would list. It has no subsidiaries on public record, and the restaurant companies stay outside. Report its first BRSR standalone?",
    sources: SOURCES,
  },
  publicSites: pack.sites,
  publicEntities: pack.entities,
  publicGst: pack.gst,
  documentsUsed: [pack.company.source, pack.revenue.source, { title: "Client file: Energy_Consumption_Estimated.xlsx (CY 2025)", note: "Shared by the client; not public." }],
  notPublic: pack.notPublic,
  preloadedImports: {
    energy: energyRows(FILE_ROWS),
    files: [{ kind: "energy", fileName: "Energy_Consumption_Estimated.xlsx", rows: Object.keys(FILE_ROWS).length, at: "2026-10-04T00:00:00.000Z" }],
  },
  energyFile: energyFileSummary(FILE_ROWS, CAVEATS),
  stakeholders: [...roleSeats(pack.sites), ...people],
  defaultPaste: "",
  profileOrder: [...factories.map((s) => s.id), ...pack.sites.filter((s) => s.type !== "factory").map((s) => s.id)],
  demoAnswers: {},
  scriptSkip: [],
}

