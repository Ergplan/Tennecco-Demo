// Answers for the BRSR test report: what each SEBI question can say today from
// the company's records, the collected data and the interviews, and a named
// placeholder where nothing is collected yet. Nothing here is invented: an
// answer is either sourced or marked as a placeholder with its owner.

import { monthLabel } from "../collection/model"
import CATALOGUE from "../readiness/catalogue.json"
import type { BrsrEntry } from "../readiness/types"
import { findings } from "../interviews/plan"
import { RATING_LABEL } from "../interviews/plan"
import { GJ_PER_UNIT, periodTotal } from "../collection/calc"
import { csrApplicable, daysPayable, fmtSci, intensity, share, type AnnualId } from "../collection/annual"
import { draftConfirmed } from "../closure"
import { sessionOwner } from "../reportReview"
import { filedMetric } from "../filed"
import { fmtN, type ReportModel } from "./model"

export type Answer = {
  kind: "answered" | "partial" | "placeholder"
  text?: string
  table?: { head: string[]; rows: string[][] }
  source?: string
  note?: string
}

export const BRSR_ENTRIES = (CATALOGUE as unknown as { brsr: BrsrEntry[] }).brsr

const placeholder = (e: BrsrEntry, m: ReportModel): Answer => {
  const item = m.readiness.items.find((x) => x.id === e.id)
  const owner = item?.owner.person ? `${item.owner.person} (${item.owner.role})` : e.owner
  return {
    kind: "placeholder",
    text: `[To be completed by ${owner}. Usual source: ${e.source}.]`,
    note: item && item.status !== "now" ? `Readiness: ${item.gap || item.how}` : undefined,
  }
}

function interviewAnswer(m: ReportModel, refs: string[]): Answer | undefined {
  const f = findings(m.state.interviews).filter((x) => x.question.refs.some((r) => refs.includes(r)) && x.answer.rating !== "na")
  if (!f.length) return undefined
  const lines = f.map((x) => `${x.interview.siteId ? `${x.interview.title} plant` : x.guide.title}: ${RATING_LABEL[x.answer.rating!].toLowerCase()}${x.answer.note?.trim() ? ` (${x.answer.note.trim()})` : ""}${x.answer.evidence?.trim() ? `; evidence: ${x.answer.evidence.trim()}` : ""}`)
  return {
    kind: "partial",
    text: lines.join(". ") + ".",
    source: `Management interviews (${[...new Set(f.map((x) => x.interview.date))].sort().join(", ")})`,
    note: "Management representation; to be drafted as a disclosure once evidence is filed.",
  }
}

function people(m: ReportModel, role: string) {
  const org = m.state.orgByClient[m.client.id]
  const p = m.state.stakeholders.find((x) => !x.siteId && x.role === role && !x.vacant)
  return { name: p?.name, email: p?.email ?? (org?.you.role === role ? org.you.email : undefined) }
}

const yearLabel = (fy: string) => fy.replace("FY ", "FY")
// The column head for collected totals: the year, and the months they cover so far.
function periodHead(m: ReportModel) {
  const p = m.collection.closed
  if (!p.length) return `${yearLabel(m.fy)} (months collected so far)`
  return `${yearLabel(m.fy)} (${monthLabel(p[0])}–${monthLabel(p[p.length - 1])}, ${p.length} closed month${p.length === 1 ? "" : "s"})`
}

// Previous-year column: the filed BRSR for a listed client.
function prev(key: string) {
  const v = filedMetric(key)
  return v && typeof v.value === "number" ? fmtN(v.value, v.value < 10 ? 2 : 0) : "—"
}

