// Haldiram's own energy workbook (Energy_Consumption_Estimated.xlsx, CY 2025),
// turned into energy rows for the plants it names. The workbook is in kVAh and
// mixes readings with estimates; both are carried through and flagged.

import data from "./data/haldiram-energy.json"
import type { EnergyRow } from "../imports"
import type { EnergyFileSummary } from "./types"

export type EnergyFile = typeof data
export const ENERGY_FILE: EnergyFile = data

// kVAh to kWh needs each plant's power factor. The file has none, so a planning
// value is used and shown on every converted figure.
export const ASSUMED_PF = 0.98

export const FILE_LABEL = "client energy file, CY 2025"

const KIND_TEXT: Record<string, string> = {
  average: "the average of other months",
  copied: "copied from another month",
  derived: "a combined reading divided by three",
  repeated: "the same value typed every month",
  load: "connected load × hours × load factor",
}

// How the months that are not readings were filled in, in words.
export function basisFor(p: EnergyFile["plants"][number]): string | undefined {
  const kinds = [...new Set(p.kind.filter((k) => k !== "typed" && k !== "none"))]
  if (!kinds.length) return undefined
  const parts = kinds.map((k) => (k === "load" && p.loadBasis ? `${KIND_TEXT.load} (${p.loadBasis})` : KIND_TEXT[k] ?? k))
  return parts.join(", ")
}

export function monthsText(p: EnergyFile["plants"][number]): string {
  const op = p.operatingMonths
  return `${p.actualMonths} of ${op} operating month${op === 1 ? "" : "s"} are readings`
}

// One row per plant in the workbook, keyed to the site name it maps to.
export function energyRows(siteNameFor: Record<string, string>): EnergyRow[] {
  return data.plants
    .filter((p) => siteNameFor[p.name])
    .map((p) => {
      const mwh = Math.round((p.totalKvah * ASSUMED_PF) / 1000)
      const completeness = p.operatingMonths ? p.actualMonths / p.operatingMonths : 0
      const basis = basisFor(p)
      return {
        site: siteNameFor[p.name],
        ergosSiteId: `FILE-${p.name.replace(/[^A-Za-z0-9]+/g, "").toUpperCase()}`,
        period: data.period,
        annualMWh: mwh,
        gridShare: 1,
        solarShare: 0,
        windShare: 0,
        rooftopShare: 0,
        exchangeShare: 0,
        completeness: +completeness.toFixed(2),
        meters: ["grid"],
        label: FILE_LABEL,
        basis,
        exact: true,
        note: `Workbook row "${p.name}": ${Math.round(p.totalKvah).toLocaleString("en-IN")} kVAh in ${data.period}; ${monthsText(p)}${basis ? `, the rest are ${basis}` : ""}. Converted at an assumed power factor of ${ASSUMED_PF}. Group solar is not allocated to plants.`,
      }
    })
}

export const fileSummary = {
  totalKvah: data.totalKvah,
  actualShare: data.actualKvah / data.totalKvah,
  totalMWhAssumed: Math.round((data.totalKvah * ASSUMED_PF) / 1000),
  solarMWh: Math.round(data.solar.annualKwh / 1000),
  solarBasis: data.solar.basis,
  greenShareAsComputed: data.greenShareAsComputed,
  // The file divides solar kWh by grid kVAh; on a like-for-like kWh basis the share is lower.
  greenShareKwh: data.solar.annualKwh / (data.solar.annualKwh + data.totalKvah * ASSUMED_PF),
}

export function energyFileSummary(siteNameFor: Record<string, string>, caveats: string[]): EnergyFileSummary {
  return {
    file: data.file,
    providedBy: data.providedBy,
    period: data.period,
    unit: data.unit,
    months: data.months,
    totalKvah: data.totalKvah,
    actualShare: fileSummary.actualShare,
    powerFactor: ASSUMED_PF,
    mwhAssumed: fileSummary.totalMWhAssumed,
    solar: { mwh: fileSummary.solarMWh, basis: fileSummary.solarBasis },
    greenShareAsComputed: fileSummary.greenShareAsComputed,
    greenShareKwh: fileSummary.greenShareKwh,
    kindLegend: data.kindLegend,
    plants: data.plants.map((p) => ({ name: p.name, site: siteNameFor[p.name] ?? p.name, kvah: p.totalKvah, actualMonths: p.actualMonths, operatingMonths: p.operatingMonths, kinds: p.kind, monthly: p.monthly, basis: basisFor(p) })),
    caveats,
  }
}
