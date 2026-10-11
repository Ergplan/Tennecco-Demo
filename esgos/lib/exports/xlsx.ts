// Excel deliverables: the data collection templates (one sheet per topic, with
// formulas for totals, GJ, Scope 1 and 2 and LTIFR) and the completed BRSR data
// workbook (the same sheets filled from the collection, plus company data, the
// readiness register, gap register, document review, interviews, review log,
// checks, assumptions and the test report answers).
//
// Every formula is written with its result, computed here the same way the
// formula computes it, so totals show in any viewer (Numbers, Quick Look, phone
// previews, the in-app workbook view) before Excel recalculates.

import ExcelJS from "exceljs"
import { CATEGORY_LABEL, OUTCOME_LABEL } from "../documents/review"
import { activeMetrics, activeTopics, cellKey, monthLabel, type Metric, type MetricId, type Topic } from "../collection/model"
import { BIOGENIC_TCO2_PER_GJ, GJ_PER_UNIT, GRID_TCO2_PER_MWH, GWP, NONCO2_TCO2E_PER_GJ, REFRIGERANT_GWP, TCO2_PER_GJ, DIESEL_DENSITY, GAS_NCV_OF_GCV, MMBTU_GJ } from "../collection/calc"
import { ANNUAL_FIELDS, type AnnualId } from "../collection/annual"
import { REFERENCE } from "../reference"
import { RATING_LABEL, SYSTEM_LABEL } from "../interviews/plan"
import { answerAll, PRINCIPLE_NAMES } from "./answers"
import { stripFormat } from "./testReport"
import { sessionOwner, sessionStatus } from "../reportReview"
import { fmtDate, type ReportModel } from "./model"
import type { Site } from "../types"

// ----------------------------------------------------------------- styles
export const XL = {
  ink: "FF0F172A",
  head: "FF1E293B",
  muted: "FF64748B",
  line: "FFE2E8F0",
  input: "FFFFFBEB",
  est: "FFFDE7C2",
  ok: "FFD8F3E6",
  calc: "FFF1F5F9",
  green: "FF059669",
  amber: "FFD97706",
  rose: "FFE11D48",
  blue: "FF2563EB",
}
const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } })
const HEAD_FILL = fill(XL.head)
const EST_FILL = fill(XL.est)
const OK_FILL = fill(XL.ok)
const INPUT_FILL = fill(XL.input)
const CALC_FILL = fill(XL.calc)
const FONT = "Calibri"
const thin = { style: "thin" as const, color: { argb: XL.line } }

type Result = number | string | undefined
const F = (formula: string, result: Result): ExcelJS.CellFormulaValue => ({ formula, result: result === undefined ? "" : result, date1904: false })
const blank = (v: number | undefined): Result => (v === undefined ? "" : v)

// ----------------------------------------------------------------- factors
// Derived factors are formulas over the inputs above them, so changing a density
// or calorific value recalculates every sheet.
type FactorRow = { name: string; label: string; value: number; formula?: string; unit: string; source: string }
const IPCC = "IPCC 2006 Vol 2, Table 1.2 (NCV) and Table 2.3 (CO2, CH4, N2O)"
const ef = (id: string) => (REFERENCE.emissionFactors as unknown as { id: string; value: number; ncv_TJ_per_Gg: number; ch4_kg_per_TJ: number; n2o_kg_per_TJ: number }[]).find((e) => e.id === id)!
const D = ef("ef.fuel.diesel")
const DM = ef("ef.fuel.diesel-mobile")
const G = ef("ef.fuel.natural-gas")
const L = ef("ef.fuel.lpg")
const B = ef("ef.fuel.other-solid-biomass")
const FACTOR_ROWS: FactorRow[] = [
  { name: "GJ_per_kWh", label: "Electricity", value: 0.0036, unit: "GJ per kWh", source: "Definition: 1 kWh = 3.6 MJ (NIST SP 811)" },
  { name: "Diesel_density", label: "Diesel density", value: DIESEL_DENSITY, unit: "kg per litre", source: "Within IS 1460:2017 (BS VI) 810–845 kg/m³ at 15 °C; replace with the supplier's certificate of analysis" },
  { name: "NCV_diesel", label: "Diesel net calorific value", value: D.ncv_TJ_per_Gg, unit: "GJ per tonne", source: IPCC },
  { name: "GJ_per_L_diesel", label: "Diesel energy", value: GJ_PER_UNIT["fuel.hsd"]!, formula: "Diesel_density/1000*NCV_diesel", unit: "GJ per litre", source: "Density × NCV" },
  { name: "GJ_per_MMBtu", label: "MMBtu", value: MMBTU_GJ, unit: "GJ per MMBtu", source: "NIST SP 811: 1 Btu(IT) = 1,055.05585262 J" },
  { name: "NCV_over_GCV_gas", label: "Natural gas NCV ÷ GCV", value: GAS_NCV_OF_GCV, unit: "ratio", source: "IPCC: NCV about 10% below GCV for natural gas; bills are on a gross basis" },
  { name: "GJ_per_MMBtu_gas", label: "Natural gas energy", value: GJ_PER_UNIT["fuel.png"]!, formula: "GJ_per_MMBtu*NCV_over_GCV_gas", unit: "GJ (net) per MMBtu (gross)", source: "MMBtu × NCV/GCV" },
  { name: "NCV_LPG", label: "LPG net calorific value", value: L.ncv_TJ_per_Gg, unit: "GJ per tonne", source: IPCC },
  { name: "GJ_per_kg_LPG", label: "LPG energy", value: GJ_PER_UNIT["fuel.lpg"]!, formula: "NCV_LPG/1000", unit: "GJ per kg", source: "NCV ÷ 1000" },
  { name: "GJ_per_t_biomass", label: "Biomass energy", value: GJ_PER_UNIT["fuel.biomass"]!, unit: "GJ per tonne", source: `${IPCC} (other primary solid biomass); a measured NCV for briquettes is better` },
  { name: "tCO2_per_GJ_diesel", label: "Diesel CO2", value: TCO2_PER_GJ["fuel.hsd"]!, unit: "tCO2 per GJ", source: `${IPCC}: ${D.value} tCO2/TJ` },
  { name: "tCO2_per_GJ_gas", label: "Natural gas CO2", value: TCO2_PER_GJ["fuel.png"]!, unit: "tCO2 per GJ", source: `${IPCC}: ${G.value} tCO2/TJ` },
  { name: "tCO2_per_GJ_LPG", label: "LPG CO2", value: TCO2_PER_GJ["fuel.lpg"]!, unit: "tCO2 per GJ", source: `${IPCC}: ${L.value} tCO2/TJ` },
  { name: "tCO2_per_GJ_biomass_biogenic", label: "Biomass CO2 (biogenic, outside Scope 1)", value: BIOGENIC_TCO2_PER_GJ, unit: "tCO2 per GJ", source: `${IPCC}: ${B.value} tCO2/TJ; GHG Protocol: reported separately` },
  { name: "GWP_CH4_fossil", label: "GWP methane, fossil", value: GWP.ch4Fossil, unit: "tCO2e per t", source: "IPCC AR6 WG1 Table 7.15, 100-year" },
  { name: "GWP_CH4_biogenic", label: "GWP methane, biogenic", value: GWP.ch4Biogenic, unit: "tCO2e per t", source: "IPCC AR6 WG1 Table 7.15, 100-year" },
  { name: "GWP_N2O", label: "GWP nitrous oxide", value: GWP.n2o, unit: "tCO2e per t", source: "IPCC AR6 WG1 Table 7.15, 100-year" },
  { name: "nonCO2_per_GJ_diesel", label: "Diesel CH4 and N2O", value: NONCO2_TCO2E_PER_GJ["fuel.hsd"]!, formula: `(${D.ch4_kg_per_TJ}*GWP_CH4_fossil+${D.n2o_kg_per_TJ}*GWP_N2O)/1000000`, unit: "tCO2e per GJ", source: `${IPCC}: CH4 ${D.ch4_kg_per_TJ}, N2O ${D.n2o_kg_per_TJ} kg/TJ` },
  { name: "nonCO2_per_GJ_diesel_vehicles", label: "Diesel in vehicles, CH4 and N2O", value: NONCO2_TCO2E_PER_GJ["fuel.vehicle"]!, formula: `(${DM.ch4_kg_per_TJ}*GWP_CH4_fossil+${DM.n2o_kg_per_TJ}*GWP_N2O)/1000000`, unit: "tCO2e per GJ", source: `IPCC 2006 Vol 2, Table 3.2.2 (road transport, diesel): CH4 ${DM.ch4_kg_per_TJ}, N2O ${DM.n2o_kg_per_TJ} kg/TJ; check against the table` },
  { name: "nonCO2_per_GJ_gas", label: "Natural gas CH4 and N2O", value: NONCO2_TCO2E_PER_GJ["fuel.png"]!, formula: `(${G.ch4_kg_per_TJ}*GWP_CH4_fossil+${G.n2o_kg_per_TJ}*GWP_N2O)/1000000`, unit: "tCO2e per GJ", source: `${IPCC}: CH4 ${G.ch4_kg_per_TJ}, N2O ${G.n2o_kg_per_TJ} kg/TJ` },
  { name: "nonCO2_per_GJ_LPG", label: "LPG CH4 and N2O", value: NONCO2_TCO2E_PER_GJ["fuel.lpg"]!, formula: `(${L.ch4_kg_per_TJ}*GWP_CH4_fossil+${L.n2o_kg_per_TJ}*GWP_N2O)/1000000`, unit: "tCO2e per GJ", source: `${IPCC}: CH4 ${L.ch4_kg_per_TJ}, N2O ${L.n2o_kg_per_TJ} kg/TJ` },
  { name: "nonCO2_per_GJ_biomass", label: "Biomass CH4 and N2O", value: NONCO2_TCO2E_PER_GJ["fuel.biomass"]!, formula: `(${B.ch4_kg_per_TJ}*GWP_CH4_biogenic+${B.n2o_kg_per_TJ}*GWP_N2O)/1000000`, unit: "tCO2e per GJ", source: `${IPCC}: CH4 ${B.ch4_kg_per_TJ}, N2O ${B.n2o_kg_per_TJ} kg/TJ` },
  { name: "GWP_R410A", label: "GWP R-410A (refrigerant blend)", value: REFRIGERANT_GWP["refrig.r410a"]!, unit: "tCO2e per t", formula: "0.5*771+0.5*3740", source: "IPCC AR6, 100-year: 50% HFC-32 (771) and 50% HFC-125 (3,740) by mass" },
  { name: "GWP_R32", label: "GWP R-32 (HFC-32)", value: REFRIGERANT_GWP["refrig.r32"]!, unit: "tCO2e per t", source: "IPCC AR6, 100-year (GHG Protocol GWP table, Aug 2024)" },
  { name: "GWP_R134a", label: "GWP R-134a (HFC-134a)", value: REFRIGERANT_GWP["refrig.r134a"]!, unit: "tCO2e per t", source: "IPCC AR6, 100-year (GHG Protocol GWP table, Aug 2024)" },
  { name: "GWP_R404A", label: "GWP R-404A (refrigerant blend)", value: REFRIGERANT_GWP["refrig.r404a"]!, unit: "tCO2e per t", formula: "0.44*3740+0.52*5810+0.04*1530", source: "IPCC AR6, 100-year: 44% HFC-125 (3,740), 52% HFC-143a (5,810), 4% HFC-134a (1,530) by mass" },
  { name: "tCO2_per_MWh_grid", label: "Grid electricity", value: GRID_TCO2_PER_MWH, unit: "tCO2 per MWh", source: "CEA CO2 Baseline Database v21.0 (FY2024-25 weighted average; called provisional by secondary sources). Confirm on cea.nic.in and use the reporting year's factor when published" },
]
const FACTOR = Object.fromEntries(FACTOR_ROWS.map((f) => [f.name, f.value])) as Record<string, number>

