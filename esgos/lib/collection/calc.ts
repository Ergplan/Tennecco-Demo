// Calculations over collected data: totals, energy in GJ, Scope 1 and 2,
// LTIFR, completeness and review flags. Factors come from the reference
// library so every number names its source.

import { REFERENCE } from "../reference"
import type { Site } from "../types"
import { METRIC_BY_ID, activeMetrics, appliesTo, cellKey, type Cell, type CollectionState, type Metric, type MetricId } from "./model"

type EF = { id: string; value: number; ncv_TJ_per_Gg?: number; ch4_kg_per_TJ?: number; n2o_kg_per_TJ?: number; version?: string; item: string }
const ef = (id: string) => (REFERENCE.emissionFactors as unknown as EF[]).find((e) => e.id === id)!

const DIESEL = ef("ef.fuel.diesel")
const LPG = ef("ef.fuel.lpg")
const GAS = ef("ef.fuel.natural-gas")
const BIOMASS = ef("ef.fuel.other-solid-biomass")
const DIESEL_MOBILE = ef("ef.fuel.diesel-mobile")
const GRID = ef("ef.grid.india.cea-v21.fy2024-25")

// Within IS 1460:2017 (BS VI) 810–845 kg/m³ at 15 °C; the supplier's certificate of analysis replaces it.
export const DIESEL_DENSITY = 0.835 // kg per litre
export const GAS_NCV_OF_GCV = 0.9 // IPCC convention: natural gas NCV ≈ 90% of GCV; gas bills are on a gross basis
export const MMBTU_GJ = 1.05505585262 // NIST SP 811: 1 Btu(IT) = 1,055.05585262 J
// IPCC AR6 WG1 Table 7.15, 100-year: methane from fossil fuels 29.8, from biomass 27.0; nitrous oxide 273.
export const GWP = { ch4Fossil: 29.8, ch4Biogenic: 27.0, n2o: 273 }

// Refrigerant GWPs (IPCC AR6, 100-year) from the reference library; blends by mass fraction.
const gwp = (gas: string) => (REFERENCE.gwp as unknown as { gas: string; ar6: number }[]).find((g) => g.gas.startsWith(gas))!.ar6
// Blends from their components by mass, so no rounding enters: R-410A is 50% HFC-32 and 50% HFC-125;
// R-404A is 44% HFC-125, 52% HFC-143a and 4% HFC-134a.
export const REFRIGERANT_GWP: Partial<Record<MetricId, number>> = {
  "refrig.r410a": 0.5 * gwp("HFC-32") + 0.5 * gwp("HFC-125"),
  "refrig.r32": gwp("HFC-32"),
  "refrig.r134a": gwp("HFC-134a"),
  "refrig.r404a": 0.44 * gwp("HFC-125") + 0.52 * gwp("HFC-143a") + 0.04 * gwp("HFC-134a"),
}

// GJ per unit of each fuel or electricity metric.
export const GJ_PER_UNIT: Partial<Record<MetricId, number>> = {
  "elec.grid": 0.0036,
  "elec.re": 0.0036,
  "fuel.hsd": (DIESEL_DENSITY / 1000) * DIESEL.ncv_TJ_per_Gg!, // L → t → GJ (TJ/Gg = GJ/t)
  "fuel.vehicle": (DIESEL_DENSITY / 1000) * DIESEL_MOBILE.ncv_TJ_per_Gg!,
  "fuel.png": MMBTU_GJ * GAS_NCV_OF_GCV,
  "fuel.lpg": LPG.ncv_TJ_per_Gg! / 1000, // kg → GJ
  "fuel.biomass": BIOMASS.ncv_TJ_per_Gg!, // t → GJ
}

// tCO2 per GJ (fossil CO2 only; biomass CO2 is biogenic and reported outside Scope 1).
export const TCO2_PER_GJ: Partial<Record<MetricId, number>> = {
  "fuel.hsd": DIESEL.value / 1000,
  "fuel.vehicle": DIESEL_MOBILE.value / 1000,
  "fuel.png": GAS.value / 1000,
  "fuel.lpg": LPG.value / 1000,
}

