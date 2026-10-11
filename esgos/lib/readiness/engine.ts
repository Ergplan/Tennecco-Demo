// Readiness engine. Assesses every BRSR question and IFRS S1/S2 requirement for
// the active client, then ranks each gap and places it on a roadmap. The rules
// are deliberately simple and shown to the user ("how" and "scores").

import raw from "./catalogue.json"
import type { BrsrEntry, Catalogue, Effort, GapCategory, IssbEntry, Milestone, MilestoneId, Priority, ReadinessItem, Status } from "./types"
import type { DemoState } from "../store"
import type { IndicatorResult, SourceKey, Stakeholder } from "../types"
import { INDICATORS } from "../indicators"
import { getClient } from "../clients"
import { roleForOwner } from "../org"
import { findings as interviewFindings, worst, RATING_LABEL, type Finding } from "../interviews/plan"
import { brsrCoverage, completeness } from "../collection/calc"
import { METRIC_BY_ID } from "../collection/model"
import { EMPTY_CLOSURE, applyClosure, brsrOwner } from "../closure"
import { EMPTY_REPORT_REVIEW } from "../reportReview"
import { OUTCOME_LABEL, reviewRows, worstOutcome, type ReviewRow } from "../documents/review"

export const CATALOGUE = raw as unknown as Catalogue

export const MILESTONES: Milestone[] = [
  { id: "M1", title: "Governance foundation", outcome: "Board-approved policies, ESG committee, materiality and boundary decided", start: 0, end: 10 },
  { id: "M2", title: "Data systems at every plant", outcome: "Meters, HR, ERP and EHS data flowing for every plant, with owners", start: 4, end: 20 },
  { id: "M3", title: "BRSR Core assurance-ready", outcome: "Every Core KPI traceable to evidence; assurance provider appointed", start: 14, end: 30 },
  { id: "M4", title: "First BRSR (test report)", outcome: "Full BRSR drafted in the SEBI format and reviewed with data owners", start: 26, end: 40 },
  { id: "M5", title: "ISSB and leadership indicators", outcome: "Climate strategy, scenario analysis, Scope 3 and value chain", start: 40, end: 78 },
]

type S = Pick<DemoState, "sources" | "documents" | "stakeholders" | "gaps" | "analysis" | "sites" | "connect" | "energy" | "group"> & Partial<Pick<DemoState, "interviews" | "collection" | "docReview" | "closure" | "drafts" | "reportReview">>

// BRSR question → the engine indicators that evaluate it from data.
export function engineIdsFor(id: string): string[] {
  const a = id.match(/^A\.(\d+)/)
  if (a) {
    const n = Number(a[1])
    const map: Record<number, string> = { 13: "A.I.13", 14: "A.I.14", 15: "A.I.14", 16: "A.II.16", 17: "A.II.17", 18: "A.III.18", 20: "A.IV.20", 23: "A.V.23", 24: "A.VI.24", 26: "A.VII.26" }
    if (n <= 12) return ["A.I.1"]
    return map[n] ? [map[n]] : []
  }
  const b = id.match(/^B\.(\d+)/)
  if (b) {
    const n = Number(b[1])
    if (n === 1 || n === 2 || n === 3) return ["B.1"]
    if (n === 5 || n === 6) return ["B.5"]
    if (n === 7 || n === 8) return ["B.8"]
    return []
  }
  const c = id.match(/^(P\d)\.([EL]\d+)$/)
  if (c) return INDICATORS.filter((i) => i.id === `${c[1]}.${c[2]}` || i.id.startsWith(`${c[1]}.${c[2]}.`)).map((i) => i.id)
  return []
}

const SOURCE_PATTERNS: [RegExp, SourceKey][] = [
  [/hrms|headcount|payroll|employee|worker|wage|benefit|training|hr\b/i, "hrms"],
  [/meter|utility|electric|energy|fuel|water|emission|ghg|air/i, "ergos"],
  [/ehs|incident|safety|injur|waste|hazard/i, "ehs"],
  [/erp|finance|ledger|purchase|procure|sales|revenue|turnover|account|payable|crm|complaint|recall/i, "erp"],
  [/document|permit|consent|certificate|polic|vault/i, "vault"],
]

function sourceFor(entry: BrsrEntry): SourceKey | undefined {
  return SOURCE_PATTERNS.find(([re]) => re.test(entry.source))?.[1]
}

