import type { EntityId } from "./entities"

// The order in which public sources reveal Tenneco's footprint, as esgOS's Seed step reads
// them: company filings, the filed BRSRs, the IPO prospectus, then Tenneco's own location
// list to reconcile, then pins on premises.

export type SourceId = "filings" | "brsr" | "rhp" | "tenneco" | "maps"

export type DiscoverySource = {
  id: SourceId
  title: string
  reading: string
  unit: string
  units?: string
  /** sites this source adds to the map, in order */
  finds: string[]
  /** count shown when the source has no new sites (e.g. pins placed) */
  confirms?: number
}

export const SOURCES: DiscoverySource[] = [
  {
    id: "filings",
    title: "Company filings (MCA)",
    reading: "Registered and corporate offices of TCAIL, FMGIL and group companies…",
    unit: "office",
    finds: ["tcail-gurugram", "fmgil-ro", "tgs-ro"],
  },
  {
    id: "brsr",
    title: "Filed BRSR FY2025-26 · TCAIL and FMGIL",
    reading: "Reading plant locations from both filed reports…",
    unit: "plant",
    finds: ["fmgil-blr", "fmgil-patiala", "tcail-chennai", "tcail-chakan1", "tcail-chakan2", "tcail-pithampur"],
  },
  {
    id: "rhp",
    title: "TCAIL prospectus · Nov 2025",
    reading: "Subsidiaries' plants, the technical centre and new capacity…",
    unit: "site",
    finds: ["taipl-hosur", "taipl-bawal", "taipl-sanand", "taipl-puducherry", "fmbil-parwanoo", "fmsil-chakan", "tcail-pune-rnd", "tcail-kharkhoda"],
  },
  {
    id: "tenneco",
    title: "Tenneco's India location list",
    reading: "Matching every factory against Tenneco's own list…",
    unit: "new factory",
    units: "new factories",
    finds: ["fmps-bhiwadi"],
  },
  {
    id: "maps",
    title: "Pins on premises",
    reading: "Placing each factory on its address…",
    unit: "factory placed",
    units: "factories placed",
    finds: [],
    confirms: 13,
  },
]

export const ORIGIN_OF: Record<string, SourceId> = Object.fromEntries(SOURCES.flatMap((s) => s.finds.map((id) => [id, s.id])))

// Shareholding, as filed: TCAIL's holdings in its subsidiaries; FMGIL's in FM TPR; the
// other Indian companies of the wider Tenneco group, owned outside TCAIL and FMGIL.
export type HoldingNode = { id: EntityId; pct?: number }

export const TREE = {
  parent: { name: "Tenneco Inc.", note: "Global parent · owned by Apollo Funds since Nov 2022" },
  listed: [
    { id: "tcail" as EntityId, children: [{ id: "taipl", pct: 100 }, { id: "fmipl", pct: 100 }, { id: "fmbil", pct: 99.37 }, { id: "fmsil", pct: 89.89 }] as HoldingNode[] },
    { id: "fmgil" as EntityId, children: [{ id: "fmtpr", pct: 51 }] as HoldingNode[] },
  ],
  others: ["fmps", "fmmp", "motocare", "tgs", "tio"] as EntityId[],
}