const GJ_NAME: Partial<Record<MetricId, string>> = { "elec.grid": "GJ_per_kWh", "elec.re": "GJ_per_kWh", "fuel.hsd": "GJ_per_L_diesel", "fuel.vehicle": "GJ_per_L_diesel", "fuel.png": "GJ_per_MMBtu_gas", "fuel.lpg": "GJ_per_kg_LPG", "fuel.biomass": "GJ_per_t_biomass" }
// Scope 1 per GJ: fossil CO2 plus CH4 and N2O (biomass: CH4 and N2O only).
const CO2E_FORMULA: Partial<Record<MetricId, [string, number]>> = {
  "fuel.hsd": ["(tCO2_per_GJ_diesel+nonCO2_per_GJ_diesel)", TCO2_PER_GJ["fuel.hsd"]! + NONCO2_TCO2E_PER_GJ["fuel.hsd"]!],
  "fuel.vehicle": ["(tCO2_per_GJ_diesel+nonCO2_per_GJ_diesel_vehicles)", TCO2_PER_GJ["fuel.vehicle"]! + NONCO2_TCO2E_PER_GJ["fuel.vehicle"]!],
  "fuel.png": ["(tCO2_per_GJ_gas+nonCO2_per_GJ_gas)", TCO2_PER_GJ["fuel.png"]! + NONCO2_TCO2E_PER_GJ["fuel.png"]!],
  "fuel.lpg": ["(tCO2_per_GJ_LPG+nonCO2_per_GJ_LPG)", TCO2_PER_GJ["fuel.lpg"]! + NONCO2_TCO2E_PER_GJ["fuel.lpg"]!],
  "fuel.biomass": ["nonCO2_per_GJ_biomass", NONCO2_TCO2E_PER_GJ["fuel.biomass"]!],
}
const REFRIG_NAME: Partial<Record<MetricId, string>> = { "refrig.r410a": "GWP_R410A", "refrig.r32": "GWP_R32", "refrig.r134a": "GWP_R134a", "refrig.r404a": "GWP_R404A" }

export function colLetter(n: number) {
  let s = ""
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 30
  row.eachCell((c) => {
    c.fill = HEAD_FILL
    c.font = { name: FONT, bold: true, size: 10, color: { argb: "FFFFFFFF" } }
    c.alignment = { vertical: "middle", wrapText: true }
  })
}

function title(ws: ExcelJS.Worksheet, text: string, sub?: string) {
  const r = ws.addRow([text])
  r.font = { name: FONT, bold: true, size: 15, color: { argb: XL.ink } }
  r.height = 24
  if (sub) {
    const s = ws.addRow([sub])
    s.font = { name: FONT, italic: true, size: 10, color: { argb: XL.muted } }
  }
  ws.addRow([])
}

