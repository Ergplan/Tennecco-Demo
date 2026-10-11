// Monthly data collection (Phase 2 of a readiness engagement): one value per
// plant, metric and month, with its source, evidence and review status. Run as
// monthly cycles: issue requests to named owners, take submissions, review,
// close. Three to six closed cycles prove the process before the first report.

import type { SiteType, StakeholderRole } from "../types"
import type { EnergyFileSummary } from "../clients/types"
import type { AnnualId, AnnualValue } from "./annual"

export type Topic = "Energy" | "Refrigerants" | "Water" | "Waste" | "Production" | "People and safety"
export const TOPICS: Topic[] = ["Energy", "Refrigerants", "Water", "Waste", "Production", "People and safety"]

export type MetricId =
  | "elec.grid"
  | "elec.re"
  | "elec.kvah"
  | "fuel.hsd"
  | "fuel.png"
  | "fuel.lpg"
  | "fuel.biomass"
  | "water.ground"
  | "water.third"
  | "water.discharge"
  | "waste.haz"
  | "waste.plastic"
  | "waste.other"
  | "prod.output"
  | "hr.headcount"
  | "safety.hours"
  | "safety.lti"
  // Added from the gap analysis when a gap needs them (see EXTRA_METRICS).
  | "fuel.vehicle"
  | "refrig.r410a"
  | "refrig.r32"
  | "refrig.r134a"
  | "refrig.r404a"
  | "water.surface"
  | "safety.hours.emp"
  | "safety.lti.emp"

export type Metric = {
  id: MetricId
  label: string
  unit: string
  topic: Topic
  // BRSR questions this metric feeds.
  brsr: string[]
  owner: StakeholderRole
  evidence: string
  siteTypes: SiteType[]
  // Not every plant has every fuel or meter: blank is allowed and not counted missing.
  optional?: boolean
  // Summed across months (flows) or taken at month end (stocks such as headcount).
  stock?: boolean
  help?: string
  // Not in the standard templates: added to the collection when a gap needs it.
  extra?: { gap: string }
}

const ALL: SiteType[] = ["factory", "office", "warehouse"]
const PLANT: SiteType[] = ["factory"]

export const METRICS: Metric[] = [
  { id: "elec.grid", label: "Grid electricity", unit: "kWh", topic: "Energy", brsr: ["P6.E1", "P6.E7"], owner: "Energy manager", evidence: "Electricity bill (kWh)", siteTypes: ALL },
  { id: "elec.re", label: "Renewable electricity (open access, captive, rooftop)", unit: "kWh", topic: "Energy", brsr: ["P6.E1"], owner: "Energy manager", evidence: "Settlement statement or generation meter", siteTypes: PLANT, optional: true },
  { id: "elec.kvah", label: "Grid electricity, apparent", unit: "kVAh", topic: "Energy", brsr: ["P6.E1"], owner: "Energy manager", evidence: "Electricity bill (kVAh)", siteTypes: PLANT, optional: true, help: "Used to check the power factor; BRSR reports kWh." },
  { id: "fuel.hsd", label: "Diesel (DG sets and boilers)", unit: "litres", topic: "Energy", brsr: ["P6.E1", "P6.E7"], owner: "Plant head", evidence: "Fuel invoices and DG log", siteTypes: PLANT, optional: true },
  { id: "fuel.png", label: "Natural gas (PNG)", unit: "MMBtu", topic: "Energy", brsr: ["P6.E1", "P6.E7"], owner: "Plant head", evidence: "Gas bill (MMBtu)", siteTypes: PLANT, optional: true },
  { id: "fuel.lpg", label: "LPG", unit: "kg", topic: "Energy", brsr: ["P6.E1", "P6.E7"], owner: "Plant head", evidence: "LPG invoices", siteTypes: PLANT, optional: true },
  { id: "fuel.biomass", label: "Biomass (briquettes, husk)", unit: "tonnes", topic: "Energy", brsr: ["P6.E1", "P6.E7"], owner: "Plant head", evidence: "Weighbridge slips and invoices", siteTypes: PLANT, optional: true },
  { id: "water.ground", label: "Groundwater withdrawal", unit: "kL", topic: "Water", brsr: ["P6.E3"], owner: "EHS manager", evidence: "Borewell meter log", siteTypes: PLANT, optional: true },
  { id: "water.third", label: "Third-party water (municipal, tanker)", unit: "kL", topic: "Water", brsr: ["P6.E3"], owner: "EHS manager", evidence: "Water bills and tanker challans", siteTypes: PLANT, optional: true },
  { id: "water.discharge", label: "Water discharged", unit: "kL", topic: "Water", brsr: ["P6.E4"], owner: "EHS manager", evidence: "ETP outlet meter log", siteTypes: PLANT },
  { id: "waste.haz", label: "Hazardous waste", unit: "tonnes", topic: "Waste", brsr: ["P6.E9"], owner: "EHS manager", evidence: "Form 10 manifests", siteTypes: PLANT },
  { id: "waste.plastic", label: "Plastic waste", unit: "tonnes", topic: "Waste", brsr: ["P6.E9", "P2.E4"], owner: "EHS manager", evidence: "Recycler receipts, EPR records", siteTypes: PLANT },
  { id: "waste.other", label: "Other non-hazardous waste", unit: "tonnes", topic: "Waste", brsr: ["P6.E9"], owner: "EHS manager", evidence: "Waste register", siteTypes: PLANT },
  { id: "prod.output", label: "Production", unit: "tonnes", topic: "Production", brsr: ["P6.E1", "P6.E3", "P6.E9"], owner: "Plant head", evidence: "ERP production report", siteTypes: PLANT },
  { id: "hr.headcount", label: "Headcount at month end (permanent and contract)", unit: "people", topic: "People and safety", brsr: ["A.20"], owner: "HR manager", evidence: "HRMS and contractor registers", siteTypes: ALL, stock: true },
  { id: "safety.hours", label: "Person-hours worked", unit: "hours", topic: "People and safety", brsr: ["P3.E11"], owner: "HR manager", evidence: "Attendance system", siteTypes: PLANT },
  { id: "safety.lti", label: "Lost-time injuries", unit: "count", topic: "People and safety", brsr: ["P3.E11"], owner: "EHS manager", evidence: "Incident register", siteTypes: PLANT },
]