// CH4 and N2O as tCO2e per GJ (IPCC 2006 Table 2.3, kg/TJ = g/GJ). These stay in
// Scope 1 for every fuel, biomass included.
const nonCO2 = (f: EF, biogenic = false) => ((f.ch4_kg_per_TJ ?? 0) * (biogenic ? GWP.ch4Biogenic : GWP.ch4Fossil) + (f.n2o_kg_per_TJ ?? 0) * GWP.n2o) / 1e6
export const NONCO2_TCO2E_PER_GJ: Partial<Record<MetricId, number>> = {
  "fuel.hsd": nonCO2(DIESEL),
  "fuel.vehicle": nonCO2(DIESEL_MOBILE),
  "fuel.png": nonCO2(GAS),
  "fuel.lpg": nonCO2(LPG),
  "fuel.biomass": nonCO2(BIOMASS, true),
}
export const BIOGENIC_TCO2_PER_GJ = BIOMASS.value / 1000

export const GRID_TCO2_PER_MWH = GRID.value
export const FACTOR_NOTES = [
  `Electricity: 1 kWh = 0.0036 GJ.`,
  `Diesel: density ${DIESEL_DENSITY} kg/L (within IS 1460:2017 BS VI, 810–845 kg/m³ at 15 °C; replace with the supplier's certificate of analysis), NCV ${DIESEL.ncv_TJ_per_Gg} GJ/t, ${DIESEL.value} tCO2/TJ, CH4 ${DIESEL.ch4_kg_per_TJ} and N2O ${DIESEL.n2o_kg_per_TJ} kg/TJ (${DIESEL.version}).`,
  `Natural gas: 1 MMBtu = ${MMBTU_GJ} GJ (gross, NIST SP 811), NCV taken as ${GAS_NCV_OF_GCV * 100}% of GCV (IPCC), ${GAS.value} tCO2/TJ, CH4 ${GAS.ch4_kg_per_TJ} and N2O ${GAS.n2o_kg_per_TJ} kg/TJ (${GAS.version}).`,
  `LPG: NCV ${LPG.ncv_TJ_per_Gg} GJ/t, ${LPG.value} tCO2/TJ, CH4 ${LPG.ch4_kg_per_TJ} and N2O ${LPG.n2o_kg_per_TJ} kg/TJ (${LPG.version}).`,
  `Biomass: NCV ${BIOMASS.ncv_TJ_per_Gg} GJ/t; its CO2 (${BIOMASS.value} tCO2/TJ) is biogenic and reported separately, outside Scope 1; its CH4 (${BIOMASS.ch4_kg_per_TJ} kg/TJ) and N2O (${BIOMASS.n2o_kg_per_TJ} kg/TJ) are in Scope 1.`,
  `Global warming potentials: IPCC AR6, 100-year: CH4 ${GWP.ch4Fossil} (fossil) and ${GWP.ch4Biogenic} (biogenic), N2O ${GWP.n2o}.`,
  `Grid electricity: ${GRID.value} tCO2/MWh, ${GRID.version}. Secondary sources call the FY2024-25 value provisional; confirm the current version on cea.nic.in before filing, and use the reporting year's factor when CEA publishes it.`,
  `Scope 1 here covers stationary fuel combustion (CO2, CH4 and N2O as tCO2e). Refrigerants and vehicles are not yet collected.`,
]