// Lines, wrapping and print set-up for a register sheet.
function finish(ws: ExcelJS.Worksheet, opts: { from?: number; wrap?: boolean; landscape?: boolean; company: string } ) {
  const from = opts.from ?? 2
  ws.eachRow((row, n) => {
    if (n < from) return
    row.eachCell((c) => {
      c.border = { bottom: thin }
      if (!c.font?.name) c.font = { ...(c.font ?? {}), name: FONT, size: 10 }
      if (opts.wrap) c.alignment = { ...(c.alignment ?? {}), wrapText: true, vertical: "top" }
    })
  })
  ws.pageSetup = { orientation: opts.landscape === false ? "portrait" : "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } }
  ws.headerFooter = { oddHeader: `&L&8${opts.company} · BRSR data workbook&R&8&A`, oddFooter: "&L&8For internal review · not for publication&R&8Page &P of &N" }
}

function addFactors(wb: ExcelJS.Workbook, company: string) {
  const ws = wb.addWorksheet("Factors", { properties: { tabColor: { argb: XL.muted } } })
  ws.columns = [{ width: 30 }, { width: 34 }, { width: 14 }, { width: 26 }, { width: 80 }]
  styleHeader(ws.addRow(["Name", "Factor", "Value", "Unit", "Source"]))
  FACTOR_ROWS.forEach((f, i) => {
    const r = ws.addRow([f.name, f.label, f.formula ? F(f.formula, f.value) : f.value, f.unit, f.source])
    r.getCell(3).numFmt = f.value < 0.01 ? "0.000000" : "#,##0.####"
    r.getCell(3).fill = f.formula ? CALC_FILL : INPUT_FILL
    wb.definedNames.add(`Factors!$C$${i + 2}`, f.name)
  })
  ws.addRow([])
  ws.addRow(["", "Yellow values are inputs: change one and every sheet recalculates. Grey values are formulas over them."]).font = { name: FONT, italic: true, size: 10, color: { argb: XL.muted } }
  ws.views = [{ state: "frozen", ySplit: 1 }]
  finish(ws, { company, wrap: true })
}

function addReadme(wb: ExcelJS.Workbook, m: ReportModel, filled: boolean, sheets: string[]) {
  const ws = wb.addWorksheet("Read me", { properties: { tabColor: { argb: XL.ink } }, views: [{ showGridLines: false }] })
  ws.columns = [{ width: 3 }, { width: 26 }, { width: 100 }]
  const t = ws.addRow(["", filled ? "BRSR data workbook" : "BRSR data collection templates"])
  t.font = { name: FONT, bold: true, size: 20, color: { argb: XL.ink } }
  t.height = 30
  ws.addRow(["", `${m.client.legalName} · ${m.fy} (${m.period})`]).font = { name: FONT, size: 12, color: { argb: XL.muted } }
  if (filled) {
    const w = ws.addRow(["", "TEST REPORT DATA · FOR INTERNAL REVIEW · NOT FOR PUBLICATION"])
    w.font = { name: FONT, bold: true, size: 10, color: { argb: XL.rose } }
  }
  ws.addRow([])
  const rows: [string, string][] = [
    ["Prepared", `${fmtDate(m.generatedAt)} by ${m.preparedBy}`],
    ["Purpose", filled ? "The data behind the BRSR test report: every value collected so far with its source and status, the company data, the readiness and gap registers, the document review, interview answers, the review with data owners, the checks, the assumptions and the answer to every question." : "One workbook per year. Each plant's data owners enter monthly values in the yellow cells; totals, energy in GJ, Scope 1 and 2 and LTIFR calculate automatically. Finance enters the company data once a year."],
    ["How to use", "Enter one value per site, metric and month in the month columns (yellow). Leave a cell blank if the plant has none of that item. Keep the evidence named in column G. Do not overwrite the grey formula columns on the right."],
    ["Deadline", "By the 10th of the following month. Review by the 15th; the month is closed by the 20th (see the procedures)."],
    ["Estimates", filled ? "Amber cells are estimates and never count: the cell note carries the estimate, and the Summary lists estimates in a separate column. Green cells are reviewed and approved. Every cell note shows the source, evidence and who entered it." : "If a value must be estimated, enter it in the collection log with a note on how it was made; it stays marked as an estimate."],
    ["Factors", "All conversion and emission factors are on the Factors sheet with their sources. They are named ranges, so the formulas read in words."],
    ["Boundary", m.boundary],
  ]
  for (const [a, b] of rows) {
    const r = ws.addRow(["", a, b])
    r.getCell(2).font = { name: FONT, bold: true, size: 10 }
    r.getCell(3).font = { name: FONT, size: 10 }
    r.getCell(3).alignment = { wrapText: true, vertical: "top" }
    r.getCell(2).alignment = { vertical: "top" }
  }
  ws.addRow([])
  ws.addRow(["", "Contents"]).font = { name: FONT, bold: true, size: 12, color: { argb: XL.ink } }
  for (const name of sheets) {
    const r = ws.addRow(["", { text: name, hyperlink: `#'${name}'!A1` }, SHEET_HELP[name] ?? ""])
    r.getCell(2).font = { name: FONT, size: 10, color: { argb: XL.blue }, underline: true }
    r.getCell(3).font = { name: FONT, size: 10, color: { argb: XL.muted } }
  }
  ws.pageSetup = { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }
}

const SHEET_HELP: Record<string, string> = {
  Summary: "Every BRSR total as a formula over the topic sheets, collected values only.",
  "Company data": "Turnover, net worth, payables, purchases and spend from the audited financial statements, and the ratios BRSR asks for.",
  Energy: "Electricity and fuels by site and month, converted to GJ and tCO2e.",
  Refrigerants: "Refrigerant top-ups by site and month, converted to tCO2e.",
  Water: "Withdrawal by source and discharge by site and month.",
  Waste: "Hazardous, plastic and other waste by site and month.",
  Production: "Production by plant and month, for intensities.",
  "People and safety": "Headcount, person-hours and lost-time injuries by site and month.",
  Sites: "Every site in the boundary with its named data owners.",
  Factors: "Conversion and emission factors with their sources.",
  "Collection log": "Every value collected with status, source, evidence and who entered it.",
  "BRSR readiness": "Every BRSR question and implementation item: status, gap, recommendation, owner, effort, milestone.",
  "ISSB map": "IFRS S1 and S2 requirements mapped to BRSR.",
  "Gap register": "Open items ranked by score.",
  "Document review": "Desktop review of policies, procedures and plant records.",
  Interviews: "Management interview answers.",
  "Review log": "Review sessions with data owners and their queries.",
  Checks: "Month-on-month jumps, power factor and missing evidence.",
  Assumptions: "Every assumption and limitation behind the numbers.",
  "Test report answers": "The answer to every BRSR question, as in the test report.",
}

function addSites(wb: ExcelJS.Workbook, m: ReportModel) {
  const ws = wb.addWorksheet("Sites", { properties: { tabColor: { argb: XL.muted } } })
  const metrics = activeMetrics(m.state.collection)
  const roles = [...new Set(metrics.map((x) => x.owner))]
  ws.columns = [{ width: 34 }, { width: 22 }, { width: 10 }, { width: 18 }, { width: 18 }, ...roles.map(() => ({ width: 26 }))]
  styleHeader(ws.addRow(["Site", "Site ID", "Type", "City", "State", ...roles]))
  for (const s of m.sites) {
    const names = roles.map((r) => {
      const p = m.state.stakeholders.find((x) => x.siteId === s.id && x.role === r && !x.vacant) ?? m.state.stakeholders.find((x) => !x.siteId && x.role === r && !x.vacant)
      return p?.name ?? `${r} (to be named)`
    })
    ws.addRow([s.name, s.id, s.type, s.city, s.state, ...names])
  }
  ws.views = [{ state: "frozen", ySplit: 1 }]
  ws.autoFilter = { from: "A1", to: `${colLetter(5 + roles.length)}1` }
  finish(ws, { company: m.client.shortName })
}

// Per-metric results of a topic sheet, the same way its formulas add up.
type Acc = { total: number; gj: number; co2: number; n: number }
const HEAD_ROW = 4

// One sheet per topic. Returns where the totals are and what they add up to.
function addTopic(wb: ExcelJS.Workbook, m: ReportModel, topic: Topic, filled: boolean) {
  const ws = wb.addWorksheet(topic, { properties: { tabColor: { argb: XL.blue } } })
  const months = m.collection.months.length ? m.collection.months : []
  const first = 8
  const last = first + months.length - 1
  const totalCol = last + 1
  const conv = topic === "Energy" || topic === "Refrigerants"
  ws.columns = [{ width: 30 }, { width: 18 }, { width: 13 }, { width: 34 }, { width: 9 }, { width: 18 }, { width: 30 }, ...months.map(() => ({ width: 11 })), { width: 13 }, ...(conv ? [{ width: 12 }, { width: 12 }] : [])]
  title(ws, `${m.client.shortName} · ${topic} · ${m.fy}`, filled ? "Collected values (estimates are in the cell notes, not counted). Totals and conversions calculate on the right." : "Enter monthly values in the yellow cells. Totals and conversions calculate on the right.")
  const head = ws.addRow(["Site", "Site ID", "Metric ID", "Metric", "Unit", "Owner", "Evidence", ...months.map((x) => monthLabel(x)), "Year total", ...(conv ? ["GJ", "tCO2e"] : [])])
  styleHeader(head)
  ws.views = [{ state: "frozen", xSplit: 7, ySplit: HEAD_ROW }]
  const metrics = activeMetrics(m.state.collection).filter((x) => x.topic === topic)
  const rowsFor = (mt: Metric) => m.sites.filter((s: Site) => mt.siteTypes.includes(s.type))
  const acc: Partial<Record<MetricId, Acc>> = {}
  for (const mt of metrics) {
    const a: Acc = (acc[mt.id] = { total: 0, gj: 0, co2: 0, n: 0 })
    for (const s of rowsFor(mt)) {
      // Estimates stay out of the month cells (and so out of every total); the cell
      // note carries the estimate, as the collection log does.
      const values = months.map((mo) => {
        const c = filled ? m.state.collection.cells[cellKey(s.id, mt.id, mo)] : undefined
        return c && c.status !== "estimated" ? c.value : null
      })
      const r = ws.addRow([s.name, s.id, mt.id, mt.label, mt.unit, mt.owner, mt.evidence, ...values])
      const rn = r.number
      const range = `${colLetter(first)}${rn}:${colLetter(last)}${rn}`
      const present = values.filter((v): v is number => v !== null)
      const total = present.length ? (mt.stock ? present[present.length - 1] : present.reduce((x, y) => x + y, 0)) : undefined
      r.getCell(totalCol).value = mt.stock ? F(`IF(COUNT(${range})=0,"",LOOKUP(2,1/(${range}<>""),${range}))`, blank(total)) : F(`IF(COUNT(${range})=0,"",SUM(${range}))`, blank(total))
      if (total !== undefined) {
        a.total += total
        a.n++
      }
      if (conv) {
        const T = `${colLetter(totalCol)}${rn}`
        const gj = GJ_NAME[mt.id]
        if (gj) {
          const v = total === undefined ? undefined : total * FACTOR[gj]
          r.getCell(totalCol + 1).value = F(`IF(${T}="","",${T}*${gj})`, blank(v))
          if (v !== undefined) a.gj += v
        }
        const co2 = CO2E_FORMULA[mt.id]
        if (co2 && gj) {
          const v = total === undefined ? undefined : total * FACTOR[gj] * co2[1]
          r.getCell(totalCol + 2).value = F(`IF(${T}="","",${T}*${gj}*${co2[0]})`, blank(v))
          if (v !== undefined) a.co2 += v
        }
        if (mt.id === "elec.grid") {
          const v = total === undefined ? undefined : (total / 1000) * GRID_TCO2_PER_MWH
          r.getCell(totalCol + 2).value = F(`IF(${T}="","",${T}/1000*tCO2_per_MWh_grid)`, blank(v))
          if (v !== undefined) a.co2 += v
        }
        const gwp = REFRIG_NAME[mt.id]
        if (gwp) {
          const v = total === undefined ? undefined : (total * FACTOR[gwp]) / 1000
          r.getCell(totalCol + 2).value = F(`IF(${T}="","",${T}*${gwp}/1000)`, blank(v))
          if (v !== undefined) a.co2 += v
        }
      }
      months.forEach((mo, i) => {
        const cell = r.getCell(first + i)
        cell.numFmt = "#,##0.##"
        cell.dataValidation = { type: "decimal", operator: "greaterThanOrEqual", formulae: [0], allowBlank: true, showErrorMessage: true, errorTitle: "Number only", error: "Enter a number of zero or more." }
        const c = filled ? m.state.collection.cells[cellKey(s.id, mt.id, mo)] : undefined
        cell.fill = c?.status === "estimated" ? EST_FILL : c?.status === "approved" ? OK_FILL : INPUT_FILL
        if (c) cell.note = c.status === "estimated" ? `Estimate, not counted: ${c.value.toLocaleString("en-IN")} ${mt.unit}${c.note ? ` · ${c.note}` : ""}` : `${c.status}${c.source ? ` · ${c.source}` : ""}${c.evidence ? ` · ${c.evidence}` : ""} · ${c.by}${c.note ? ` · ${c.note}` : ""}`
      })
      ;[totalCol, totalCol + 1, totalCol + 2].forEach((c) => {
        r.getCell(c).numFmt = "#,##0.##"
        if (c === totalCol || conv) r.getCell(c).fill = CALC_FILL
      })
    }
  }
  ws.autoFilter = { from: `A${HEAD_ROW}`, to: `G${HEAD_ROW}` }
  // LTIFR by employees and workers: monthly totals, and which months carry the split.
  let split: Split | undefined
  if (topic === "People and safety" && metrics.some((x) => x.id === "safety.hours.emp") && metrics.some((x) => x.id === "safety.lti.emp")) {
    const lastRow = ws.rowCount
    ws.addRow([])
    const h = ws.addRow(["Monthly totals for the LTIFR split"])
    h.font = { name: FONT, bold: true, size: 10 }
    const monthSum = (id: MetricId, mo: string) =>
      m.sites.reduce((sum, site) => {
        const c = filled ? m.state.collection.cells[cellKey(site.id, id, mo)] : undefined
        return c && c.status !== "estimated" ? sum + c.value : sum
      }, 0)
    const rowFor = (label: string, id: MetricId) => {
      const r = ws.addRow([label, "", "", id])
      months.forEach((mo, i) => {
        const L = colLetter(first + i)
        r.getCell(first + i).value = F(`SUMIF($C$${HEAD_ROW + 1}:$C$${lastRow},"${id}",${L}$${HEAD_ROW + 1}:${L}$${lastRow})`, monthSum(id, mo))
        r.getCell(first + i).numFmt = "#,##0.##"
        r.getCell(first + i).fill = CALC_FILL
      })
      return r.number
    }
    const H = rowFor("All person-hours", "safety.hours")
    const HE = rowFor("Employees' person-hours", "safety.hours.emp")
    const Lr = rowFor("All lost-time injuries", "safety.lti")
    const LE = rowFor("Employees' lost-time injuries", "safety.lti.emp")
    const w = ws.addRow(["Month carries the split (1 = yes)"])
    months.forEach((mo, i) => {
      w.getCell(first + i).value = F(`IF(${colLetter(first + i)}${HE}>0,1,0)`, monthSum("safety.hours.emp", mo) > 0 ? 1 : 0)
      w.getCell(first + i).fill = CALC_FILL
    })
    const range = (r: number) => `'${topic}'!$${colLetter(first)}$${r}:$${colLetter(last)}$${r}`
    const on = months.filter((mo) => monthSum("safety.hours.emp", mo) > 0)
    const sumOn = (id: MetricId) => on.reduce((a, mo) => a + monthSum(id, mo), 0)
    split = { H: range(H), HE: range(HE), L: range(Lr), LE: range(LE), W: range(w.number), hours: sumOn("safety.hours"), hoursEmp: sumOn("safety.hours.emp"), lti: sumOn("safety.lti"), ltiEmp: sumOn("safety.lti.emp") }
  }
  finish(ws, { company: m.client.shortName, from: HEAD_ROW + 1 })
  return { totalCol, acc, split }
}
type Split = { H: string; HE: string; L: string; LE: string; W: string; hours: number; hoursEmp: number; lti: number; ltiEmp: number }

type TopicInfo = Awaited<ReturnType<typeof addTopic>>

function addSummary(wb: ExcelJS.Workbook, m: ReportModel, topics: Partial<Record<Topic, TopicInfo>>, filled: boolean) {
  const ws = wb.addWorksheet("Summary", { properties: { tabColor: { argb: XL.green } } })
  ws.columns = [{ width: 54 }, { width: 18 }, { width: 16 }, { width: 50 }, { width: 22 }]
  title(ws, `${m.client.shortName} · BRSR summary · ${m.fy}`, filled ? "Every value is a formula over the topic sheets: collected values only. Estimates are listed in column E and in the collection log; they are never counted." : "Every value is a formula over the topic sheets.")
  styleHeader(ws.addRow(["Measure", "Value", "Unit", "BRSR", ...(filled ? ["Estimates, not counted"] : [])]))
  const metrics = activeMetrics(m.state.collection)
  const col = (t: Topic, offset = 0) => colLetter(topics[t]!.totalCol + offset)
  const sumMetric = (t: Topic, id: MetricId, offset = 0) => `SUMIF('${t}'!$C:$C,"${id}",'${t}'!$${col(t, offset)}:$${col(t, offset)})`
  const acc = (id: MetricId) => topics[METRICS_TOPIC(metrics, id)]?.acc[id]
  const start = ws.rowCount + 1
  const ref = (id: MetricId) => `B${start + metrics.findIndex((x) => x.id === id)}`
  const val = (id: MetricId) => acc(id)?.total ?? 0
  const has = (id: MetricId) => metrics.some((x) => x.id === id)
  for (const mt of metrics) {
    const r = ws.addRow([mt.label, F(sumMetric(mt.topic, mt.id), val(mt.id)), mt.unit, mt.brsr.join(", ")])
    r.getCell(2).numFmt = "#,##0.##"
    r.getCell(2).fill = CALC_FILL
    // The collection log lists every value with its status; estimates are summed from there.
    if (filled) {
      const est = Object.entries(m.state.collection.cells)
        .filter(([k, c]) => k.split("|")[1] === mt.id && c.status === "estimated" && m.sites.some((s) => s.id === k.split("|")[0]))
        .reduce((x, [, c]) => x + c.value, 0)
      r.getCell(5).value = F(`SUMIFS('Collection log'!$D:$D,'Collection log'!$B:$B,"${mt.label}",'Collection log'!$F:$F,"estimated")`, est)
      r.getCell(5).numFmt = "#,##0.##"
    }
  }
  ws.addRow([])
  styleHeader(ws.addRow(["Derived", "Value", "Unit", "How"]))
  const E: Topic = "Energy"
  const gjOf = (id: MetricId) => acc(id)?.gj ?? 0
  const coOf = (id: MetricId) => acc(id)?.co2 ?? 0
  const fossil: MetricId[] = ["fuel.hsd", "fuel.png", "fuel.lpg", ...(has("fuel.vehicle") ? (["fuel.vehicle"] as MetricId[]) : [])]
  const refrig = metrics.filter((x) => x.topic === "Refrigerants").map((x) => x.id)
  const totalGJ = metrics.filter((x) => x.topic === E).reduce((s, x) => s + gjOf(x.id), 0)
  const scope1 = [...fossil, "fuel.biomass" as MetricId, ...refrig].reduce((s, id) => s + coOf(id), 0)
  const water: MetricId[] = ["water.ground", "water.third", ...(has("water.surface") ? (["water.surface"] as MetricId[]) : [])]
  const withdrawal = water.reduce((s, id) => s + val(id), 0)
  const hours = val("safety.hours")
  const ltifr = hours ? (val("safety.lti") * 1_000_000) / hours : undefined
  const sp = topics["People and safety"]?.split
  const derived: [string, string, Result, string, string][] = [
    ["Electricity from renewable sources (A)", sumMetric(E, "elec.re", 1), gjOf("elec.re"), "GJ", "Renewable kWh × GJ_per_kWh"],
    ["Fuel from renewable sources (B)", sumMetric(E, "fuel.biomass", 1), gjOf("fuel.biomass"), "GJ", "Biomass t × GJ_per_t_biomass"],
    ["Electricity from non-renewable sources (D)", sumMetric(E, "elec.grid", 1), gjOf("elec.grid"), "GJ", "Grid kWh × GJ_per_kWh"],
    ["Fuel from non-renewable sources (E)", fossil.map((id) => sumMetric(E, id, 1)).join("+"), fossil.reduce((s, id) => s + gjOf(id), 0), "GJ", `Diesel + gas + LPG${has("fuel.vehicle") ? " + vehicle diesel" : ""} in GJ`],
    ["Total energy consumed (P6 E1)", `SUM('${E}'!$${col(E, 1)}:$${col(E, 1)})`, totalGJ, "GJ", "Sum of the GJ column"],
    [`Scope 1 (P6 E7)${refrig.length || has("fuel.vehicle") ? "" : ", stationary fuels"}`, [...fossil.map((id) => sumMetric(E, id, 2)), sumMetric(E, "fuel.biomass", 2), ...refrig.map((id) => sumMetric("Refrigerants", id, 2))].join("+"), scope1, "tCO2e", `Fuel GJ × (fossil CO2 + CH4 and N2O, AR6)${refrig.length ? " + refrigerant kg × GWP ÷ 1000" : ""}`],
    ["Biogenic CO2 from biomass (outside Scope 1)", `${sumMetric(E, "fuel.biomass", 1)}*tCO2_per_GJ_biomass_biogenic`, gjOf("fuel.biomass") * BIOGENIC_TCO2_PER_GJ, "tCO2", "Biomass GJ × 100 tCO2/TJ, reported separately"],
    ["Scope 2, location-based (P6 E7)", sumMetric(E, "elec.grid", 2), coOf("elec.grid"), "tCO2", "Grid kWh ÷ 1000 × tCO2_per_MWh_grid"],
    ["Water withdrawal (P6 E3)", water.map(ref).join("+"), withdrawal, "kL", water.length > 2 ? "Groundwater + third-party + surface" : "Groundwater + third-party"],
    ["Water consumption (P6 E3)", `${water.map(ref).join("+")}-${ref("water.discharge")}`, withdrawal - val("water.discharge"), "kL", "Withdrawal − discharge"],
    ["Waste generated (P6 E9)", `${ref("waste.haz")}+${ref("waste.plastic")}+${ref("waste.other")}`, val("waste.haz") + val("waste.plastic") + val("waste.other"), "t", "Hazardous + plastic + other"],
    ["LTIFR (P3 E11)", `IF(${ref("safety.hours")}=0,"",${ref("safety.lti")}*1000000/${ref("safety.hours")})`, blank(ltifr), "per million h", "LTIs × 1,000,000 ÷ person-hours"],
    ...(sp
      ? ([
          ["LTIFR, employees (P3 E11)", `IF(SUM(${sp.HE})=0,"",SUM(${sp.LE})*1000000/SUM(${sp.HE}))`, blank(sp.hoursEmp ? (sp.ltiEmp * 1_000_000) / sp.hoursEmp : undefined), "per million h", "Employees' LTIs × 1,000,000 ÷ employees' hours"],
          ["LTIFR, workers (P3 E11)", `IF(SUMPRODUCT(${sp.H},${sp.W})-SUM(${sp.HE})<=0,"",(SUMPRODUCT(${sp.L},${sp.W})-SUM(${sp.LE}))*1000000/(SUMPRODUCT(${sp.H},${sp.W})-SUM(${sp.HE})))`, blank(sp.hoursEmp && sp.hours > sp.hoursEmp ? ((sp.lti - sp.ltiEmp) * 1_000_000) / (sp.hours - sp.hoursEmp) : undefined), "per million h", "The rest of the LTIs and hours, in the months that carry the split"],
        ] as [string, string, Result, string, string][])
      : []),
  ]
  const at: Record<string, string> = {}
  const add = ([a, f, v, u, h]: [string, string, Result, string, string]) => {
    const r = ws.addRow([a, F(f, v), u, h])
    r.getCell(2).numFmt = "#,##0.##"
    r.getCell(2).fill = CALC_FILL
    if (/^Total energy|^Scope [12]|^Water withdrawal|^Waste generated|^LTIFR \(/.test(a)) r.getCell(1).font = { name: FONT, bold: true, size: 10 }
    at[a.split(" (")[0].split(",")[0]] = `B${r.number}`
  }
  derived.forEach(add)
  add(["Energy intensity per tonne of production", `IF(${ref("prod.output")}=0,"",${at["Total energy consumed"]}/${ref("prod.output")})`, blank(val("prod.output") ? totalGJ / val("prod.output") : undefined), "GJ/t", "Total energy ÷ production"])
  ws.views = [{ state: "frozen", ySplit: 4 }]
  finish(ws, { company: m.client.shortName, from: 5, landscape: false })
  return { energy: at["Total energy consumed"], scope1: at["Scope 1"], scope2: at["Scope 2"], water: at["Water withdrawal"], waste: at["Waste generated"], values: { totalGJ, scope12: scope1 + coOf("elec.grid"), withdrawal, waste: val("waste.haz") + val("waste.plastic") + val("waste.other") } }
}

const METRICS_TOPIC = (metrics: Metric[], id: MetricId) => metrics.find((x) => x.id === id)?.topic ?? "Energy"

// Company data from the financial statements, with the ratios BRSR asks for as formulas.
function addCompanyData(wb: ExcelJS.Workbook, m: ReportModel, filled: boolean, sum: ReturnType<typeof addSummary>) {
  const ws = wb.addWorksheet("Company data", { properties: { tabColor: { argb: XL.green } } })
  ws.columns = [{ width: 52 }, { width: 16 }, { width: 22 }, { width: 22 }, { width: 60 }, { width: 16 }]
  title(ws, `${m.client.shortName} · Company data · ${m.fy}`, "From the audited financial statements and ledgers, for the reporting entity. Finance enters the yellow cells; the ratios calculate below.")
  styleHeader(ws.addRow(["Item", "Value", "Unit", "BRSR", "Evidence", "Status"]))
  const a = m.state.collection.annual ?? {}
  const name = (id: AnnualId) => `Fin_${id.split(".")[1]}`
  const v = (id: AnnualId) => (filled ? a[id]?.value : undefined)
  for (const f of ANNUAL_FIELDS) {
    const x = filled ? a[f.id] : undefined
    const r = ws.addRow([f.label + (f.optional ? " (optional)" : ""), x?.value ?? null, f.unit, f.brsr.join(", "), x?.evidence ?? f.evidence, x ? (x.status === "approved" ? `Approved${x.approvedBy ? ` · ${x.approvedBy.split(" (")[0]}` : ""}` : "Awaiting review") : ""])
    r.getCell(2).fill = x?.status === "approved" ? OK_FILL : INPUT_FILL
    r.getCell(2).numFmt = "#,##0.00"
    wb.definedNames.add(`'Company data'!$B$${r.number}`, name(f.id))
  }
  const closedMonths = m.collection.closed.length
  const mr = ws.addRow(["Months covered by the collected totals", closedMonths, "months", "", "Closed months in the collection; intensities use revenue for the same months", ""])
  mr.getCell(2).fill = INPUT_FILL
  wb.definedNames.add(`'Company data'!$B$${mr.number}`, "Months_covered")
  ws.addRow([])
  styleHeader(ws.addRow(["Ratio", "Value", "Unit", "BRSR", "How", ""]))
  const nw = v("fin.netWorth")
  const rev = v("fin.revenue")
  const np = v("fin.netProfit")
  const pct = (n?: number, d?: number) => (n !== undefined && d ? (n / d) * 100 : undefined)
  const denomCr = closedMonths >= 12 ? rev : v("fin.revenuePeriod")
  const ppp = v("fin.ppp")
  const DEN = `IF(Months_covered>=12,${name("fin.revenue")},${name("fin.revenuePeriod")})`
  const intensityRows = (label: string, cellRef: string, q: number, unit: string, ref: string): [string, string, Result, string, string, string][] => [
    [`${label} intensity per ₹ crore of turnover`, `IF(OR(${DEN}="",${DEN}=0),"",${cellRef}/${DEN})`, blank(denomCr ? q / denomCr : undefined), `${unit} per ₹ crore`, ref, "Collected total ÷ revenue for the same months"],
    [`${label} intensity per rupee of turnover`, `IF(OR(${DEN}="",${DEN}=0),"",${cellRef}/(${DEN}*10000000))`, blank(denomCr ? q / (denomCr * 1e7) : undefined), `${unit} per ₹`, ref, "As SEBI asks: per rupee"],
    [`${label} intensity adjusted for PPP`, `IF(OR(${DEN}="",${DEN}=0,${name("fin.ppp")}=""),"",${cellRef}/(${DEN}*10000000/${name("fin.ppp")}))`, blank(denomCr && ppp ? q / ((denomCr * 1e7) / ppp) : undefined), `${unit} per PPP $`, ref, "Revenue ÷ PPP conversion factor"],
  ]
  const ratios: [string, string, Result, string, string, string][] = [
    ["CSR applicable (section 135)", `IF(OR(${name("fin.netWorth")}="",${name("fin.revenue")}="",${name("fin.netProfit")}=""),"",IF(OR(${name("fin.netWorth")}>=500,${name("fin.revenue")}>=1000,${name("fin.netProfit")}>=5),"Yes","No"))`, nw !== undefined && rev !== undefined && np !== undefined ? (nw >= 500 || rev >= 1000 || np >= 5 ? "Yes" : "No") : "", "", "A.24", "Net worth ≥ ₹500 cr, turnover ≥ ₹1,000 cr or net profit ≥ ₹5 cr"],
    ["Days of accounts payable", `IF(OR(${name("fin.purchases")}="",${name("fin.purchases")}=0,${name("fin.payables")}=""),"",${name("fin.payables")}*365/${name("fin.purchases")})`, blank(v("fin.purchases") && v("fin.payables") !== undefined ? (v("fin.payables")! * 365) / v("fin.purchases")! : undefined), "days", "P1.E8 (Core)", "Trade payables × 365 ÷ purchases"],
    ["Input material from MSMEs and small producers", `IF(OR(${name("fin.purchases")}="",${name("fin.purchases")}=0,${name("fin.msmePurchases")}=""),"",${name("fin.msmePurchases")}/${name("fin.purchases")}*100)`, blank(pct(v("fin.msmePurchases"), v("fin.purchases"))), "%", "P8.E4 (Core)", "MSME purchases ÷ purchases"],
    ["Input material sourced within India", `IF(OR(${name("fin.purchases")}="",${name("fin.purchases")}=0,${name("fin.indiaPurchases")}=""),"",${name("fin.indiaPurchases")}/${name("fin.purchases")}*100)`, blank(pct(v("fin.indiaPurchases"), v("fin.purchases"))), "%", "P8.E4 (Core)", "Purchases within India ÷ purchases"],
    ["Well-being spend as % of revenue", `IF(OR(${name("fin.revenue")}="",${name("fin.revenue")}=0,${name("fin.wellbeing")}=""),"",${name("fin.wellbeing")}/${name("fin.revenue")}*100)`, blank(pct(v("fin.wellbeing"), rev)), "%", "P3.E1 (Core)", "Well-being spend ÷ revenue from operations"],
    ["Capex on environmental and social improvements", `IF(OR(${name("fin.capex")}="",${name("fin.capex")}=0,${name("fin.capexSustainable")}=""),"",${name("fin.capexSustainable")}/${name("fin.capex")}*100)`, blank(pct(v("fin.capexSustainable"), v("fin.capex"))), "%", "P2.E1", "Tagged capex ÷ capex"],
    ["R&D on sustainable technologies", `IF(OR(${name("fin.rnd")}="",${name("fin.rnd")}=0,${name("fin.rndSustainable")}=""),"",${name("fin.rndSustainable")}/${name("fin.rnd")}*100)`, blank(pct(v("fin.rndSustainable"), v("fin.rnd"))), "%", "P2.E1", "Tagged R&D ÷ R&D"],
    ...intensityRows("Energy", `Summary!${sum.energy}`, sum.values.totalGJ, "GJ", "P6.E1"),
    ...intensityRows("Water", `Summary!${sum.water}`, sum.values.withdrawal, "kL", "P6.E3"),
    ...intensityRows("Waste", `Summary!${sum.waste}`, sum.values.waste, "t", "P6.E9"),
  ]
  for (const [l, f, val, u, ref, how] of ratios) {
    const r = ws.addRow([l, F(f, val), u, ref, how, ""])
    r.getCell(2).fill = CALC_FILL
    r.getCell(2).numFmt = typeof val === "number" && Math.abs(val) < 0.001 && val !== 0 ? "0.00E+00" : "#,##0.00"
  }
  ws.views = [{ state: "frozen", ySplit: 4 }]
  finish(ws, { company: m.client.shortName, from: 5, wrap: true })
}

function addCollectionLog(wb: ExcelJS.Workbook, m: ReportModel) {
  const ws = wb.addWorksheet("Collection log", { properties: { tabColor: { argb: XL.muted } } })
  ws.columns = [{ width: 30 }, { width: 34 }, { width: 10 }, { width: 14 }, { width: 10 }, { width: 12 }, { width: 14 }, { width: 30 }, { width: 22 }, { width: 18 }, { width: 50 }]
  styleHeader(ws.addRow(["Site", "Metric", "Month", "Value", "Unit", "Status", "Source", "Evidence", "Entered by", "Entered at", "Note"]))
  const siteName = Object.fromEntries(m.sites.map((s) => [s.id, s.name]))
  const metrics = Object.fromEntries(activeMetrics(m.state.collection).map((x) => [x.id, x]))
  const entries = Object.entries(m.state.collection.cells)
    .map(([k, c]) => {
      const [siteId, metric, month] = k.split("|")
      return { siteId, metric: metric as MetricId, month, c }
    })
    .filter((x) => siteName[x.siteId] && metrics[x.metric])
    .sort((a, b) => a.month.localeCompare(b.month) || siteName[a.siteId].localeCompare(siteName[b.siteId]))
  for (const e of entries) {
    const mt = metrics[e.metric]
    const r = ws.addRow([siteName[e.siteId], mt.label, e.month, e.c.value, mt.unit, e.c.status, e.c.source, e.c.evidence ?? "", e.c.by, e.c.at.slice(0, 16).replace("T", " "), e.c.note ?? ""])
    r.getCell(4).numFmt = "#,##0.##"
    if (e.c.status === "estimated") r.getCell(6).fill = EST_FILL
    if (e.c.status === "approved") r.getCell(6).fill = OK_FILL
  }
  ws.autoFilter = { from: "A1", to: "K1" }
  ws.views = [{ state: "frozen", ySplit: 1 }]
  finish(ws, { company: m.client.shortName })
}

const STATUS_LABEL = { now: "In place", sync: "Needs work", open: "Open" }
const STATUS_FILL = { now: OK_FILL, sync: EST_FILL, open: fill("FFFDE2E7") }

function addReadiness(wb: ExcelJS.Workbook, m: ReportModel) {
  const ws = wb.addWorksheet("BRSR readiness", { properties: { tabColor: { argb: XL.amber } } })
  ws.columns = [{ width: 12 }, { width: 46 }, { width: 12 }, { width: 22 }, { width: 18 }, { width: 50 }, { width: 50 }, { width: 26 }, { width: 8 }, { width: 8 }, { width: 10 }, { width: 40 }, { width: 22 }]
  styleHeader(ws.addRow(["ID", "Question / requirement", "Status", "Category", "Priority", "Gap", "Recommendation", "Owner", "Effort", "Weeks", "Milestone", "Depends on", "Interview"]))
  for (const x of m.readiness.items.filter((i) => i.framework !== "ISSB")) {
    const r = ws.addRow([x.id, x.title, STATUS_LABEL[x.status], x.category, x.priority, x.gap, x.recommendation ?? "", x.owner.person ? `${x.owner.person} (${x.owner.role})` : x.owner.role, x.effort, x.weeks, x.milestone, x.dependsOn.join("; "), x.interview ? `${RATING_LABEL[x.interview.worst]} (${x.interview.sources.join(", ")})` : ""])
    r.getCell(3).fill = STATUS_FILL[x.status]
  }
  ws.autoFilter = { from: "A1", to: "M1" }
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: 1 }]
  finish(ws, { company: m.client.shortName, wrap: true })

  const is = wb.addWorksheet("ISSB map", { properties: { tabColor: { argb: XL.amber } } })
  is.columns = [{ width: 22 }, { width: 10 }, { width: 22 }, { width: 22 }, { width: 46 }, { width: 12 }, { width: 22 }, { width: 60 }, { width: 18 }]
  styleHeader(is.addRow(["ID", "Standard", "Pillar", "Reference", "Requirement", "Coverage", "BRSR", "Gap beyond BRSR", "Priority"]))
  for (const x of m.readiness.items.filter((i) => i.framework === "ISSB")) is.addRow([x.id, x.ref.split(" ").slice(0, 2).join(" "), x.pillar, x.ref, x.title, x.coverage, x.how.replace(/^(Partly covered|Covered) by BRSR /, ""), x.gap, x.priority])
  is.autoFilter = { from: "A1", to: "I1" }
  is.views = [{ state: "frozen", ySplit: 1 }]
  finish(is, { company: m.client.shortName, wrap: true })

  const g = wb.addWorksheet("Gap register", { properties: { tabColor: { argb: XL.amber } } })
  g.columns = [{ width: 6 }, { width: 12 }, { width: 46 }, { width: 22 }, { width: 18 }, { width: 8 }, { width: 50 }, { width: 50 }, { width: 26 }, { width: 8 }, { width: 8 }, { width: 10 }]
  styleHeader(g.addRow(["Rank", "ID", "Item", "Category", "Priority", "Score", "Gap", "Recommendation", "Owner", "Effort", "Weeks", "Milestone"]))
  m.open.forEach((x, i) => g.addRow([i + 1, x.id, x.title, x.category, x.priority, x.score, x.gap, x.recommendation ?? "", x.owner.person ?? x.owner.role, x.effort, x.weeks, x.milestone]))
  g.autoFilter = { from: "A1", to: "L1" }
  g.views = [{ state: "frozen", ySplit: 1 }]
  finish(g, { company: m.client.shortName, wrap: true })
}