// Metrics a gap can add to the monthly templates. Each closes a known limitation:
// Scope 1 without vehicles and refrigerants, water without surface water, LTIFR
// without the split between employees and workers.
export const EXTRA_METRICS: Metric[] = [
  { id: "fuel.vehicle", label: "Diesel, company-owned vehicles", unit: "litres", topic: "Energy", brsr: ["P6.E1", "P6.E7"], owner: "Plant head", evidence: "Fuel card statements and vehicle logbooks", siteTypes: ALL, optional: true, extra: { gap: "Scope 1 leaves out fuel burnt in company-owned vehicles." } },
  { id: "refrig.r410a", label: "Refrigerant top-up, R-410A", unit: "kg", topic: "Refrigerants", brsr: ["P6.E7"], owner: "Maintenance head", evidence: "AC and chiller service reports (kg charged)", siteTypes: ALL, optional: true, extra: { gap: "Scope 1 leaves out refrigerant leaks from air conditioning and chillers." } },
  { id: "refrig.r32", label: "Refrigerant top-up, R-32", unit: "kg", topic: "Refrigerants", brsr: ["P6.E7"], owner: "Maintenance head", evidence: "AC service reports (kg charged)", siteTypes: ALL, optional: true, extra: { gap: "Scope 1 leaves out refrigerant leaks from air conditioning and chillers." } },
  { id: "refrig.r134a", label: "Refrigerant top-up, R-134a", unit: "kg", topic: "Refrigerants", brsr: ["P6.E7"], owner: "Maintenance head", evidence: "Chiller and cold-room service reports (kg charged)", siteTypes: ALL, optional: true, extra: { gap: "Scope 1 leaves out refrigerant leaks from air conditioning and chillers." } },
  { id: "refrig.r404a", label: "Refrigerant top-up, R-404A", unit: "kg", topic: "Refrigerants", brsr: ["P6.E7"], owner: "Maintenance head", evidence: "Cold-room service reports (kg charged)", siteTypes: PLANT, optional: true, extra: { gap: "Scope 1 leaves out refrigerant leaks from air conditioning and chillers." } },
  { id: "water.surface", label: "Surface water withdrawal (river, canal, pond)", unit: "kL", topic: "Water", brsr: ["P6.E3"], owner: "EHS manager", evidence: "Abstraction permit and flow-meter log", siteTypes: PLANT, optional: true, extra: { gap: "Water withdrawal leaves out surface water; P6 E3 asks for it by source." } },
  { id: "safety.hours.emp", label: "Person-hours worked, employees only", unit: "hours", topic: "People and safety", brsr: ["P3.E11"], owner: "HR manager", evidence: "Attendance system (employees)", siteTypes: PLANT, extra: { gap: "LTIFR is one figure; P3 E11 asks for employees and workers separately." }, help: "Workers are the total person-hours less this." },
  { id: "safety.lti.emp", label: "Lost-time injuries, employees only", unit: "count", topic: "People and safety", brsr: ["P3.E11"], owner: "EHS manager", evidence: "Incident register (employees)", siteTypes: PLANT, extra: { gap: "LTIFR is one figure; P3 E11 asks for employees and workers separately." }, help: "Workers are the total injuries less this." },
]