// The factor notes for this client's templates: vehicles and refrigerants once a gap adds them.
export function factorNotes(state: Pick<CollectionState, "added">) {
  const added = state.added ?? []
  const vehicles = added.includes("fuel.vehicle")
  const refrig = added.filter((id) => id.startsWith("refrig."))
  const notes = FACTOR_NOTES.slice(0, -1)
  if (vehicles) notes.push(`Diesel in company vehicles: same density, NCV and CO2 as stationary diesel; CH4 ${DIESEL_MOBILE.ch4_kg_per_TJ} and N2O ${DIESEL_MOBILE.n2o_kg_per_TJ} kg/TJ for road transport (${DIESEL_MOBILE.version}; check against Table 3.2.2).`)
  if (refrig.length) notes.push(`Refrigerants: kg topped up × GWP (IPCC AR6, 100-year): ${refrig.map((id) => `${METRIC_BY_ID[id].label.replace("Refrigerant top-up, ", "")} ${REFRIGERANT_GWP[id]!.toLocaleString("en-IN")}`).join(", ")}. Top-up is taken to equal leakage (GHG Protocol screening method).`)
  const scope = ["stationary fuel combustion", vehicles && "company vehicles", refrig.length && "refrigerant leaks"].filter(Boolean) as string[]
  const missing = [!refrig.length && "refrigerants", !vehicles && "vehicles"].filter(Boolean) as string[]
  notes.push(`Scope 1 here covers ${scope.length > 1 ? `${scope.slice(0, -1).join(", ")} and ${scope[scope.length - 1]}` : scope[0]} (CO2, CH4 and N2O${refrig.length ? " and HFCs" : ""} as tCO2e).${missing.length ? ` ${missing.length === 2 ? "Refrigerants and vehicles are" : `${missing[0][0].toUpperCase()}${missing[0].slice(1)} are`} not yet collected.` : ""}`)
  return notes
}

export function sitesFor(metric: Metric, sites: Site[]) {
  return sites.filter((s) => appliesTo(metric, s.type))
}

export function cell(state: CollectionState, siteId: string, metric: MetricId, month: string): Cell | undefined {
  return state.cells[cellKey(siteId, metric, month)]
}

const collected = (c?: Cell) => !!c && c.status !== "estimated"

// Sum (or month-end value) of a metric over sites for one month.
export function monthTotal(state: CollectionState, sites: Site[], metric: MetricId, month: string, opts: { includeEstimates?: boolean } = {}) {
  const m = METRIC_BY_ID[metric]
  let total = 0
  let n = 0
  let est = 0
  for (const s of sitesFor(m, sites)) {
    const c = cell(state, s.id, metric, month)
    if (!c) continue
    if (c.status === "estimated") {
      est++
      if (!opts.includeEstimates) continue
    }
    total += c.value
    n++
  }
  return { total, n, est }
}

export function periodTotal(state: CollectionState, sites: Site[], metric: MetricId, months: string[], opts: { includeEstimates?: boolean } = {}) {
  const m = METRIC_BY_ID[metric]
  if (m.stock) {
    const last = [...months].reverse().find((mo) => monthTotal(state, sites, metric, mo, opts).n > 0)
    return last ? monthTotal(state, sites, metric, last, opts).total : 0
  }
  return months.reduce((sum, mo) => sum + monthTotal(state, sites, metric, mo, opts).total, 0)
}

export type Derived = {
  electricityGJ: number
  renewableGJ: number
  fuelGJ: number
  totalGJ: number
  // tCO2e: fossil CO2 plus CH4 and N2O from every fuel, vehicles and refrigerant leaks.
  scope1: number
  scope1Parts: { stationary: number; mobile: number; fugitive: number }
  // Biogenic CO2 from biomass, reported outside Scope 1.
  biogenicCO2: number
  scope2: number
  ltifr?: number
  // Once person-hours and injuries for employees are collected; workers are the rest.
  ltifrEmployees?: number
  ltifrWorkers?: number
  splitMonths: number
  waterWithdrawal: number
  waste: number
  production: number
}