function addInterviews(wb: ExcelJS.Workbook, m: ReportModel) {
  const ws = wb.addWorksheet("Interviews", { properties: { tabColor: { argb: XL.muted } } })
  ws.columns = [{ width: 26 }, { width: 22 }, { width: 12 }, { width: 60 }, { width: 22 }, { width: 14 }, { width: 18 }, { width: 28 }, { width: 40 }, { width: 50 }]
  styleHeader(ws.addRow(["Interview", "Interviewee", "Date", "Question", "BRSR", "Answer", "Kept in", "Evidence", "Notes", "Recommendation"]))
  for (const f of m.interviews.findings) {
    ws.addRow([
      f.interview.siteId ? `${f.interview.title} plant` : f.guide.title,
      f.interview.interviewee.name ?? f.interview.interviewee.role,
      f.interview.date,
      f.question.text,
      f.question.refs.join(", "),
      RATING_LABEL[f.answer.rating!],
      f.answer.system ? SYSTEM_LABEL[f.answer.system] : "",
      f.answer.evidence ?? "",
      `${f.answer.note ?? ""}${f.answer.example ? " (example answer)" : ""}`,
      f.answer.rating === "in-place" ? "" : f.question.recommendation,
    ])
  }
  ws.autoFilter = { from: "A1", to: "J1" }
  ws.views = [{ state: "frozen", ySplit: 1 }]
  finish(ws, { company: m.client.shortName, wrap: true })
}