const SOURCE_NAME: Record<SourceKey, string> = { ergos: "Energy meters (ergOS)", hrms: "HRMS", erp: "ERP", ehs: "EHS registers", vault: "Document vault" }

function combine(statuses: Status[]): Status {
  if (!statuses.length) return "open"
  if (statuses.includes("open")) return "open"
  if (statuses.includes("sync")) return "sync"
  return "now"
}

function ownerFor(role: string, people: Stakeholder[]) {
  const mapped = roleForOwner(role) ?? (role === "Legal" ? "Company secretary" : role === "Risk" ? "Finance controller" : undefined)
  const person = mapped ? people.find((p) => !p.siteId && p.role === mapped && !p.vacant) : undefined
  return { role, person: person?.name }
}

function categoryFor(e: BrsrEntry): GapCategory {
  if (e.core) return "BRSR Core"
  if (e.kind === "leadership" || e.dataType === "value-chain") return "BRSR Leadership"
  if (e.dataType === "policy" || e.dataType === "governance") return "Policy and governance"
  return "Mandatory BRSR"
}

const CLIMATE = /P6|climate|ghg|emission|energy|water/i

function scoresFor(item: { kind: ReadinessItem["kind"]; core: boolean; section?: string; principle?: string | null; dataType?: string; pillar?: string; coverage?: string; valueChain?: boolean }) {
  let regulatory = 1
  let investor = 2
  let ipo = 1
  let deferrable = false
  if (item.kind === "issb") {
    regulatory = 1
    investor = 3
    ipo = item.pillar === "Governance" || item.pillar === "General requirements" ? 2 : 1
    // Investors expect the general requirements and governance from the first report; the rest can follow listing.
    deferrable = item.coverage !== "covered" && item.pillar !== "Governance" && item.pillar !== "General requirements"
  } else if (item.kind === "implementation") {
    regulatory = 2
    investor = 2
    ipo = 2
  } else {
    regulatory = item.kind === "leadership" || item.dataType === "value-chain" ? 1 : 3
    investor = item.core || CLIMATE.test(item.principle ?? "") ? 3 : item.section === "B" || item.principle === "P1" ? 2 : item.kind === "leadership" ? 1 : 2
    ipo = item.section === "A" || item.section === "B" || item.core || item.dataType === "policy" || item.dataType === "governance" ? 3 : item.kind === "leadership" ? 1 : 2
    deferrable = item.kind === "leadership" || item.dataType === "value-chain"
  }
  const score = regulatory * 3 + investor * 2 + ipo * 3 - (deferrable ? 4 : 0)
  return { regulatory, investor, ipo, deferrable, score }
}

function priorityFor(s: { deferrable: boolean; regulatory: number; ipo: number }): Priority {
  if (s.deferrable) return "After listing"
  if (s.ipo >= 3) return "Before listing"
  return "First BRSR year"
}

function effortFor(e: { dataType?: string; kind: ReadinessItem["kind"]; pillar?: string; sourceReady?: boolean }): { effort: Effort; weeks: number } {
  if (e.kind === "issb") return e.pillar === "Strategy" ? { effort: "L", weeks: 20 } : e.pillar === "Metrics and targets" || e.pillar === "Industry-based metrics" ? { effort: "M", weeks: 10 } : { effort: "M", weeks: 8 }
  if (e.kind === "implementation") return { effort: "M", weeks: 10 }
  switch (e.dataType) {
    case "identity":
      return { effort: "S", weeks: 2 }
    case "policy":
      return { effort: "M", weeks: 8 }
    case "governance":
      return { effort: "M", weeks: 6 }
    case "value-chain":
      return { effort: "L", weeks: 20 }
    case "qualitative":
      return { effort: "S", weeks: 3 }
    default:
      return e.sourceReady ? { effort: "S", weeks: 3 } : { effort: "L", weeks: 14 }
  }
}

function dependenciesFor(e: BrsrEntry): string[] {
  const deps: string[] = []
  const src = sourceFor(e)
  if (e.dataType === "policy") deps.push("Board meeting to approve policies")
  if (e.dataType === "governance") deps.push("ESG committee constituted")
  if (e.dataType === "quantitative" && src) deps.push(`${SOURCE_NAME[src]} live for every plant`)
  if (e.principle === "P6" && e.dataType === "quantitative") deps.push("Emission factors fixed (CEA grid v21, IPCC fuels)")
  if (/intensity|turnover/i.test(e.text)) deps.push("Audited revenue for the year")
  if (e.core) deps.push("Assurance provider appointed")
  if (e.dataType === "value-chain") deps.push("Value-chain partners identified (2% of purchases or sales)")
  return [...new Set(deps)]
}