// Intensity rows for a Section C table: per rupee of turnover (as SEBI asks), PPP-adjusted
// where the factor is given, and per tonne of production. Revenue must cover the same months.
function intensityRows(m: ReportModel, label: string, quantity: number, unit: string, prevKey?: string): string[][] {
  const a = m.state.collection.annual
  const i = intensity(quantity, a, m.collection.closed.length)
  const p = m.client.lastBrsr && prevKey ? prev(prevKey) : "—"
  const prod = periodTotal(m.state.collection, m.sites, "prod.output", m.collection.period)
  const rows: string[][] = [
    [`${label} intensity per rupee of turnover (${unit}/₹)`, i ? fmtSci(i.perRupee) : "—", i ? `${fmtN(i.perCrore, 2)} ${unit} per ₹ crore; ${i.basis}` : m.collection.closed.length >= 12 ? "Needs revenue for the year (company data)" : "Needs revenue for the same months (company data)", p],
  ]
  if (i?.perPppDollar !== undefined) rows.push([`${label} intensity per rupee of turnover adjusted for PPP (${unit}/PPP $)`, fmtSci(i.perPppDollar), "Revenue ÷ PPP conversion factor (IMF)", "—"])
  if (prod && quantity) rows.push([`${label} intensity in terms of physical output (${unit}/t of production)`, fmtN(quantity / prod, 3), "Collected production for the same months", "—"])
  return rows
}

function energyTable(m: ReportModel): Answer {
  const s = m.state.collection
  const sites = m.sites
  const months = m.collection.period
  const gj = (id: Parameters<typeof periodTotal>[2], est: boolean) => periodTotal(s, sites, id, months, { includeEstimates: est }) * (GJ_PER_UNIT[id] ?? 0)
  const status = (value: number, collected: number) => (!value ? "Not collected" : collected < 0.5 ? "All estimated" : Math.abs(value - collected) > 0.5 ? `${fmtN(collected)} without estimates` : "Collected")
  const row = (label: string, value: number, collected: number, key?: string): string[] => [label, value ? fmtN(value) : "—", status(value, collected), m.client.lastBrsr && key ? prev(key) : "—"]
  const A = gj("elec.re", true)
  const B = gj("fuel.biomass", true)
  const D = gj("elec.grid", true)
  const E = gj("fuel.hsd", true) + gj("fuel.png", true) + gj("fuel.lpg", true) + gj("fuel.vehicle", true)
  const Ac = gj("elec.re", false)
  const Bc = gj("fuel.biomass", false)
  const Dc = gj("elec.grid", false)
  const Ec = gj("fuel.hsd", false) + gj("fuel.png", false) + gj("fuel.lpg", false) + gj("fuel.vehicle", false)
  const any = A + B + D + E > 0
  const c = m.collection.completeness
  return {
    kind: any ? "partial" : "placeholder",
    table: {
      head: ["Parameter (GJ)", periodHead(m), "Data status", m.client.lastBrsr ? `${m.client.lastBrsr.fy} (filed)` : "Previous year"],
      rows: [
        row("Total electricity consumption (A)", A, Ac, "p6.e1.A"),
        row("Total fuel consumption (B)", B, Bc, "p6.e1.B"),
        ["Energy consumption through other sources (C)", "—", "Not collected", m.client.lastBrsr ? prev("p6.e1.C") : "—"],
        row("Total energy from renewable sources (A+B+C)", A + B, Ac + Bc),
        row("Total electricity consumption (D)", D, Dc, "p6.e1.D"),
        row("Total fuel consumption (E)", E, Ec, "p6.e1.E"),
        ["Energy consumption through other sources (F)", "—", "Not collected", m.client.lastBrsr ? prev("p6.e1.F") : "—"],
        row("Total energy from non-renewable sources (D+E+F)", D + E, Dc + Ec),
        row("Total energy consumed (A+B+C+D+E+F)", A + B + D + E, Ac + Bc + Dc + Ec, "p6.e1.total"),
        ...intensityRows(m, "Energy", Ac + Bc + Dc + Ec, "GJ", "p6.e1.intensity"),
      ],
    },
    source: `Monthly collection: ${fmtN(c.have)} of ${fmtN(c.expected)} required values collected, ${fmtN(c.est)} estimates`,
    note: any ? `Totals include estimates where noted; intensities use collected values only.${(m.state.collection.added ?? []).includes("fuel.vehicle") ? " Fuel (E) includes diesel in company vehicles." : " Fuel (E) leaves out company vehicles, which are not collected yet."} See the assumptions and limitations note.` : undefined,
  }
}

