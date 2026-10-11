// Company data for the year, taken from the audited financial statements and the
// CSR, purchase and payroll ledgers. One value per item for the reporting entity,
// entered by Finance or the company secretary and approved by a reviewer. It
// answers the Section A finance questions and the BRSR Core ratios, and turns
// every quantity in Section C into an intensity per rupee of turnover.

import type { StakeholderRole } from "../types"

export type AnnualId =
  | "fin.revenue"
  | "fin.revenuePeriod"
  | "fin.paidUp"
  | "fin.netWorth"
  | "fin.netProfit"
  | "fin.csrObligation"
  | "fin.csrSpent"
  | "fin.purchases"
  | "fin.payables"
  | "fin.msmePurchases"
  | "fin.indiaPurchases"
  | "fin.wellbeing"
  | "fin.rnd"
  | "fin.rndSustainable"
  | "fin.capex"
  | "fin.capexSustainable"
  | "fin.ppp"

export type AnnualField = {
  id: AnnualId
  label: string
  unit: string
  brsr: string[]
  owner: StakeholderRole
  evidence: string
  group: "Size and CSR" | "Purchases and payables" | "Spend" | "Intensity"
  help?: string
  optional?: boolean
}

export type AnnualValue = { value: number; evidence?: string; note?: string; status: "submitted" | "approved"; by: string; at: string; approvedBy?: string }

const FIN: StakeholderRole = "Finance controller"
const CS: StakeholderRole = "Company secretary"

export const ANNUAL_FIELDS: AnnualField[] = [
  { id: "fin.revenue", label: "Revenue from operations (year)", unit: "₹ crore", brsr: ["A.24", "P6.E1", "P6.E3", "P6.E7", "P6.E9", "P3.E1"], owner: FIN, evidence: "Audited statement of profit and loss", group: "Size and CSR", help: "Turnover for Section A and the denominator of every intensity per rupee of turnover." },
  { id: "fin.paidUp", label: "Paid-up capital", unit: "₹ crore", brsr: ["A.11"], owner: CS, evidence: "Audited balance sheet, share capital note", group: "Size and CSR" },
  { id: "fin.netWorth", label: "Net worth", unit: "₹ crore", brsr: ["A.24"], owner: FIN, evidence: "Audited balance sheet", group: "Size and CSR" },
  { id: "fin.netProfit", label: "Net profit before tax", unit: "₹ crore", brsr: ["A.24"], owner: FIN, evidence: "Audited statement of profit and loss", group: "Size and CSR", help: "Section 135 tests net profit as computed under section 198." },
  { id: "fin.csrObligation", label: "CSR obligation for the year (2% of average net profit)", unit: "₹ crore", brsr: ["A.24"], owner: CS, evidence: "CSR committee minutes and the annual report on CSR", group: "Size and CSR", optional: true },
  { id: "fin.csrSpent", label: "CSR amount spent", unit: "₹ crore", brsr: ["A.24"], owner: CS, evidence: "Annual report on CSR (Annexure), Form CSR-2", group: "Size and CSR", optional: true },
  { id: "fin.purchases", label: "Cost of goods and services procured", unit: "₹ crore", brsr: ["P1.E8", "P8.E4"], owner: FIN, evidence: "Audited statement of profit and loss (materials consumed, purchases, other expenses procured)", group: "Purchases and payables" },
  { id: "fin.payables", label: "Trade payables at year end", unit: "₹ crore", brsr: ["P1.E8"], owner: FIN, evidence: "Audited balance sheet, trade payables note", group: "Purchases and payables" },
  { id: "fin.msmePurchases", label: "Purchases from MSMEs and small producers", unit: "₹ crore", brsr: ["P8.E4"], owner: "Procurement head", evidence: "Purchase ledger with Udyam-registered vendors tagged", group: "Purchases and payables" },
  { id: "fin.indiaPurchases", label: "Purchases sourced within India", unit: "₹ crore", brsr: ["P8.E4"], owner: "Procurement head", evidence: "Purchase ledger by vendor country", group: "Purchases and payables" },
  { id: "fin.wellbeing", label: "Spend on employee and worker well-being", unit: "₹ crore", brsr: ["P3.E1"], owner: "HR manager", evidence: "Ledger for health and accident insurance, maternity, paternity and day care", group: "Spend" },
  { id: "fin.rnd", label: "Research and development spend", unit: "₹ crore", brsr: ["P2.E1"], owner: FIN, evidence: "R&D ledger and fixed asset register", group: "Spend", optional: true },
  { id: "fin.rndSustainable", label: "of which on sustainable technologies", unit: "₹ crore", brsr: ["P2.E1"], owner: FIN, evidence: "R&D projects tagged by purpose", group: "Spend", optional: true },
  { id: "fin.capex", label: "Capital expenditure", unit: "₹ crore", brsr: ["P2.E1"], owner: FIN, evidence: "Fixed asset register, additions for the year", group: "Spend" },
  { id: "fin.capexSustainable", label: "of which to improve environmental and social impacts", unit: "₹ crore", brsr: ["P2.E1"], owner: FIN, evidence: "Capex projects tagged by purpose (solar, ETP, energy efficiency)", group: "Spend" },
  { id: "fin.revenuePeriod", label: "Revenue for the collection months", unit: "₹ crore", brsr: ["P6.E1", "P6.E3", "P6.E7", "P6.E9"], owner: FIN, evidence: "Management accounts for the same months", group: "Intensity", optional: true, help: "Only until the year is closed: intensities divide the collected months by revenue for the same months." },
  { id: "fin.ppp", label: "PPP conversion factor for the year", unit: "₹ per international $", brsr: ["P6.E1", "P6.E3", "P6.E7", "P6.E9"], owner: FIN, evidence: "IMF World Economic Outlook database, implied PPP conversion rate for India", group: "Intensity", optional: true, help: "BRSR Core also asks for intensities per rupee of turnover adjusted for purchasing power parity." },
]