export function derivedTotals(state: CollectionState, sites: Site[], months: string[], opts: { includeEstimates?: boolean } = {}): Derived {
  const t = (id: MetricId) => periodTotal(state, sites, id, months, opts)
  const gridKwh = t("elec.grid")
  const reKwh = t("elec.re")
  const fuels: MetricId[] = ["fuel.hsd", "fuel.png", "fuel.lpg", "fuel.biomass", "fuel.vehicle"]
  const fuelGJ = fuels.reduce((sum, id) => sum + t(id) * (GJ_PER_UNIT[id] ?? 0), 0)
  const co2e = (id: MetricId) => t(id) * (GJ_PER_UNIT[id] ?? 0) * ((TCO2_PER_GJ[id] ?? 0) + (NONCO2_TCO2E_PER_GJ[id] ?? 0))
  const stationary = ["fuel.hsd", "fuel.png", "fuel.lpg", "fuel.biomass"].reduce((sum, id) => sum + co2e(id as MetricId), 0)
  const mobile = co2e("fuel.vehicle")
  const fugitive = (Object.keys(REFRIGERANT_GWP) as MetricId[]).reduce((sum, id) => sum + (t(id) * REFRIGERANT_GWP[id]!) / 1000, 0)
  const biogenicCO2 = t("fuel.biomass") * (GJ_PER_UNIT["fuel.biomass"] ?? 0) * BIOGENIC_TCO2_PER_GJ
  const hours = t("safety.hours")
  // The employee/worker split covers only the months where employees' hours were collected,
  // so workers (the rest) come from the same months' totals.
  const splitMonths = months.filter((mo) => monthTotal(state, sites, "safety.hours.emp", mo, opts).n > 0)
  const ts = (id: MetricId) => periodTotal(state, sites, id, splitMonths, opts)
  const hoursEmp = ts("safety.hours.emp")
  const ltiEmp = ts("safety.lti.emp")
  const hoursSplit = ts("safety.hours")
  const ltiSplit = ts("safety.lti")
  return {
    electricityGJ: (gridKwh + reKwh) * 0.0036,
    renewableGJ: reKwh * 0.0036,
    fuelGJ,
    totalGJ: (gridKwh + reKwh) * 0.0036 + fuelGJ,
    scope1: stationary + mobile + fugitive,
    scope1Parts: { stationary, mobile, fugitive },
    biogenicCO2,
    scope2: (gridKwh / 1000) * GRID_TCO2_PER_MWH,
    ltifr: hours ? (t("safety.lti") * 1_000_000) / hours : undefined,
    ltifrEmployees: hoursEmp ? (ltiEmp * 1_000_000) / hoursEmp : undefined,
    ltifrWorkers: hoursEmp && hoursSplit > hoursEmp ? ((ltiSplit - ltiEmp) * 1_000_000) / (hoursSplit - hoursEmp) : undefined,
    splitMonths: splitMonths.length,
    waterWithdrawal: t("water.ground") + t("water.third") + t("water.surface"),
    waste: t("waste.haz") + t("waste.plastic") + t("waste.other"),
    production: t("prod.output"),
  }
}

// Expected cells: every applicable site × required metric × month.
export function completeness(state: CollectionState, sites: Site[], months: string[], metrics: Metric[] = activeMetrics(state)) {
  let expected = 0
  let have = 0
  let est = 0
  let approved = 0
  for (const m of metrics) {
    for (const s of sitesFor(m, sites)) {
      for (const mo of months) {
        const c = cell(state, s.id, m.id, mo)
        if (m.optional && !c) continue
        expected++
        if (!c) continue
        if (c.status === "estimated") est++
        else {
          have++
          if (c.status === "approved") approved++
        }
      }
    }
  }
  return { expected, have, est, approved, missing: expected - have - est, share: expected ? have / expected : 0 }
}

export type Flag = { key: string; siteId: string; metric: MetricId; month: string; kind: "jump" | "evidence" | "estimate" | "pf"; text: string }