function ghgTable(m: ReportModel): Answer {
  const w = m.collection.withEstimates
  const c = m.collection.collected
  const any = w.scope1 + w.scope2 > 0
  const added = m.state.collection.added ?? []
  const vehicles = added.includes("fuel.vehicle")
  const refrig = added.some((id) => id.startsWith("refrig."))
  const covers = ["stationary fuels", vehicles && "company vehicles", refrig && "refrigerant leaks"].filter(Boolean).join(", ")
  const r = (label: string, v: number, vc: number, key: string): string[] => [label, v ? fmtN(v) : "—", !v ? "Not collected" : vc < 0.5 ? "All estimated" : Math.abs(v - vc) > 0.5 ? `${fmtN(vc)} without estimates` : "Collected", m.client.lastBrsr ? prev(key) : "—"]
  return {
    kind: any ? "partial" : "placeholder",
    table: {
      head: ["Parameter (tCO2e)", periodHead(m), "Data status", m.client.lastBrsr ? `${m.client.lastBrsr.fy} (filed)` : "Previous year"],
      rows: [
        r(`Total Scope 1 emissions (${covers}: CO2, CH4 and N2O${refrig ? ", HFCs" : ""})`, w.scope1, c.scope1, "p6.e7.scope1"),
        ...(w.scope1Parts.mobile ? [r("  of which company vehicles", w.scope1Parts.mobile, c.scope1Parts.mobile, "")] : []),
        ...(w.scope1Parts.fugitive ? [r("  of which refrigerant leaks", w.scope1Parts.fugitive, c.scope1Parts.fugitive, "")] : []),
        r("Total Scope 2 emissions (location-based)", w.scope2, c.scope2, "p6.e7.scope2"),
        ...intensityRows(m, "Scope 1 and 2", c.scope1 + c.scope2, "tCO2e", "p6.e7.intensity"),
        ...(w.biogenicCO2 ? [["Biogenic CO2 from biomass (memo, outside Scope 1)", fmtN(w.biogenicCO2), c.biogenicCO2 ? "Collected" : "All estimated", "—"]] : []),
      ],
    },
    source: "Monthly collection × factors in the assumptions note",
    note: any ? (vehicles && refrig ? "Scope 1 covers stationary fuels, company vehicles and refrigerant leaks (top-up taken as leakage)." : `Scope 1 excludes ${[!refrig && "refrigerants", !vehicles && "vehicles"].filter(Boolean).join(" and ")}, which ${!refrig && !vehicles ? "are" : "is"} not yet collected.`) : undefined,
  }
}