export const ANNUAL_BY_ID = Object.fromEntries(ANNUAL_FIELDS.map((f) => [f.id, f])) as Record<AnnualId, AnnualField>
export const ANNUAL_GROUPS = ["Size and CSR", "Purchases and payables", "Spend", "Intensity"] as const

// Which BRSR questions annual data answers, and the fields each needs before it is complete.
export const ANNUAL_REQUIRED: Record<string, AnnualId[]> = {
  "A.11": ["fin.paidUp"],
  "A.24": ["fin.revenue", "fin.netWorth", "fin.netProfit"],
  "P1.E8": ["fin.payables", "fin.purchases"],
  "P8.E4": ["fin.purchases", "fin.msmePurchases", "fin.indiaPurchases"],
  "P2.E1": ["fin.capex", "fin.capexSustainable"],
}

const CRORE = 1e7

type A = Partial<Record<AnnualId, AnnualValue>>
const v = (a: A | undefined, id: AnnualId) => a?.[id]?.value

export function annualStatus(a: A | undefined, ref: string): "none" | "submitted" | "approved" {
  const need = ANNUAL_REQUIRED[ref]
  if (!need) return "none"
  const vals = need.map((id) => a?.[id])
  if (vals.some((x) => !x)) return "none"
  return vals.every((x) => x!.status === "approved") ? "approved" : "submitted"
}

// Section 135 of the Companies Act, 2013: CSR applies above any one threshold.
export function csrApplicable(a: A | undefined) {
  const revenue = v(a, "fin.revenue")
  const nw = v(a, "fin.netWorth")
  const np = v(a, "fin.netProfit")
  if (revenue === undefined || nw === undefined || np === undefined) return undefined
  const tests = [
    { met: nw >= 500, text: `net worth ₹${fmtCr(nw)} crore ${nw >= 500 ? "≥" : "<"} ₹500 crore` },
    { met: revenue >= 1000, text: `turnover ₹${fmtCr(revenue)} crore ${revenue >= 1000 ? "≥" : "<"} ₹1,000 crore` },
    { met: np >= 5, text: `net profit ₹${fmtCr(np)} crore ${np >= 5 ? "≥" : "<"} ₹5 crore` },
  ]
  return { applicable: tests.some((t) => t.met), tests }
}

// BRSR Core: (accounts payable × 365) ÷ cost of goods and services procured.
export function daysPayable(a: A | undefined) {
  const p = v(a, "fin.payables")
  const c = v(a, "fin.purchases")
  return p !== undefined && c ? (p * 365) / c : undefined
}

export const share = (a: A | undefined, num: AnnualId, den: AnnualId) => {
  const n = v(a, num)
  const d = v(a, den)
  return n !== undefined && d ? (n / d) * 100 : undefined
}

// The revenue that matches the collected months: the year once all 12 months are
// closed, else revenue for the same months if Finance has given it.
export function periodRevenue(a: A | undefined, monthsCovered: number): { crore: number; basis: string } | undefined {
  if (monthsCovered >= 12 && v(a, "fin.revenue") !== undefined) return { crore: v(a, "fin.revenue")!, basis: "audited revenue for the year" }
  if (v(a, "fin.revenuePeriod") !== undefined) return { crore: v(a, "fin.revenuePeriod")!, basis: `revenue for the same ${monthsCovered} months (management accounts)` }
  return undefined
}

// Intensity per rupee of turnover (as BRSR asks) and per ₹ crore (readable), plus PPP-adjusted.
export function intensity(quantity: number, a: A | undefined, monthsCovered: number) {
  const r = periodRevenue(a, monthsCovered)
  if (!r || !r.crore || !quantity) return undefined
  const perRupee = quantity / (r.crore * CRORE)
  const ppp = v(a, "fin.ppp")
  return { perRupee, perCrore: quantity / r.crore, perPppDollar: ppp ? quantity / ((r.crore * CRORE) / ppp) : undefined, basis: r.basis }
}

export const fmtCr = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 })

// Scientific notation for per-rupee intensities, which are tiny (e.g. 4.51 × 10⁻⁶ GJ per ₹).
export function fmtSci(n: number) {
  if (!n) return "0"
  const e = Math.floor(Math.log10(Math.abs(n)))
  if (e >= -2 && e < 6) return n.toLocaleString("en-IN", { maximumSignificantDigits: 4 })
  const m = n / 10 ** e
  const sup = String(e).replace(/-/g, "⁻").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)])
  return `${m.toFixed(2)} × 10${sup}`
}