export function flags(state: CollectionState, sites: Site[], months: string[]): Flag[] {
  const out: Flag[] = []
  for (const m of activeMetrics(state)) {
    for (const s of sitesFor(m, sites)) {
      months.forEach((mo, i) => {
        const c = cell(state, s.id, m.id, mo)
        if (!c) return
        const key = cellKey(s.id, m.id, mo)
        if (c.status !== "estimated" && !c.evidence?.trim()) out.push({ key, siteId: s.id, metric: m.id, month: mo, kind: "evidence", text: `${s.name} · ${m.label}: no evidence attached` })
        const prev = i > 0 ? cell(state, s.id, m.id, months[i - 1]) : undefined
        if (prev && collected(prev) && collected(c) && prev.value > 0 && !m.stock && m.id !== "safety.lti" && m.id !== "safety.lti.emp" && m.topic !== "Refrigerants") {
          const change = (c.value - prev.value) / prev.value
          if (Math.abs(change) > 0.3) out.push({ key, siteId: s.id, metric: m.id, month: mo, kind: "jump", text: `${s.name} · ${m.label}: ${change > 0 ? "+" : ""}${Math.round(change * 100)}% on the month before` })
        }
        if (m.id === "elec.grid") {
          const kvah = cell(state, s.id, "elec.kvah", mo)
          if (kvah && collected(kvah) && collected(c) && kvah.value > 0) {
            const pf = c.value / kvah.value
            if (pf > 1 || pf < 0.85) out.push({ key, siteId: s.id, metric: m.id, month: mo, kind: "pf", text: `${s.name}: kWh ÷ kVAh = ${pf.toFixed(2)}, outside 0.85–1.00` })
          }
        }
      })
    }
  }
  return out
}

// Share of required cells collected (not estimated) for the BRSR questions a metric feeds, over the given months.
export function brsrCoverage(state: CollectionState, sites: Site[], months: string[]): Record<string, { share: number; approved: number; expected: number }> {
  const out: Record<string, { share: number; approved: number; expected: number }> = {}
  const active = activeMetrics(state)
  const ids = [...new Set(active.flatMap((m) => m.brsr))]
  for (const id of ids) {
    const ms = active.filter((m) => m.brsr.includes(id) && !m.optional)
    if (!ms.length) continue
    const c = completeness(state, sites, months, ms)
    out[id] = { share: c.share, approved: c.approved, expected: c.expected }
  }
  return out
}

// Plausible monthly values for the fictional sample only (simulated owner returns).
export function exampleValue(metric: MetricId, site: Site, month: string): number {
  const h = [...`${site.id}${metric}${month}`].reduce((n, ch) => (n * 33 + ch.charCodeAt(0)) % 100003, 11)
  const wobble = 0.9 + (h % 21) / 100
  const base: Record<MetricId, number> = {
    "elec.grid": 1_600_000,
    "elec.re": 520_000,
    "elec.kvah": 1_700_000,
    "fuel.hsd": 6_000,
    "fuel.png": 4_200,
    "fuel.lpg": 0,
    "fuel.biomass": 0,
    "water.ground": 9_500,
    "water.third": 1_800,
    "water.discharge": 6_200,
    "waste.haz": 1.6,
    "waste.plastic": 9,
    "waste.other": 38,
    "prod.output": 2_400,
    "hr.headcount": 620,
    "safety.hours": 140_000,
    "safety.lti": 0,
    "fuel.vehicle": 900,
    "refrig.r410a": 3,
    "refrig.r32": 1.5,
    "refrig.r134a": 4,
    "refrig.r404a": 6,
    "water.surface": 0,
    "safety.hours.emp": 58_000,
    "safety.lti.emp": 0,
  }
  if (metric === "safety.lti") return h % 7 === 0 ? 1 : 0
  // Employees' injuries are a subset of all injuries.
  if (metric === "safety.lti.emp") return exampleValue("safety.lti", site, month) && h % 2 === 0 ? 1 : 0
  // Refrigerant is topped up at service visits, not every month.
  if (metric.startsWith("refrig.") && h % 4 !== 0) return 0
  if (site.type !== "factory") return metric === "elec.grid" ? Math.round(42_000 * wobble) : metric === "hr.headcount" ? Math.round(85 * wobble) : 0
  const v = base[metric] * wobble
  return v >= 100 ? Math.round(v) : Math.round(v * 10) / 10
}