function milestoneFor(priority: Priority, category: GapCategory, dataType?: string): MilestoneId {
  if (priority === "After listing") return "M5"
  if (priority === "First BRSR year") return "M4"
  if (category === "Policy and governance" || dataType === "identity") return "M1"
  if (category === "BRSR Core") return "M3"
  return "M2"
}

// The default recommendation for an open item: what to do and from which source.
// An interview answer, where there is one, replaces it with the guide's own.
function recommendBrsr(e: BrsrEntry, src: SourceKey | undefined): string {
  switch (e.dataType) {
    case "identity":
      return "Take it from the company master data (certificate of incorporation, MCA records, statutory registers) and have the company secretary confirm it."
    case "policy":
      return "Draft the policy, have the Board approve it, publish it on the website and record how it is applied at each plant."
    case "governance":
      return "Write the arrangement into the ESG committee's terms of reference, minute each review, and keep the minutes as evidence."
    case "value-chain":
      return "Identify partners making up 2% or more of purchases or sales, and send them the data request once the company's own data is assurance-ready."
    case "qualitative":
      return `Draft the answer with the ${e.owner.toLowerCase()} from current practice, and attach the documents it relies on.`
  }
  switch (src) {
    case "ergos":
      return "Collect it monthly for every plant from bills and meter logs, with the plant as maker and the ESG lead as checker; replace estimates with readings."
    case "hrms":
      return "Set up a monthly HRMS extract for every plant, covering contract workers, reviewed by the ESG lead before each cycle closes."
    case "ehs":
      return "Keep it in the EHS register at every plant and report it monthly, with the incident record or waste manifest as evidence."
    case "erp":
      return "Build an ERP report for it, owned by Finance and reconciled to the books each quarter."
    case "vault":
      return "File the source document in the vault and link it to this answer."
  }
  return `Name the ${e.owner.toLowerCase()} as owner, agree the source document, and add it to the monthly collection templates.`
}

const ISSB_RECOMMENDATION: Record<string, string> = {
  Governance: "Give the Board explicit oversight of climate risks and opportunities: the committee's terms of reference, how often it is briefed, and any link to remuneration.",
  Strategy: "Run a climate risk and opportunity assessment with scenario analysis, and record the effects on strategy, cash flows and the transition plan.",
  "Risk management": "Add climate and other sustainability risks to the enterprise risk register, with how they are identified, assessed and monitored.",
  "Metrics and targets": "Extend the GHG inventory to the IFRS S2 metrics (including a Scope 3 screen), and set targets with a base year.",
  "Industry-based metrics": "Report the SASB Processed Foods metrics BRSR does not ask for, from plant and procurement data already being collected.",
  "General requirements": "Align the reporting entity, period and connected information with the financial statements, and state the basis of preparation.",
}

function interviewLabel(f: Finding) {
  return `${f.interview.siteId ? `${f.interview.title} plant` : f.guide.title} interview`
}

function applyInterview(item: ReadinessItem, f: Finding[]) {
  const w = worst(f.map((x) => x.answer.rating!))!
  const bad = f.filter((x) => x.answer.rating === w)
  const lead = bad[0]
  const who = [...new Set(f.map(interviewLabel))]
  item.interview = { count: f.length, worst: w, sources: who }
  item.how = `${item.how}; ${who.join(", ")}: ${RATING_LABEL[w].toLowerCase()}`
  if (w === "not-in-place") {
    item.status = "open"
    item.gap = `${interviewLabel(lead)}: ${lead.answer.note?.trim() || "not in place"}${bad.length > 1 ? ` (and ${bad.length - 1} more)` : ""}`
    item.recommendation = lead.question.recommendation
  } else if (w === "partial") {
    item.status = item.status === "now" ? "sync" : item.status === "open" && item.kind !== "issb" ? "sync" : item.status
    item.gap = `${interviewLabel(lead)}: partly in place${lead.answer.note?.trim() ? ` (${lead.answer.note.trim()})` : ""}`
    item.recommendation = lead.question.recommendation
  } else {
    // In place. Data kept outside a system still needs controls before assurance.
    const systems = f.map((x) => x.answer.system).filter(Boolean)
    const evidenced = f.some((x) => x.answer.evidence?.trim())
    if (systems.includes("none")) {
      item.status = "open"
      item.gap = `${interviewLabel(lead)}: practised but not recorded.`
      item.recommendation = lead.question.recommendation
    } else if (systems.includes("manual") || systems.includes("spreadsheet")) {
      if (item.status === "open") item.status = "sync"
      item.gap = `${interviewLabel(lead)}: recorded ${systems.includes("manual") ? "on paper" : "in spreadsheets"}; add review and sign-off before assurance.`
      item.recommendation = lead.question.recommendation
    } else if (item.status === "open") {
      item.status = evidenced && item.kind !== "issb" ? "now" : "sync"
      item.gap = item.status === "now" ? "" : `${interviewLabel(lead)}: confirmed; file the evidence.`
    } else if (item.status === "sync" && evidenced) {
      item.status = "now"
      item.gap = ""
    }
  }
}