function addDocumentReview(wb: ExcelJS.Workbook, m: ReportModel) {
  const ws = wb.addWorksheet("Document review", { properties: { tabColor: { argb: XL.muted } } })
  ws.columns = [{ width: 24 }, { width: 46 }, { width: 26 }, { width: 18 }, { width: 30 }, { width: 50 }, { width: 28 }, { width: 22 }, { width: 18 }, { width: 60 }]
  styleHeader(ws.addRow(["Category", "Document", "Plant", "Outcome", "File reviewed", "Notes", "Evidences", "Owner", "Reviewed", "If it falls short"]))
  for (const r of m.docs.rows) {
    const row = ws.addRow([CATEGORY_LABEL[r.doc.category], r.doc.title, r.site?.name ?? "Corporate", r.review?.outcome ? OUTCOME_LABEL[r.review.outcome] : "Not reviewed", r.review?.file ?? "", r.review?.notes ?? "", r.doc.refs.join(", "), r.doc.owner, r.review?.at ? `${r.review.by}, ${r.review.at.slice(0, 10)}` : "", r.doc.recommendation])
    if (r.review?.outcome === "adequate") row.getCell(4).fill = OK_FILL
    else if (r.review?.outcome) row.getCell(4).fill = EST_FILL
  }
  ws.autoFilter = { from: "A1", to: "J1" }
  ws.views = [{ state: "frozen", ySplit: 1 }]
  finish(ws, { company: m.client.shortName, wrap: true })
}