export const ALL_METRICS: Metric[] = [...METRICS, ...EXTRA_METRICS]
export const METRIC_BY_ID = Object.fromEntries(ALL_METRICS.map((m) => [m.id, m])) as Record<MetricId, Metric>

// The metrics in this client's templates: the standard set plus any a gap added.
export function activeMetrics(state: Pick<CollectionState, "added">): Metric[] {
  const added = state.added ?? []
  return [...METRICS, ...EXTRA_METRICS.filter((m) => added.includes(m.id))]
}

export function activeTopics(state: Pick<CollectionState, "added">): Topic[] {
  const ms = activeMetrics(state)
  return TOPICS.filter((t) => ms.some((m) => m.topic === t))
}

export type CellSource = "bill" | "meter" | "erp" | "hrms" | "register" | "file" | "estimate"
export const SOURCE_TEXT: Record<CellSource, string> = { bill: "Bill or invoice", meter: "Meter", erp: "ERP", hrms: "HRMS", register: "Register", file: "Client file", estimate: "Estimate" }

// Missing has no cell. Estimated values are kept but never count as collected.
export type CellStatus = "submitted" | "estimated" | "approved"

export type Cell = {
  value: number
  source: CellSource
  status: CellStatus
  evidence?: string
  note?: string
  by: string
  at: string
  example?: boolean
}

export type Cycle = { issuedAt?: string; due?: string; requests?: number; closedAt?: string }

export type CollectionState = {
  setupAt?: string
  months: string[]
  cycles: Record<string, Cycle>
  cells: Record<string, Cell>
  // Metrics added from the gap analysis, and when.
  added?: MetricId[]
  addedAt?: Partial<Record<MetricId, string>>
  // Company data for the year, from the audited financial statements.
  annual?: Partial<Record<AnnualId, AnnualValue>>
}

export const EMPTY_COLLECTION: CollectionState = { months: [], cycles: {}, cells: {} }

export const cellKey = (siteId: string, metric: MetricId, month: string) => `${siteId}|${metric}|${month}`

// "FY 2025-26" → 2025-04 … 2026-03
export function fyMonths(fiscalYear: string): string[] {
  const y = Number(fiscalYear.match(/(\d{4})/)?.[1] ?? new Date().getFullYear())
  return Array.from({ length: 12 }, (_, i) => {
    const m = ((3 + i) % 12) + 1
    const yr = i < 9 ? y : y + 1
    return `${yr}-${String(m).padStart(2, "0")}`
  })
}

export function monthLabel(m: string, long = false) {
  const [y, mm] = m.split("-").map(Number)
  return new Date(y, mm - 1, 1).toLocaleDateString("en-IN", { month: long ? "long" : "short", year: long ? "numeric" : "2-digit" })
}

export function appliesTo(metric: Metric, type: SiteType) {
  return metric.siteTypes.includes(type)
}

// Prefill from a client's energy workbook: kVAh as given (a reading where the
// file typed one, an estimate otherwise), kWh derived at the assumed power factor.
export function cellsFromEnergyFile(file: EnergyFileSummary, siteIdByName: Record<string, string>, months: string[], at: string): Record<string, Cell> {
  const out: Record<string, Cell> = {}
  const year = Number(file.period.match(/(\d{4})/)?.[1])
  for (const p of file.plants) {
    const siteId = siteIdByName[p.site]
    if (!siteId || !p.monthly) continue
    p.monthly.forEach((kvah, i) => {
      const month = `${year}-${String(i + 1).padStart(2, "0")}`
      if (!months.includes(month) || p.kinds[i] === "none" || !kvah) return
      const reading = p.kinds[i] === "typed"
      const how = file.kindLegend[p.kinds[i]] ?? p.kinds[i]
      out[cellKey(siteId, "elec.kvah", month)] = {
        value: Math.round(kvah),
        source: reading ? "file" : "estimate",
        status: reading ? "submitted" : "estimated",
        evidence: file.file,
        note: reading ? `Typed in ${file.file}; bill not seen yet.` : `${how} in ${file.file}.`,
        by: "Client file",
        at,
      }
      out[cellKey(siteId, "elec.grid", month)] = {
        value: Math.round(kvah * file.powerFactor),
        source: "estimate",
        status: "estimated",
        evidence: file.file,
        note: `kVAh × assumed power factor ${file.powerFactor}${reading ? "" : `; the kVAh is itself ${how.toLowerCase()}`}. Replace with kWh from the bill.`,
        by: "Client file",
        at,
      }
    })
  }
  return out
}