// Desktop document review: a document that is missing or falls short opens the
// item; one that is adequate shows the source exists (policies count as in place).
function applyDocuments(item: ReadinessItem, rows: ReviewRow[]) {
  const outcomes = rows.map((r) => r.review!.outcome!)
  const w = worstOutcome(outcomes)!
  const bad = rows.filter((r) => r.review!.outcome === w)
  const name = (r: ReviewRow) => `${r.doc.title}${r.site ? ` (${r.site.name})` : ""}`
  item.documents = { count: rows.length, worst: w, sources: [...new Set(rows.map(name))] }
  item.how = `${item.how}; document review: ${OUTCOME_LABEL[w].toLowerCase()}`
  const lead = bad[0]
  const where = bad.length > 1 && bad.every((r) => r.site) ? ` at ${bad.length} plants` : bad.length > 1 ? ` (and ${bad.length - 1} more)` : ""
  if (w === "missing" || w === "inadequate") {
    item.status = "open"
    item.gap = `Document review: ${lead.doc.title}${lead.site && !where ? ` (${lead.site.name})` : ""} ${w === "missing" ? "not available" : "not adequate"}${where}${lead.review!.notes?.trim() ? `; ${lead.review!.notes.trim()}` : ""}.`
    item.recommendation = lead.doc.recommendation
  } else if (w === "partial") {
    item.status = "sync"
    item.gap = `Document review: ${lead.doc.title} partly adequate${where}${lead.review!.notes?.trim() ? `; ${lead.review!.notes.trim()}` : ""}.`
    item.recommendation = lead.doc.recommendation
  } else {
    const ENTRY = CATALOGUE.brsr.find((e) => e.id === item.id)
    if (ENTRY && (ENTRY.dataType === "policy" || ENTRY.dataType === "governance")) {
      item.status = "now"
      item.gap = ""
    } else if (item.status === "open") {
      item.status = "sync"
      item.gap = `Document review: ${lead.doc.title} on file; trace the reported values to it.`
    }
  }
}

export type ReadinessSummary = {
  items: ReadinessItem[]
  // Monthly collection coverage by BRSR question (and metered energy), for closing the gaps.
  coverage: Record<string, { closedShare: number; yearApproved: boolean }>
  counts: { total: number; now: number; sync: number; open: number }
  brsr: { total: number; now: number; sync: number; open: number; core: number; coreReady: number; leadership: number }
  issb: { total: number; covered: number; partial: number; not: number }
  byCategory: Record<GapCategory, number>
  byPriority: Record<Priority, number>
}