function addReviewLog(wb: ExcelJS.Workbook, m: ReportModel) {
  const ws = wb.addWorksheet("Review log", { properties: { tabColor: { argb: XL.muted } } })
  ws.columns = [{ width: 24 }, { width: 10 }, { width: 18 }, { width: 28 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 26 }, { width: 40 }]
  styleHeader(ws.addRow(["Data owner", "Questions", "Sections", "Attendees", "Held", "Accuracy", "Completeness", "Consistency", "Signed off", "Notes"]))
  for (const p of m.review.plan) {
    const s = m.state.reportReview.sessions[p.owner]
    ws.addRow([p.owner, p.questions.length, p.sections.join(", "), s?.attendees ?? "", s?.heldAt?.slice(0, 10) ?? "Not held", s?.checks.accuracy ?? "", s?.checks.completeness ?? "", s?.checks.consistency ?? "", s?.signedOffAt ? `${s.signedOffBy}, ${s.signedOffAt.slice(0, 10)}` : "", s?.notes ?? ""])
  }
  ws.addRow([])
  styleHeader(ws.addRow(["Data owner", "Question", "Query", "Raised by", "Raised", "Resolved", "Resolution"]))
  for (const p of m.review.plan) for (const q of m.state.reportReview.sessions[p.owner]?.queries ?? []) ws.addRow([p.owner, q.questionId, q.text, q.by, q.raisedAt.slice(0, 10), q.resolvedAt?.slice(0, 10) ?? "Open", q.resolution ?? ""])
  finish(ws, { company: m.client.shortName, wrap: true })
}