// P6 E3: withdrawal by source, then consumption = withdrawal − discharge.
function waterTable(m: ReportModel): Answer {
  const s = m.state.collection
  const months = m.collection.period
  const t = (id: Parameters<typeof periodTotal>[2], est: boolean) => periodTotal(s, m.sites, id, months, { includeEstimates: est })
  const ground = t("water.ground", true)
  const third = t("water.third", true)
  const surface = t("water.surface", true)
  const surfaceAdded = (m.state.collection.added ?? []).includes("water.surface")
  const out = t("water.discharge", true)
  const w = ground + third + surface
  if (!w) return { kind: "placeholder" }
  const wc = t("water.ground", false) + t("water.third", false) + t("water.surface", false)
  const status = (v: number, vc: number) => (Math.abs(v - vc) > 0.01 ? `${fmtN(vc)} without estimates` : "Collected")
  const p = (key?: string) => (m.client.lastBrsr && key ? prev(key) : "—")
  return {
    kind: "partial",
    table: {
      head: ["Parameter (kL)", periodHead(m), "Data status", m.client.lastBrsr ? `${m.client.lastBrsr.fy} (filed)` : "Previous year"],
      rows: [
        surfaceAdded ? ["(i) Surface water", fmtN(surface), surface ? status(surface, t("water.surface", false)) : "Collected; none drawn", p()] : ["(i) Surface water", "—", "Not collected", p()],
        ["(ii) Groundwater", fmtN(ground), status(ground, t("water.ground", false)), p()],
        ["(iii) Third party water", fmtN(third), status(third, t("water.third", false)), p()],
        ["(iv) Seawater / desalinated water", "—", "Not collected", p()],
        ["(v) Others", "—", "Not collected", p()],
        ["Total volume of water withdrawal (i to v)", fmtN(w), status(w, wc), p("p6.e3.withdrawal")],
        ["Total volume of water consumption (withdrawal − discharge)", out ? fmtN(w - out) : "—", out ? status(w - out, wc - t("water.discharge", false)) : "Discharge not collected", p()],
        ...intensityRows(m, "Water", wc, "kL"),
      ],
    },
    source: "Monthly collection (meters, bills and ETP logs)",
    note: surfaceAdded ? "Seawater and other sources are not in the collection templates; confirm with each plant that it draws none." : "Surface water and seawater are not in the collection templates; confirm with each plant that it draws none.",
  }
}

function simpleTotal(m: ReportModel, label: string, ids: Parameters<typeof periodTotal>[2][], unit: string, key?: string, intensityLabel?: string): Answer {
  const s = m.state.collection
  const months = m.collection.period
  const w = ids.reduce((sum, id) => sum + periodTotal(s, m.sites, id, months, { includeEstimates: true }), 0)
  const c = ids.reduce((sum, id) => sum + periodTotal(s, m.sites, id, months), 0)
  if (!w) return { kind: "placeholder" }
  return {
    kind: "partial",
    table: { head: ["Parameter", periodHead(m), "Data status", m.client.lastBrsr ? `${m.client.lastBrsr.fy} (filed)` : "Previous year"], rows: [[`${label} (${unit})`, fmtN(w, w < 10 ? 2 : 0), Math.abs(w - c) > 0.01 ? `${fmtN(c)} without estimates` : "Collected", m.client.lastBrsr && key ? prev(key) : "—"], ...(intensityLabel ? intensityRows(m, intensityLabel, c, unit) : [])] },
    source: "Monthly collection",
  }
}

const annualVal = (m: ReportModel, id: AnnualId) => m.state.collection.annual?.[id]
const annualApproved = (m: ReportModel, ids: AnnualId[]) => ids.every((id) => annualVal(m, id)?.status === "approved")