export function assessReadiness(state: S, results?: IndicatorResult[]): ReadinessSummary {
  const client = getClient()
  const filed = client.lastBrsr
  const people = state.stakeholders
  const resultMap = new Map((results ?? state.analysis.results ?? []).map((r) => [r.id, r]))
  const analysed = resultMap.size > 0
  const connected = (k: SourceKey) => state.sources[k]?.status === "connected" || state.sources[k]?.status === "partial"
  const policyDocs = state.documents.filter((d) => d.kind === "policy")
  // Energy from a client's own workbook is named as such, not as ergOS.
  const fileEnergy = Object.values(state.energy).some((e) => e.sourceLabel)
  const sourceName = (k: SourceKey) => (k === "ergos" && fileEnergy ? "Client energy file" : SOURCE_NAME[k])
  const items: ReadinessItem[] = []
  const brsrStatus = new Map<string, Status>()

  for (const e of CATALOGUE.brsr) {
    const engineIds = engineIdsFor(e.id)
    const src = sourceFor(e)
    let status: Status
    let how: string
    let gap = ""
    const evaluated = engineIds.filter((id) => resultMap.has(id))
    if (evaluated.length && analysed) {
      status = combine(evaluated.map((id) => resultMap.get(id)!.status))
      how = `Coverage check on ${evaluated.join(", ")}`
      if (status !== "now") {
        // Name the most specific gap: the one blocking the fewest indicators.
        const related = state.gaps.filter((g) => g.blocks.some((b) => evaluated.includes(b))).sort((a, b) => a.blocks.length - b.blocks.length)
        const first = related[0]
        const text = first ? first.title.split(" — ").slice(1).join(" — ") || first.title : ""
        gap = related.length ? (related.length === 1 ? text : `${related.length} open items, for example: ${first.scopeLabel ? `${first.scopeLabel}: ` : ""}${text.charAt(0).toLowerCase() + text.slice(1)}`) : "Waiting for a source to sync."
      }
    } else if (filed) {
      status = e.dataType === "identity" ? "now" : "sync"
      how = e.dataType === "identity" ? "Company master data" : `Answered in the filed ${filed.fy} BRSR; refresh for ${state.group.fiscalYear}`
      gap = status === "sync" ? `Update last year's answer for ${state.group.fiscalYear} and keep the evidence.` : ""
    } else if (e.dataType === "identity") {
      status = client.cin ? "now" : "open"
      how = "Company master data"
      gap = status === "open" ? "Company master data missing." : ""
    } else if (e.dataType === "policy" || e.dataType === "governance") {
      status = policyDocs.length && connected("vault") ? "sync" : "open"
      how = status === "sync" ? `${policyDocs.length} policy documents on file; confirm they cover this` : "No policy or governance documents on file"
      gap = status === "open" ? (e.dataType === "policy" ? "No board-approved policy or procedure on file." : "No documented governance arrangement on file.") : "Confirm the policy covers this and is board-approved."
    } else if (src && connected(src)) {
      status = "sync"
      how = `${sourceName(src)} connected`
      gap = `Set up the extract for this indicator from ${sourceName(src)}.`
    } else {
      status = "open"
      how = src ? `${sourceName(src)} not connected` : "Needs input from the owner"
      gap = e.dataType === "value-chain" ? "Value-chain partner data not collected." : e.dataType === "qualitative" ? `Not drafted yet; needs the ${e.owner.toLowerCase()}.` : `No data source yet: ${e.source}.`
    }
    brsrStatus.set(e.id, status)
    const s = scoresFor({ kind: e.kind, core: e.core, section: e.section, principle: e.principle, dataType: e.dataType, valueChain: e.valueChain })
    const priority = priorityFor(s)
    const category = categoryFor(e)
    // An energy workbook with estimated months is not a ready source.
    const { effort, weeks } = effortFor({ dataType: e.dataType, kind: e.kind, sourceReady: !!src && connected(src) && !(src === "ergos" && fileEnergy) })
    items.push({
      id: e.id,
      framework: "BRSR",
      ref: e.section === "C" ? `${e.principle} ${e.kind === "essential" ? "Essential" : "Leadership"} ${e.number}` : `Section ${e.section} · ${e.number}`,
      title: e.title,
      text: e.text,
      status,
      how,
      category,
      gap,
      owner: ownerFor(e.owner, people),
      scores: { regulatory: s.regulatory, investor: s.investor, ipo: s.ipo, deferrable: s.deferrable },
      score: s.score,
      priority,
      effort,
      weeks,
      dependsOn: dependenciesFor(e),
      milestone: milestoneFor(priority, category, e.dataType),
      engineIds,
      core: e.core,
      kind: e.kind,
      principle: e.principle,
      recommendation: recommendBrsr(e, src),
    })
  }

  // Policies only count once they work at every plant.
  for (let n = 1; n <= 9; n++) {
    const p = `P${n}`
    const s = scoresFor({ kind: "implementation", core: false })
    const policy = brsrStatus.get("B.1a") ?? "open"
    items.push({
      id: `IMP.${p}`,
      framework: "Implementation",
      ref: `${p} in practice`,
      title: `${p} policy working at every plant`,
      text: `Procedures, training, grievance and monitoring records show the ${p} policy is applied at each plant, not just adopted.`,
      status: policy === "open" ? "open" : "sync",
      how: policy === "open" ? "Policy not adopted yet" : "Policy on file; plant-level evidence not reviewed",
      category: "Implementation",
      gap: "No plant-level evidence of the policy in practice yet.",
      owner: ownerFor(n === 3 || n === 5 ? "HR manager" : n === 6 ? "EHS manager" : n === 2 || n === 8 ? "Procurement head" : "ESG lead", people),
      scores: { regulatory: s.regulatory, investor: s.investor, ipo: s.ipo, deferrable: s.deferrable },
      score: s.score,
      priority: "First BRSR year",
      ...effortFor({ kind: "implementation" }),
      dependsOn: ["Policies adopted (Section B)"],
      recommendation: `Show the ${p} policy working at each plant: procedure, training records, grievance log and monitoring, checked in the plant interviews.`,
      milestone: "M2",
      engineIds: [],
      core: false,
      kind: "implementation",
      principle: p,
    })
  }

  // Metered data that an assurer can trace: estimated or missing plant data is a Core risk.
  const factories = state.sites.filter((x) => x.status === "confirmed" && x.type === "factory")
  if (factories.length) {
    const metered = factories.filter((x) => state.connect.siteStatus[x.id] === "connected" && (state.energy[x.id]?.completeness ?? 0) >= 0.9)
    const weak = factories.length - metered.length
    if (weak > 0) {
      const s = scoresFor({ kind: "implementation", core: true })
      items.push({
        id: "IMP.metering",
        framework: "Implementation",
        ref: "BRSR Core · energy and GHG",
        title: "Metered energy data at every plant",
        text: "BRSR Core energy and GHG figures must trace to meter readings or bills for every plant, month by month.",
        status: "open",
        how: `${metered.length} of ${factories.length} plants have complete metered data`,
        category: "BRSR Core",
        gap: `${weak} of ${factories.length} plants rely on estimates or have no energy data.`,
        owner: ownerFor("Energy manager", people),
        scores: { regulatory: 3, investor: 3, ipo: 3, deferrable: false },
        score: s.score + 6,
        priority: "Before listing",
        effort: "L",
        weeks: 12,
        dependsOn: ["Energy meters (ergOS) live for every plant"],
        recommendation: "Read meters or collect bills for every plant and month (kWh and kVAh), and replace estimates (averages, copied months, connected load) with readings.",
        milestone: "M2",
        engineIds: ["P6.E1.elec", "P6.E1.fuel", "P6.E7.scope2"],
        core: true,
        kind: "implementation",
        principle: "P6",
      })
    }
  }

  // The Core KPIs flagged for value chain must also be reported for top partners
  // (voluntary, top 250 from FY2025-26). One programme, not one item per KPI.
  const chainKpis = CATALOGUE.brsr.filter((e) => e.valueChain)
  if (chainKpis.length) {
    const s = scoresFor({ kind: "implementation", core: false })
    items.push({
      id: "IMP.valuechain",
      framework: "Implementation",
      ref: "BRSR Core · value chain",
      title: "Value-chain ESG data from top partners",
      text: "BRSR Core KPIs reported for upstream and downstream partners making up 2% or more of purchases or sales (voluntary for the top 250 from FY2025-26).",
      status: "open",
      how: `${chainKpis.length} KPIs to collect from partners`,
      category: "BRSR Leadership",
      gap: "Partners not identified; no supplier data request yet.",
      owner: ownerFor("Procurement head", people),
      scores: { regulatory: 1, investor: 3, ipo: 1, deferrable: true },
      score: s.score - 4,
      priority: "After listing",
      effort: "L",
      weeks: 24,
      dependsOn: ["Value-chain partners identified (2% of purchases or sales)", "Own BRSR Core data assurance-ready"],
      recommendation: "List partners above 2% of purchases or sales, agree a short BRSR Core questionnaire, and pilot it with the largest five suppliers.",
      milestone: "M5",
      engineIds: [],
      core: false,
      kind: "implementation",
      principle: null,
    })
  }

  for (const i of CATALOGUE.issb) {
    const mapped = i.brsr.map((id) => brsrStatus.get(id)).filter(Boolean) as Status[]
    const status: Status = i.coverage === "covered" ? combine(mapped) : "open"
    const s = scoresFor({ kind: "issb", core: false, pillar: i.pillar, coverage: i.coverage })
    const priority: Priority = s.deferrable ? "After listing" : "First BRSR year"
    const { effort, weeks } = effortFor({ kind: "issb", pillar: i.pillar })
    items.push({
      id: i.id,
      framework: "ISSB",
      ref: i.ref,
      title: i.title,
      text: i.requirement,
      status,
      how: i.coverage === "covered" ? `Covered by BRSR ${i.brsr.join(", ")}` : i.coverage === "partial" ? `Partly covered by BRSR ${i.brsr.join(", ") || "—"}` : "Not covered by BRSR",
      category: i.coverage === "covered" ? "Mandatory BRSR" : "ISSB incremental",
      gap: i.coverage === "covered" ? (status === "now" ? "" : "Closes when the BRSR items close.") : i.gap,
      owner: ownerFor(i.pillar === "Governance" ? "Company secretary" : i.pillar === "Metrics and targets" ? "ESG lead" : i.pillar === "Strategy" || i.pillar === "Risk management" ? "Finance controller" : "ESG lead", people),
      scores: { regulatory: s.regulatory, investor: s.investor, ipo: s.ipo, deferrable: s.deferrable },
      score: s.score,
      priority,
      effort,
      weeks,
      dependsOn:
        i.pillar === "Strategy"
          ? ["Climate risk register", "Scope 1–3 inventory"]
          : i.pillar === "Metrics and targets" || i.pillar === "Industry-based metrics"
            ? ["GHG inventory (Scope 1 and 2)"]
            : i.pillar === "General requirements"
              ? ["Decide the reporting entity (consolidated, as in the financial statements)"]
              : ["Board-level climate oversight agreed"],
      milestone: priority === "After listing" ? "M5" : "M4",
      engineIds: [],
      core: false,
      kind: "issb",
      coverage: i.coverage,
      pillar: i.pillar,
      recommendation: i.coverage === "covered" ? "Closes when the mapped BRSR questions close." : ISSB_RECOMMENDATION[i.pillar] ?? "Plan the disclosure with the ESG lead and the CFO.",
    })
  }

  // Desktop document review, then interviews: documents show what exists; interviews show what is practised.
  if (state.docReview) {
    const rows = reviewRows(state.docReview, state.sites).filter((r) => r.review?.outcome)
    for (const item of items) {
      const mine = rows.filter((r) => r.doc.refs.includes(item.id))
      if (mine.length) applyDocuments(item, mine)
    }
  }

  // Management interviews: what people say is practised confirms, weakens or opens an item.
  if (state.interviews) {
    const all = interviewFindings(state.interviews)
    for (const item of items) {
      const f = all.filter((x) => x.question.refs.includes(item.id) && x.answer.rating && x.answer.rating !== "na")
      if (!f.length) continue
      applyInterview(item, f)
    }
  }

  // Monthly collection: closed cycles with collected (not estimated) values strengthen the items they feed.
  const col = state.collection
  const closed = col?.setupAt ? col.months.filter((m) => col.cycles[m]?.closedAt) : []
  const coverage: Record<string, { closedShare: number; yearApproved: boolean }> = {}
  if (col?.setupAt) {
    const sitesIn = state.sites.filter((x) => x.status === "confirmed")
    if (closed.length) {
      const cov = brsrCoverage(col, sitesIn, closed)
      const year = brsrCoverage(col, sitesIn, col.months)
      for (const [id, c] of Object.entries(cov)) coverage[id] = { closedShare: c.share, yearApproved: !!year[id]?.expected && year[id].approved === year[id].expected }
      // Metered energy: bills or readings (not estimates) for every plant, month by month.
      const plantsIn = sitesIn.filter((x) => x.type === "factory")
      const grid = [METRIC_BY_ID["elec.grid"]]
      const mc = completeness(col, plantsIn, closed, grid)
      const my = completeness(col, plantsIn, col.months, grid)
      coverage["IMP.metering"] = { closedShare: mc.share, yearApproved: my.expected > 0 && my.approved === my.expected }
      const meter = items.find((x) => x.id === "IMP.metering")
      if (meter) {
        meter.how = `${meter.how}; monthly collection: ${Math.round(mc.share * 100)}% of plant-months from bills or readings`
        if (coverage["IMP.metering"].yearApproved) {
          meter.status = "now"
          meter.gap = ""
        } else if (mc.share >= 0.9) {
          meter.status = "sync"
          meter.gap = `Bills or readings for ${Math.round(mc.share * 100)}% of plant-months collected; finish the year and replace the remaining estimates.`
        }
      }
      for (const item of items) {
        const c = cov[item.id]
        if (!c || !c.expected) continue
        const pct = Math.round(c.share * 100)
        const y = year[item.id]
        item.how = `${item.how}; monthly collection: ${pct}% of values for ${closed.length} closed month${closed.length === 1 ? "" : "s"}`
        if (y && y.expected && y.approved === y.expected) {
          item.status = "now"
          item.gap = ""
        } else if (c.share >= 0.9) {
          if (item.status === "open") item.status = "sync"
          item.gap = `Collected for ${closed.length} closed month${closed.length === 1 ? "" : "s"}; finish the remaining months and review them.`
        } else if (item.status !== "open" || !item.gap) {
          item.gap = `Monthly collection has ${pct}% of the values for the closed months; chase the owners.`
        }
      }
    }
    const s = scoresFor({ kind: "implementation", core: true })
    items.push({
      id: "IMP.collection",
      framework: "Implementation",
      ref: "Data collection procedure",
      title: "Monthly ESG data collection running",
      text: "Data owners submit plant data every month with evidence; values are reviewed and each cycle is closed. Three to six closed cycles show the process works before the first BRSR.",
      status: closed.length >= 3 ? "now" : closed.length ? "sync" : "open",
      how: `${closed.length} of ${col.months.length} monthly cycles closed`,
      category: "Implementation",
      gap: closed.length >= 3 ? "" : `${3 - closed.length} more closed cycle${3 - closed.length === 1 ? "" : "s"} needed to show the process works.`,
      owner: ownerFor("ESG lead", people),
      scores: { regulatory: 3, investor: 2, ipo: 3, deferrable: false },
      score: s.score,
      priority: "Before listing",
      effort: "M",
      weeks: 12,
      dependsOn: ["Data owners named at every plant", "Collection templates issued"],
      recommendation: "Close at least three monthly cycles with evidence and review, and report completeness to the ESG committee each month.",
      milestone: "M2",
      engineIds: [],
      core: false,
      kind: "implementation",
      principle: null,
    })
  }

  // Closing the gaps: added metrics, company data, data requests, drafted answers
  // and verified decisions move items on.
  if (col) {
    applyClosure(items, {
      collection: col,
      closure: state.closure ?? EMPTY_CLOSURE,
      drafts: state.drafts ?? {},
      docReview: state.docReview ?? { reviews: {} },
      reportReview: state.reportReview ?? EMPTY_REPORT_REVIEW,
      sites: state.sites.filter((x) => x.status === "confirmed"),
      coverage,
      ownerOf: brsrOwner,
    })
  }

  const gaps = items.filter((x) => x.status !== "now")
  const cats: GapCategory[] = ["Mandatory BRSR", "BRSR Core", "BRSR Leadership", "ISSB incremental", "Policy and governance", "Implementation"]
  const pris: Priority[] = ["Before listing", "First BRSR year", "After listing"]
  const brsrItems = items.filter((x) => x.framework === "BRSR")
  const issb = CATALOGUE.issb
  return {
    items,
    coverage,
    counts: { total: items.length, now: items.filter((x) => x.status === "now").length, sync: items.filter((x) => x.status === "sync").length, open: items.filter((x) => x.status === "open").length },
    brsr: {
      total: brsrItems.length,
      now: brsrItems.filter((x) => x.status === "now").length,
      sync: brsrItems.filter((x) => x.status === "sync").length,
      open: brsrItems.filter((x) => x.status === "open").length,
      core: brsrItems.filter((x) => x.core).length,
      coreReady: brsrItems.filter((x) => x.core && x.status === "now").length,
      leadership: brsrItems.filter((x) => x.kind === "leadership").length,
    },
    issb: { total: issb.length, covered: issb.filter((x) => x.coverage === "covered").length, partial: issb.filter((x) => x.coverage === "partial").length, not: issb.filter((x) => x.coverage === "not").length },
    byCategory: Object.fromEntries(cats.map((c) => [c, gaps.filter((x) => x.category === c).length])) as Record<GapCategory, number>,
    byPriority: Object.fromEntries(pris.map((p) => [p, gaps.filter((x) => x.priority === p).length])) as Record<Priority, number>,
  }
}