function addChecksAndAssumptions(wb: ExcelJS.Workbook, m: ReportModel) {
  const c = wb.addWorksheet("Checks", { properties: { tabColor: { argb: XL.muted } } })
  c.columns = [{ width: 10 }, { width: 12 }, { width: 90 }]
  styleHeader(c.addRow(["Month", "Check", "Detail"]))
  for (const f of m.collection.flags) c.addRow([f.month, f.kind, f.text])
  c.views = [{ state: "frozen", ySplit: 1 }]
  finish(c, { company: m.client.shortName })
  const a = wb.addWorksheet("Assumptions", { properties: { tabColor: { argb: XL.muted } } })
  a.columns = [{ width: 22 }, { width: 70 }, { width: 50 }, { width: 50 }, { width: 22 }]
  styleHeader(a.addRow(["Area", "Assumption or limitation", "Effect", "What removes it", "Owner"]))
  for (const x of m.assumptions) a.addRow([x.area, x.assumption, x.effect, x.remove, x.owner])
  a.views = [{ state: "frozen", ySplit: 1 }]
  finish(a, { company: m.client.shortName, wrap: true })
  const t = wb.addWorksheet("Test report answers", { properties: { tabColor: { argb: XL.green } } })
  t.columns = [{ width: 10 }, { width: 22 }, { width: 60 }, { width: 13 }, { width: 80 }, { width: 44 }, { width: 22 }, { width: 14 }]
  styleHeader(t.addRow(["ID", "Section", "Question", "Status", "Answer", "Source", "Owner", "Review"]))
  const kindLabel = { answered: "Answered", partial: "Partly answered", placeholder: "To complete" }
  const kindFill = { answered: OK_FILL, partial: EST_FILL, placeholder: fill("FFFDE2E7") }
  for (const { entry, answer } of answerAll(m).rows) {
    const text = [answer.text, answer.table ? [answer.table.head.join(" | "), ...answer.table.rows.map((r) => r.join(" | "))].join("\n") : ""].filter(Boolean).join("\n")
    const sec = entry.section === "C" ? `${entry.principle} ${entry.kind === "essential" ? "Essential" : "Leadership"}` : `Section ${entry.section}`
    const s = m.state.reportReview.sessions[sessionOwner(entry.owner)]
    const r = t.addRow([entry.id, sec, stripFormat(entry.text), kindLabel[answer.kind], text, [answer.source, answer.note].filter(Boolean).join(" · "), sessionOwner(entry.owner), sessionStatus(s)])
    r.getCell(4).fill = kindFill[answer.kind]
  }
  t.autoFilter = { from: "A1", to: "H1" }
  t.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }]
  finish(t, { company: m.client.shortName, wrap: true })
  void PRINCIPLE_NAMES
}