// The answer for a question: what the records say, then any answer drafted in
// esgOS on top. A draft replaces a placeholder or an interview summary, sits
// above a data table, and counts as answered once the owner confirms it in review.
export function answerFor(e: BrsrEntry, m: ReportModel): Answer {
  const base = baseAnswer(e, m)
  const draft = m.state.drafts?.[e.id]
  if (!draft?.text.trim()) return base
  const confirmed = draftConfirmed(e.id, e.owner, draft, m.state.reportReview)
  const who = draft.by.split(" (")[0]
  const on = new Date(draft.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const signed = m.state.reportReview.sessions[sessionOwner(e.owner)]?.signedOffAt
  const source = `Drafted by ${who} on ${on}${confirmed && signed ? `; confirmed by the ${sessionOwner(e.owner).toLowerCase()} in review on ${new Date(signed).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}${base.source && base.kind !== "placeholder" ? ` · ${base.source}` : ""}`
  if (base.table) return { ...base, text: draft.text.trim(), source, kind: confirmed && base.kind !== "placeholder" ? base.kind : base.kind }
  return { kind: confirmed ? "answered" : "partial", text: draft.text.trim(), source, note: confirmed ? undefined : `To be confirmed by the ${sessionOwner(e.owner).toLowerCase()} in the test report review.` }
}

function baseAnswer(e: BrsrEntry, m: ReportModel): Answer {
  const c = m.client
  const pre = !!c.preIpo
  const P = () => placeholder(e, m)
  const orPlaceholder = (a: Answer) => (a.kind === "placeholder" ? P() : a)
  switch (e.id) {
    case "A.1":
      return c.cin ? { kind: "answered", text: c.cin, source: "Company master data" } : P()
    case "A.2":
      return { kind: "answered", text: c.legalName, source: "Company master data" }
    case "A.3":
      return c.incorporated ? { kind: "answered", text: c.incorporated, source: pre ? "MCA record (public mirror); confirm against the certificate of incorporation" : "Company master data" } : P()
    case "A.4":
      return c.registeredOffice ? { kind: "answered", text: c.registeredOffice, source: pre ? "MCA record (public mirror)" : "Company filings" } : P()
    case "A.9":
      return { kind: "answered", text: `${m.fy} (${m.period})`, source: "Reporting period" }
    case "A.10":
      return c.listed ? { kind: "answered", text: `${c.listed.exchange} (${c.listed.symbol})${c.listed.bse ? `, BSE (${c.listed.bse})` : ""}`, source: "Exchange listing" } : { kind: "partial", text: "Not listed. This test report anticipates listing.", note: "Complete after listing." }
    case "A.12": {
      const cs = people(m, "Company secretary")
      const org = m.state.orgByClient[c.id]
      const name = org?.you.name ? `${org.you.name}, ${org.you.designation}` : cs.name
      return name ? { kind: "partial", text: `${name}${org?.you.email ? `, ${org.you.email}` : ""}`, source: "Organisation details in esgOS", note: "Confirm the BRSR contact person with the company secretary." } : P()
    }
    case "A.13":
      return { kind: "answered", text: m.boundary, source: "Boundary decision in esgOS" }
    case "A.14":
    case "A.15":
      return { kind: "partial", text: "Not applicable to this test report. An assessment or assurance provider is to be appointed before the first published BRSR.", note: "SEBI glide path: BRSR Core assessment or assurance for the top 1,000 listed companies from FY2026-27." }
    case "A.18": {
      const byType = (t: string) => m.sites.filter((s) => (t === "plant" ? s.type === "factory" : s.type !== "factory")).length
      return {
        kind: "partial",
        table: { head: ["Location", "Number of plants", "Number of offices", "Total"], rows: [["National", String(byType("plant")), String(byType("office")), String(m.sites.length)], ["International", "—", "—", "—"]] },
        source: pre ? "Public records and the client's energy file, confirmed in the footprint step" : "Filed BRSR, public records and confirmations",
        note: "International locations not yet confirmed.",
      }
    }
    case "A.20": {
      const s = m.state.collection
      const last = [...m.collection.months].reverse().find((mo) => periodTotal(s, m.sites, "hr.headcount", [mo]) > 0)
      if (!last) return P()
      return { kind: "partial", text: `Headcount at the end of ${last}: ${fmtN(periodTotal(s, m.sites, "hr.headcount", [last]))} (permanent and contract, all sites). The split by gender, category and differently abled is not yet collected.`, source: "Monthly collection" }
    }
    case "A.23": {
      const rows = m.entities.filter((x) => !x.aggregate).map((x) => [x.name, x.relationship === "holding" ? "Reporting entity" : x.relationship ?? "", x.holdingPct !== undefined ? `${x.holdingPct}%` : "—", "To confirm"])
      return { kind: "partial", table: { head: ["Name", "Holding / subsidiary / associate / JV", "% shares held", "Participates in BR initiatives?"], rows }, source: pre ? "MCA, court and rating records" : "Filed BRSR and registry", note: "Participation in BR initiatives to be confirmed by the company secretary." }
    }
    case "A.11": {
      const v = annualVal(m, "fin.paidUp")
      return v ? { kind: v.status === "approved" ? "answered" : "partial", text: `₹${fmtN(v.value, 2)} crore`, source: v.evidence ?? "Audited balance sheet", note: v.status === "approved" ? undefined : "Entered; awaiting review." } : P()
    }
    case "A.24": {
      const a = m.state.collection.annual
      const csr = csrApplicable(a)
      if (!csr) return interviewAnswer(m, [e.id]) ?? P()
      const v = (id: AnnualId) => a?.[id]
      const ok = (["fin.revenue", "fin.netWorth", "fin.netProfit"] as AnnualId[]).every((id) => v(id)?.status === "approved")
      const rows = [
        ["Whether CSR is applicable as per section 135 of the Companies Act, 2013", csr.applicable ? "Yes" : "No"],
        ["Turnover (₹ crore)", fmtN(v("fin.revenue")!.value, 2)],
        ["Net worth (₹ crore)", fmtN(v("fin.netWorth")!.value, 2)],
        ...(v("fin.csrObligation") ? [["CSR obligation for the year (₹ crore)", fmtN(v("fin.csrObligation")!.value, 2)]] : []),
        ...(v("fin.csrSpent") ? [["CSR amount spent (₹ crore)", fmtN(v("fin.csrSpent")!.value, 2)]] : []),
      ]
      return { kind: ok ? "answered" : "partial", table: { head: ["Item", m.fy], rows }, source: "Company data from the audited financial statements", note: `Section 135 tests: ${csr.tests.map((t) => t.text).join("; ")}.${ok ? "" : " Awaiting review."}` }
    }
    case "P1.E8": {
      const d = daysPayable(m.state.collection.annual)
      if (d === undefined) return P()
      return { kind: annualApproved(m, ["fin.payables", "fin.purchases"]) ? "answered" : "partial", table: { head: ["", m.fy], rows: [["Number of days of accounts payable ((Accounts payable × 365) ÷ cost of goods and services procured)", fmtN(d, 1)]] }, source: "Company data: trade payables and purchases from the audited financial statements" }
    }
    case "P8.E4": {
      const a = m.state.collection.annual
      const msme = share(a, "fin.msmePurchases", "fin.purchases")
      const india = share(a, "fin.indiaPurchases", "fin.purchases")
      if (msme === undefined && india === undefined) return P()
      return {
        kind: annualApproved(m, ["fin.purchases", "fin.msmePurchases", "fin.indiaPurchases"]) ? "answered" : "partial",
        table: { head: ["", m.fy], rows: [["Directly sourced from MSMEs / small producers", msme !== undefined ? `${fmtN(msme, 1)}%` : "—"], ["Directly from within India", india !== undefined ? `${fmtN(india, 1)}%` : "—"]] },
        source: "Company data: purchase ledger with MSME and country tags",
      }
    }
    case "P2.E1": {
      const a = m.state.collection.annual
      const capex = share(a, "fin.capexSustainable", "fin.capex")
      const rnd = share(a, "fin.rndSustainable", "fin.rnd")
      if (capex === undefined && rnd === undefined) return interviewAnswer(m, [e.id]) ?? P()
      return {
        kind: annualApproved(m, ["fin.capex", "fin.capexSustainable"]) ? "answered" : "partial",
        table: { head: ["", m.fy, "Details of improvements in environmental and social impacts"], rows: [["R&D", rnd !== undefined ? `${fmtN(rnd, 1)}%` : "—", "[To be described by the Finance controller]"], ["Capex", capex !== undefined ? `${fmtN(capex, 1)}%` : "—", "[To be described by the Finance controller]"]] },
        source: "Company data: R&D and capex ledgers tagged by purpose",
      }
    }
    case "P3.E1": {
      const wb = share(m.state.collection.annual, "fin.wellbeing", "fin.revenue")
      if (wb === undefined) return interviewAnswer(m, [e.id]) ?? P()
      return {
        kind: "partial",
        table: { head: ["", m.fy], rows: [["(c) Cost incurred on well-being measures as a % of total revenue of the company", `${fmtN(wb, 2)}%`]] },
        source: "Company data: well-being spend and revenue from operations",
        note: "Parts (a) and (b), coverage of health, accident, maternity, paternity and day care by category and gender, are not yet collected.",
      }
    }
    case "P6.E1":
      return energyTable(m)
    case "P6.E7":
      return ghgTable(m)
    case "P6.E3":
      return orPlaceholder(waterTable(m))
    case "P6.E4":
      return orPlaceholder(simpleTotal(m, "Total water discharged", ["water.discharge"], "kL"))
    case "P6.E9":
      return orPlaceholder(simpleTotal(m, "Total waste generated (hazardous, plastic, other)", ["waste.haz", "waste.plastic", "waste.other"], "t", "p6.e9.total", "Waste"))
    case "P3.E11": {
      const w = m.collection.withEstimates
      if (w.ltifr === undefined) return P()
      const head = ["Safety incident / number", periodHead(m), "Data status", m.client.lastBrsr ? `${m.client.lastBrsr.fy} (filed)` : "Previous year"]
      if (w.ltifrEmployees !== undefined && w.ltifrWorkers !== undefined)
        return {
          kind: "partial",
          table: {
            head,
            rows: [
              ["LTIFR (per one million person-hours worked), employees", fmtN(w.ltifrEmployees, 2), "Collected", "—"],
              ["LTIFR (per one million person-hours worked), workers", fmtN(w.ltifrWorkers, 2), "Collected", m.client.lastBrsr ? prev("p3.e11.ltifr.workers") : "—"],
            ],
          },
          source: "Monthly collection (lost-time injuries and person-hours, employees collected separately)",
          note: `Split over the ${w.splitMonths} month${w.splitMonths === 1 ? "" : "s"} with employees' hours collected; workers are the rest of those months' hours and injuries. Recordable injuries, fatalities and high-consequence injuries are not yet collected.`,
        }
      return { kind: "partial", table: { head, rows: [["LTIFR (per one million person-hours worked), employees and workers combined", fmtN(w.ltifr, 2), "Collected", m.client.lastBrsr ? prev("p3.e11.ltifr.workers") : "—"]] }, source: "Monthly collection (lost-time injuries and person-hours)", note: "Split by employees and workers, recordable injuries and fatalities not yet collected. Add the employees' hours and injuries to monthly collection to split it." }
    }
  }
  // Section B and qualitative items: what management said in interviews.
  if (e.section === "B" || e.dataType === "policy" || e.dataType === "governance" || e.dataType === "qualitative") {
    if (e.id === "B.8" || e.id === "B.9") {
      const lead = people(m, "ESG lead").name
      const iv = interviewAnswer(m, [e.id])
      if (iv) return iv
      return lead ? { kind: "partial", text: `ESG lead named in esgOS: ${lead}. The Board-level owner is to be confirmed.`, source: "Organisation details" } : P()
    }
    return interviewAnswer(m, [e.id]) ?? P()
  }
  return interviewAnswer(m, [e.id]) ?? P()
}

export function answerAll(m: ReportModel) {
  const out = BRSR_ENTRIES.map((e) => ({ entry: e, answer: answerFor(e, m) }))
  const count = (k: Answer["kind"]) => out.filter((x) => x.answer.kind === k).length
  return { rows: out, answered: count("answered"), partial: count("partial"), placeholder: count("placeholder") }
}

export const PRINCIPLE_NAMES: Record<string, string> = {
  P1: "Businesses should conduct and govern themselves with integrity, and in a manner that is Ethical, Transparent and Accountable",
  P2: "Businesses should provide goods and services in a manner that is sustainable and safe",
  P3: "Businesses should respect and promote the well-being of all employees, including those in their value chains",
  P4: "Businesses should respect the interests of and be responsive to all its stakeholders",
  P5: "Businesses should respect and promote human rights",
  P6: "Businesses should respect and make efforts to protect and restore the environment",
  P7: "Businesses, when engaging in influencing public and regulatory policy, should do so in a manner that is responsible and transparent",
  P8: "Businesses should promote inclusive growth and equitable development",
  P9: "Businesses should engage with and provide value to their consumers in a responsible manner",
}