function base(m: ReportModel, filled: boolean) {
  const wb = new ExcelJS.Workbook()
  wb.creator = "esgOS"
  wb.title = `${filled ? "BRSR data workbook" : "BRSR data collection templates"} ${m.fy} — ${m.client.legalName}`
  wb.created = new Date(m.generatedAt)
  // Results are cached for viewers; Excel still recalculates on open.
  wb.calcProperties.fullCalcOnLoad = true
  const topics = activeTopics(m.state.collection)
  const sheets = ["Summary", "Company data", ...topics, "Sites", "Factors", ...(filled ? ["Collection log", "BRSR readiness", "ISSB map", "Gap register", "Document review", "Interviews", "Review log", "Checks", "Assumptions", "Test report answers"] : [])]
  addReadme(wb, m, filled, sheets)
  // Summary and Company data refer to the topic sheets, so those are built first; orderNo sets the tabs.
  const info: Partial<Record<Topic, TopicInfo>> = {}
  for (const t of topics) info[t] = addTopic(wb, m, t, filled)
  const sum = addSummary(wb, m, info, filled)
  addCompanyData(wb, m, filled, sum)
  addSites(wb, m)
  addFactors(wb, m.client.shortName)
  // Order the tabs: Read me, Summary, Company data, topics, Sites, Factors, then registers.
  setOrder(wb, ["Read me", ...sheets])
  return wb
}

export function templatesWorkbook(m: ReportModel) {
  return base(m, false)
}

export function dataWorkbook(m: ReportModel) {
  const wb = base(m, true)
  addCollectionLog(wb, m)
  addReadiness(wb, m)
  addDocumentReview(wb, m)
  addInterviews(wb, m)
  addReviewLog(wb, m)
  addChecksAndAssumptions(wb, m)
  setOrder(wb, ["Read me", "Summary", "Company data", ...activeTopics(m.state.collection), "Sites", "Factors", "Collection log", "BRSR readiness", "ISSB map", "Gap register", "Document review", "Interviews", "Review log", "Checks", "Assumptions", "Test report answers"])
  return wb
}

// ExcelJS orders tabs by each sheet's orderNo (not in its types); `worksheets` returns them sorted.
type Ordered = { orderNo: number; name: string }
function setOrder(wb: ExcelJS.Workbook, order: string[]) {
  for (const ws of wb.worksheets as unknown as Ordered[]) ws.orderNo = order.indexOf(ws.name) >= 0 ? order.indexOf(ws.name) + 1 : 99
}
