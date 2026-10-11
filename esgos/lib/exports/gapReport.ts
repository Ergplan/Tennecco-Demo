// Gap analysis results and recommendations: one model behind both the page in
// Gaps and the PowerPoint, so the two always say the same thing. Built from the
// readiness assessment, interviews, monthly collection, plants and the peer.

import { CATALOGUE } from "../readiness/engine"
import type { GapCategory, MilestoneId, Priority, ReadinessItem, Status } from "../readiness/types"
import { FOCUS_LABEL, GUIDE_BY_ID, type Focus } from "../interviews/guides"
import { findings as interviewFindings, type Rating } from "../interviews/plan"
import { EXTRA_METRICS, METRICS, type Metric } from "../collection/model"
import { ROUTES, ROUTE_ORDER, closureInputs, closureRows, collectVia, describeMetrics, type Route } from "../closure"
import { cell, sitesFor } from "../collection/calc"
import { peerTable, type PeerTableRow } from "../peer"
import { fmtDate, type ReportModel } from "./model"
import { CATEGORY_LABEL, OUTCOME_LABEL, OUTCOME_ORDER, type DocCategory, type Outcome } from "../documents/review"

export const PRIORITIES: Priority[] = ["Before listing", "First BRSR year", "After listing"]
export const CATEGORIES: GapCategory[] = ["BRSR Core", "Mandatory BRSR", "Policy and governance", "Implementation", "BRSR Leadership", "ISSB incremental"]
export const SECTIONS = ["A", "B", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"] as const
export const SECTION_TITLES: Record<(typeof SECTIONS)[number], string> = {
  A: "General disclosures",
  B: "Management and process",
  P1: "Ethics and transparency",
  P2: "Sustainable products",
  P3: "Employee well-being",
  P4: "Stakeholders",
  P5: "Human rights",
  P6: "Environment",
  P7: "Public policy",
  P8: "Inclusive growth",
  P9: "Consumer value",
}
export const FOCI: Focus[] = ["governance", "practice", "systems", "availability"]

const LISTED: Record<Priority, string> = { "Before listing": "Before next filing", "First BRSR year": "This reporting year", "After listing": "Later (voluntary)" }
const WHEN_PRE: Record<Priority, string> = { "Before listing": "before listing", "First BRSR year": "in the first BRSR year", "After listing": "after listing" }
const WHEN_LISTED: Record<Priority, string> = { "Before listing": "before the next filing", "First BRSR year": "this reporting year", "After listing": "later, as voluntary disclosures" }

export type Tally = { now: number; sync: number; open: number; total: number }
export const tally = (items: ReadinessItem[]): Tally => ({
  now: items.filter((x) => x.status === "now").length,
  sync: items.filter((x) => x.status === "sync").length,
  open: items.filter((x) => x.status === "open").length,
  total: items.length,
})

const byScore = (a: ReadinessItem, b: ReadinessItem) => b.score - a.score || a.id.localeCompare(b.id, undefined, { numeric: true })
const sectionOf = (x: ReadinessItem) => (x.framework === "BRSR" ? (x.principle ?? x.id.split(".")[0]) : x.framework === "ISSB" ? "ISSB" : "IMP")
const ownerName = (x: ReadinessItem) => x.owner.person ?? x.owner.role

// ------------------------------------------------------------------ themes
export type ThemeId = "governance" | "company" | "environment" | "people" | "conduct" | "procedure" | "valuechain" | "issb"

const ENTRY = new Map(CATALOGUE.brsr.map((e) => [e.id, e]))

const THEME_DEFS: { id: ThemeId; title: string; short: string; recommendation: string; match: (x: ReadinessItem) => boolean }[] = [
  {
    id: "valuechain",
    title: "Value chain",
    short: "value-chain data",
    recommendation: "List partners above 2% of purchases or sales and agree a short BRSR Core questionnaire, once the company's own data is assurance-ready.",
    match: (x) => x.id === "IMP.valuechain" || ENTRY.get(x.id)?.dataType === "value-chain",
  },
  {
    id: "governance",
    title: "Governance and policies",
    short: "governance and policies",
    recommendation: "Adopt Board-approved policies for all nine NGRBC principles, form an ESG committee with terms of reference, and name the director responsible.",
    match: (x) => x.category === "Policy and governance" || (x.framework === "BRSR" && x.id.startsWith("B.")) || (x.framework === "ISSB" && x.pillar === "Governance"),
  },
  {
    id: "environment",
    title: "Energy, emissions, water and waste",
    short: "plant environmental data",
    recommendation: "Meter or bill every plant monthly for electricity, fuels, water and waste; fix the emission factors and replace estimates with readings.",
    match: (x) => x.id === "IMP.metering" || (x.framework === "BRSR" && x.principle === "P6"),
  },
  {
    id: "people",
    title: "People, safety and human rights",
    short: "people and safety data",
    recommendation: "One monthly HR and safety extract per plant from the HRMS and incident register, covering contract workers, wages by gender and POSH.",
    match: (x) => x.framework === "BRSR" && (x.principle === "P3" || x.principle === "P5"),
  },
  {
    id: "company",
    title: "Company disclosures (Section A)",
    short: "Section A disclosures",
    recommendation: "Build the Section A fact base from the statutory registers (entity, products, markets, headcount, CSR), signed off by the company secretary.",
    match: (x) => x.framework === "BRSR" && x.id.startsWith("A."),
  },
  {
    id: "conduct",
    title: "Business conduct, customers and communities",
    short: "business conduct disclosures",
    recommendation: "Give each remaining principle a named owner and a source register, and draft the narrative answers from current practice.",
    match: (x) => x.framework === "BRSR",
  },
  {
    id: "procedure",
    title: "Data procedure and plant implementation",
    short: "the data procedure at plants",
    recommendation: "Run one monthly data procedure at every plant: same templates and deadlines, maker-checker review, evidence filed, completeness reported.",
    match: (x) => x.framework === "Implementation",
  },
  {
    id: "issb",
    title: "ISSB S1/S2 beyond BRSR",
    short: "ISSB investor disclosures",
    recommendation: "Build the investor baseline after the first BRSR: climate scenarios, a transition plan, Scope 3 screening and targets.",
    match: (x) => x.framework === "ISSB",
  },
]

export type GapTheme = {
  id: ThemeId
  n: number
  title: string
  short: string
  tally: Tally
  before: number
  open: ReadinessItem[]
  items: ReadinessItem[]
  finding: string
  recommendation: string
  owners: string[]
  milestone: MilestoneId
}

// ------------------------------------------------------------ BRSR Core
const CORE_NAMES: Record<number, string> = {
  1: "GHG footprint",
  2: "Water footprint",
  3: "Energy footprint",
  4: "Embracing circularity",
  5: "Employee well-being and safety",
  6: "Gender diversity",
  7: "Inclusive development",
  8: "Fairness with customers and suppliers",
  9: "Openness of business",
}
export type CoreAttribute = { n: number; name: string; status: Status; items: ReadinessItem[]; note: string }

// --------------------------------------------------------------- plants
export type AreaId = "energy" | "water" | "waste" | "safety" | "people"
export const AREAS: { id: AreaId; label: string }[] = [
  { id: "energy", label: "Energy and GHG" },
  { id: "water", label: "Water" },
  { id: "waste", label: "Waste" },
  { id: "safety", label: "Safety" },
  { id: "people", label: "People" },
]
const AREA_INDICATORS: Record<AreaId, string[]> = {
  energy: ["P6.E1.elec", "P6.E1.fuel", "P6.E1.intensity", "P6.E7.scope1", "P6.E7.scope2"],
  water: ["P6.E3.withdrawal", "P6.E4"],
  waste: ["P6.E9"],
  safety: ["P3.E11"],
  people: ["A.IV.20", "P3.E1", "P3.E2", "P3.E4", "P3.E6", "P3.E10", "P5.E1", "P5.E2", "P5.E6"],
}
const AREA_METRICS: Record<AreaId, (m: Metric) => boolean> = {
  energy: (m) => m.topic === "Energy",
  water: (m) => m.topic === "Water",
  waste: (m) => m.topic === "Waste",
  safety: (m) => m.id.startsWith("safety."),
  people: (m) => m.id.startsWith("hr."),
}
export type AreaCell = { status: Status; note: string }
export type PlantRow = { id: string; name: string; readings: number | null; energySource: string; areas: Record<AreaId, AreaCell>; interview: "done" | "planned" | "none"; gaps: number }

// ------------------------------------------------------------ interviews
export type InterviewRow = { id: string; title: string; status: "planned" | "done"; date: string; cells: Record<Focus, { rating?: Rating; answered: number; total: number }> }
export type InterviewIssue = { who: string; focus: Focus; rating: Rating; text: string; recommendation: string }

export type SectionId = "summary" | "scope" | "documents" | "readiness" | "heatmap" | "themes" | "priority" | "core" | "plants" | "interviews" | "issb" | "peer" | "recommendations" | "closing" | "standardise" | "roadmap" | "decisions"

// How the gaps close after the analysis: five routes, each looping back to where its evidence lives.
export type ClosingRoute = { id: Route; label: string; loop: string; how: string; closesWhen: string; verifiedBy: string; open: number; before: number; closed: number; examples: string[]; owners: string[] }
export type Closing = {
  open: number
  // ISSB requirements BRSR already covers: they close with the BRSR items they map to.
  follows: number
  routes: ClosingRoute[]
  data: { open: number; monthly: number; add: { metrics: string; why: string; items: string[] }[]; annual: { items: string[]; fields: string[] }; requests: { count: number; owners: [string, number][]; examples: string[] } }
  loop: { title: string; text: string }[]
  cadence: string[]
  progress?: { since: string; readyThen: number; readyNow: number; total: number; closed: number }
}
export type OutlineEntry = { id: SectionId; n: string; label: string; title: string }

export type GapReport = {
  title: string
  // The sections both the page and the deck show, numbered, each with its one-line finding.
  outline: OutlineEntry[]
  generatedAt: string
  clientShort: string
  legalName: string
  fy: string
  date: string
  preparedBy: string
  preIpo: boolean
  priorityLabel: Record<Priority, string>
  when: Record<Priority, string>
  headline: string
  messages: { title: string; body: string; tone: "good" | "warn" | "bad" }[]
  stats: { brsrTotal: number; brsrNow: number; brsrSync: number; brsrOpen: number; coreTotal: number; coreReady: number; issbTotal: number; issbCovered: number; issbPartial: number; issbNot: number; openTotal: number; byPriority: Record<Priority, number> }
  scope: { boundary: string; cards: { label: string; value: string; detail: string }[]; method: { title: string; text: string }[] }
  sections: { id: (typeof SECTIONS)[number]; title: string; tally: Tally; items: ReadinessItem[] }[]
  heatmap: { rows: { category: GapCategory; cells: number[]; total: number }[]; totals: number[]; max: number }
  themes: GapTheme[]
  top: ReadinessItem[]
  beforeListing: ReadinessItem[]
  core: { ready: number; total: number; attributes: CoreAttribute[] }
  issb: { pillars: { name: string; covered: number; partial: number; not: number; items: ReadinessItem[] }[]; beyond: ReadinessItem[] }
  plants: PlantRow[]
  plantsNote: string
  documents: { total: number; reviewed: number; plants: number; byOutcome: Record<Outcome, number>; coverage: { area: string; expected: number; reviewed: number; adequate: number; gaps: number }[]; byCategory: { category: string; total: number; reviewed: number }[]; shortfalls: { title: string; site?: string; outcome: Outcome; notes?: string; recommendation: string; refs: string[] }[] }
  interviews: { planned: number; done: number; answers: number; inPlace: number; partial: number; notInPlace: number; rows: InterviewRow[]; issues: InterviewIssue[] }
  peer?: { name: string; short: string; fy: string; note: string; assurance: string; plants?: number; rows: PeerTableRow[] }
  recommendations: { n: number; theme: ThemeId; title: string; action: string; owner: string; when: string; items: number; before: number }[]
  closing: Closing
  roadmap: { id: MilestoneId; title: string; outcome: string; start: number; end: number; from: string; to: string; items: number; before: number; list: ReadinessItem[] }[]
  // Streamlining across plants and oversight at corporate level.
  standardise: { plants: string[]; corporate: string[] }
  decisions: string[]
  nextSteps: { when: string; text: string }[]
}

const RANK: Status[] = ["open", "sync", "now"]
const worstStatus = (s: Status[]): Status => RANK.find((r) => s.includes(r)) ?? "now"
const RATING_ORDER: Rating[] = ["not-in-place", "partial", "in-place", "na"]
// Lower-case the first letter unless it starts an acronym or a code (P1, GHG, BRSR).
const lower = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]
export const words = (v: number) => WORDS[v] ?? String(v)
export const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)
const possessive = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`)
const shortDate = (d: Date) => d.toLocaleDateString("en-IN", { month: "short", year: "numeric" })

export function buildGapReport(m: ReportModel): GapReport {
  const c = m.client
  const r = m.readiness
  const pre = !!c.preIpo
  const priorityLabel = Object.fromEntries(PRIORITIES.map((p) => [p, pre ? p : LISTED[p]])) as Record<Priority, string>
  const when = pre ? WHEN_PRE : WHEN_LISTED
  const items = r.items
  const open = m.open
  const before = open.filter((x) => x.priority === "Before listing").sort(byScore)
  const brsr = items.filter((x) => x.framework === "BRSR")

  // Themes: each item lands in the first theme that matches.
  const assigned = new Map<ThemeId, ReadinessItem[]>()
  for (const x of items) {
    const t = THEME_DEFS.find((d) => d.match(x))
    if (!t) continue
    assigned.set(t.id, [...(assigned.get(t.id) ?? []), x])
  }
  const ORDER: ThemeId[] = ["governance", "environment", "people", "procedure", "company", "conduct", "valuechain", "issb"]
  const themes: GapTheme[] = ORDER.map((id, i) => {
    const d = THEME_DEFS.find((t) => t.id === id)!
    const all = assigned.get(id) ?? []
    const o = all.filter((x) => x.status !== "now").sort(byScore)
    const t = tally(all)
    const b = o.filter((x) => x.priority === "Before listing").length
    const owners = Object.entries(o.reduce<Record<string, number>>((acc, x) => ((acc[ownerName(x)] = (acc[ownerName(x)] ?? 0) + 1), acc), {}))
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k)
    const lead = o[0]
    const finding = !all.length
      ? "Nothing assessed in this area."
      : !o.length
        ? `All ${plural(all.length, "item")} in place.`
        : `${o.length} of ${all.length} not yet in place${b ? `, ${b} needed ${when["Before listing"]}` : ""}. Biggest gap: ${lower(lead.title)}.`
    const milestone = (o.map((x) => x.milestone).sort()[0] ?? "M5") as MilestoneId
    return { id, n: i + 1, title: d.title, short: d.short, tally: t, before: b, open: o, items: all, finding, recommendation: d.recommendation, owners, milestone }
  })

  // Sections and heatmap
  const sections = SECTIONS.map((id) => {
    const list = brsr.filter((x) => sectionOf(x) === id)
    return { id, title: SECTION_TITLES[id], tally: tally(list), items: list }
  })
  const rows = CATEGORIES.map((category) => {
    const cells = PRIORITIES.map((p) => open.filter((x) => x.category === category && x.priority === p).length)
    return { category, cells, total: cells.reduce((a, b) => a + b, 0) }
  })
  const totals = PRIORITIES.map((p) => open.filter((x) => x.priority === p).length)
  const heatmap = { rows, totals, max: Math.max(1, ...rows.flatMap((x) => x.cells)) }

  // BRSR Core attributes
  const core = brsr.filter((x) => x.core)
  const attributes: CoreAttribute[] = Object.keys(CORE_NAMES).map((k) => {
    const n = Number(k)
    const list = core.filter((x) => Number(ENTRY.get(x.id)?.coreAttribute?.match(/Attribute (\d)/)?.[1]) === n)
    const status = list.length ? worstStatus(list.map((x) => x.status)) : "open"
    const blocking = list.filter((x) => x.status !== "now")
    const note = !list.length ? "Not in the catalogue." : !blocking.length ? "Traceable to source documents." : blocking[0].gap || "Not traceable to source documents yet."
    return { n, name: CORE_NAMES[n], status, items: list, note }
  })

  // ISSB pillars
  const issbItems = items.filter((x) => x.framework === "ISSB")
  const pillarNames = [...new Set(issbItems.map((x) => x.pillar ?? "Other"))]
  const pillars = pillarNames.map((name) => {
    const list = issbItems.filter((x) => x.pillar === name)
    return { name, covered: list.filter((x) => x.coverage === "covered").length, partial: list.filter((x) => x.coverage === "partial").length, not: list.filter((x) => x.coverage === "not").length, items: list.sort(byScore) }
  })
  const beyond = issbItems.filter((x) => x.coverage === "not").sort(byScore)

  // Plants
  const st = m.state
  const closed = m.collection.closed
  const fileEnergy = Object.values(st.energy).some((e) => e.sourceLabel)
  const plants: PlantRow[] = m.plants.map((p) => {
    const e = st.energy[p.id]
    const siteGaps = st.gaps.filter((g) => g.scope.siteId === p.id)
    const areas = Object.fromEntries(
      AREAS.map(({ id }) => {
        const metrics = METRICS.filter((x) => AREA_METRICS[id](x) && sitesFor(x, [p]).length)
        let expected = 0
        let have = 0
        for (const mt of metrics)
          for (const mo of closed) {
            const v = cell(st.collection, p.id, mt.id, mo)
            if (mt.optional && !v) continue
            expected++
            if (v && v.status !== "estimated") have++
          }
        if (expected) {
          const share = have / expected
          return [id, { status: share >= 0.9 ? "now" : share > 0 ? "sync" : "open", note: `${Math.round(share * 100)}% of values collected for ${plural(closed.length, "closed month")}` } satisfies AreaCell]
        }
        const g = siteGaps.filter((x) => x.blocks.some((b) => AREA_INDICATORS[id].includes(b)))
        if (!g.length) return [id, { status: "now", note: "No open gap at this plant" } satisfies AreaCell]
        const auto = g.every((x) => x.resolution === "automatic")
        return [id, { status: auto ? "sync" : "open", note: `${plural(g.length, "open gap")}: ${g[0].title.split(" — ").slice(1).join(" — ") || g[0].title}` } satisfies AreaCell]
      }),
    ) as Record<AreaId, AreaCell>
    const iv = st.interviews.plan.find((x) => x.siteId === p.id)
    return {
      id: p.id,
      name: p.name,
      readings: e ? Math.round(e.completeness * 100) : null,
      energySource: e ? (e.sourceLabel ? "Client file" : "Meters") : "None",
      areas,
      interview: iv ? (iv.status === "done" ? "done" : "planned") : "none",
      gaps: siteGaps.length,
    }
  })
  const plantsNote = closed.length
    ? `Status from the monthly collection: share of required values collected (estimates excluded) over ${plural(closed.length, "closed month")}.`
    : `Status from the data gaps raised at each plant${fileEnergy ? "; energy readings are the share of the client file's months that are readings rather than estimates" : ""}.`

  // Interviews
  const f = interviewFindings(st.interviews)
  const rated = f.filter((x) => x.answer.rating && x.answer.rating !== "na")
  const ivRows: InterviewRow[] = st.interviews.plan.map((iv) => {
    const mine = f.filter((x) => x.interview.id === iv.id)
    const cells = Object.fromEntries(
      FOCI.map((fo) => {
        const qs = mine.filter((x) => x.question.focus === fo)
        const ratings: Rating[] = qs.map((x) => x.answer.rating!).filter((x) => x !== "na")
        const total = GUIDE_BY_ID[iv.guideId].questions.filter((q) => q.focus === fo).length
        return [fo, { rating: RATING_ORDER.find((o) => ratings.includes(o)), answered: qs.length, total }]
      }),
    ) as InterviewRow["cells"]
    return { id: iv.id, title: iv.siteId ? `${iv.title} (plant)` : iv.title, status: iv.status, date: iv.date, cells }
  })
  const issues: InterviewIssue[] = rated
    .filter((x) => x.answer.rating === "not-in-place" || x.answer.rating === "partial")
    .sort((a, b) => RATING_ORDER.indexOf(a.answer.rating!) - RATING_ORDER.indexOf(b.answer.rating!) || FOCI.indexOf(a.question.focus) - FOCI.indexOf(b.question.focus))
    .map((x) => ({
      who: x.interview.siteId ? `${x.interview.title} plant` : x.guide.title,
      focus: x.question.focus,
      rating: x.answer.rating!,
      text: x.answer.note?.trim() && !/example answer/i.test(x.answer.note) ? `${x.question.text} ${x.answer.note.trim()}` : x.question.text,
      recommendation: x.question.recommendation,
    }))
  const interviews = {
    planned: m.interviews.planned,
    done: m.interviews.done,
    answers: rated.length,
    inPlace: rated.filter((x) => x.answer.rating === "in-place").length,
    partial: rated.filter((x) => x.answer.rating === "partial").length,
    notInPlace: rated.filter((x) => x.answer.rating === "not-in-place").length,
    rows: ivRows,
    issues,
  }

  // Peer
  const pr = m.peer
  const peer =
    pr && c.preIpo && pr.lastBrsr
      ? { name: pr.name, short: pr.shortName, fy: pr.lastBrsr.fy, note: c.preIpo.peerNote, assurance: pr.lastBrsr.assurance?.provider ?? "None disclosed", plants: pr.lastBrsr.counts?.plants, rows: peerTable() }
      : undefined

  // Roadmap
  const start = new Date(m.generatedAt)
  const at = (wk: number) => shortDate(new Date(start.getTime() + wk * 7 * 86400000))
  const roadmap = m.milestones.map((ms) => ({ id: ms.id, title: ms.title, outcome: ms.outcome, start: ms.start, end: ms.end, from: at(ms.start), to: at(ms.end), items: ms.items.length, before: ms.items.filter((x) => x.priority === "Before listing").length, list: ms.items }))
  const msById = Object.fromEntries(roadmap.map((x) => [x.id, x]))

  // Recommendations: one per theme with open items, most urgent first.
  const recThemes = themes.filter((t) => t.open.length).sort((a, b) => b.before - a.before || b.open.length - a.open.length)
  const recommendations = recThemes.map((t, i) => {
    const ms = msById[t.milestone]
    return { n: i + 1, theme: t.id, title: t.title, action: t.recommendation, owner: t.owners.slice(0, 2).join(", ") || "ESG lead", when: ms ? `${ms.id} · ${ms.from} – ${ms.to}` : "", items: t.open.length, before: t.before }
  })

  // Messages
  const s = r.brsr
  const leadThemes = themes.filter((t) => t.before).sort((a, b) => b.before - a.before).slice(0, 2)
  const led = leadThemes.length ? `; most are ${leadThemes.map((t) => `${t.short} (${t.before})`).join(" and ")}` : ""
  const headline = pre
    ? `${c.shortName} can answer ${s.now} of ${s.total} BRSR questions today. ${plural(before.length, "item")} must close before listing${led}.`
    : c.lastBrsr
      ? `${c.shortName} has ${s.now + s.sync} of ${s.total} BRSR answers in place or on file from its ${c.lastBrsr.fy} filing. ${plural(before.length, "item")} need work before the next filing${led}.`
      : `${c.shortName} can answer ${s.now} of ${s.total} BRSR questions today, and ${s.sync} more have a source. ${plural(before.length, "item")} need work before the next filing${led}.`
  const gov = themes.find((t) => t.id === "governance")!
  const ef = c.energyFile
  const messages: GapReport["messages"] = [
    {
      title: "Readiness today",
      body: `${s.now} of ${s.total} BRSR questions are in place. ${s.sync} have a source or a past answer but need work, and ${s.open} are open.`,
      tone: s.now / s.total >= 0.6 ? "good" : s.now / s.total >= 0.3 ? "warn" : "bad",
    },
    {
      title: "BRSR Core",
      body: `${s.coreReady} of ${s.core} Core KPIs can be traced to source documents today.${ef ? ` Plant energy is ${Math.round(ef.actualShare * 100)}% readings; the rest are estimates, and fuels are not recorded yet.` : m.collection.setup ? ` Monthly collection has ${Math.round(m.collection.completeness.share * 100)}% of the required values.` : " Monthly collection has not started."}`,
      tone: s.coreReady === s.core ? "good" : s.coreReady / Math.max(1, s.core) >= 0.5 ? "warn" : "bad",
    },
    {
      title: "Governance",
      body: gov.open.length
        ? `${gov.open.length} of ${gov.tally.total} governance and policy items are open. Board-approved policies, the ESG committee and its review cycle are needed ${when["Before listing"]}.`
        : "Policies, the ESG committee and its review cycle are in place.",
      tone: gov.open.length ? (gov.tally.open ? "bad" : "warn") : "good",
    },
    m.interviews.done
      ? {
          title: "Management interviews",
          body: `${m.interviews.done} of ${m.interviews.planned} interviews done. ${plural(interviews.notInPlace, "practice")} not in place and ${interviews.partial} only partly, out of ${interviews.answers} answers.`,
          tone: interviews.notInPlace ? "bad" : interviews.partial ? "warn" : "good",
        }
      : {
          title: "Management interviews",
          body: m.interviews.planned ? `${m.interviews.planned} interviews are planned and none done yet. They will confirm what is practised at each plant.` : "Interviews are not planned yet. They confirm what is practised at each plant, beyond what documents show.",
          tone: "warn",
        },
    {
      title: "International investors (ISSB)",
      body: `BRSR fully covers ${r.issb.covered} of ${r.issb.total} IFRS S1/S2 requirements and ${r.issb.partial} partly. Climate scenarios, a transition plan and targets are new work${pre ? ", mostly after listing" : ""}.`,
      tone: "warn",
    },
  ]

  // Scope
  const col = m.collection
  const scope = {
    boundary: m.boundary,
    cards: [
      { label: "Boundary", value: `${m.plants.length} plants`, detail: `${m.sites.length} sites in total. ${m.boundary}` },
      { label: "Frameworks", value: `${s.total} + ${r.issb.total}`, detail: `Every numbered BRSR question (${s.core} BRSR Core, ${s.leadership} Leadership) and IFRS S1/S2 with SASB Processed Foods, mapped to BRSR.` },
      {
        label: "Evidence reviewed",
        value: col.setup ? `${col.completeness.have.toLocaleString("en-IN")} values` : ef ? "Energy file" : c.lastBrsr ? `${c.lastBrsr.fy} BRSR` : "Public records",
        detail: [col.setup ? `${col.completeness.have.toLocaleString("en-IN")} monthly values from ${plural(col.closed.length, "closed month")}` : "", ef ? `client energy file ${ef.file}` : "", c.lastBrsr ? `filed BRSR ${c.lastBrsr.fy}` : "public records", `${st.gaps.length} data gaps checked`].filter(Boolean).join("; ") + ".",
      },
      { label: "Interviews", value: `${m.interviews.done} of ${m.interviews.planned || 0}`, detail: m.interviews.planned ? `${interviews.answers} answers recorded across functions and plants.` : "Not planned yet." },
    ],
    method: [
      { title: "Assess", text: "Every question checked against the data, documents and interviews: in place, needs work or open." },
      { title: "Classify", text: "Each gap gets a category: BRSR Core, mandatory, policy and governance, implementation, leadership or ISSB." },
      { title: "Rank", text: "Regulatory weight × 3 + investor relevance × 2 + IPO impact × 3, minus 4 if it can wait." },
      { title: "Plan", text: "Priority, owner, effort and dependencies place each gap on one of five milestones." },
    ],
  }

  const decisions = [
    "Approve the roadmap, its five milestones and the owners named in it.",
    pre ? "Take the responsible business policies for all nine principles to the Board, and constitute the ESG committee." : "Confirm the Board's review of the responsible business policies and the ESG committee's terms of reference.",
    "Mandate one monthly data procedure for every plant, with named owners and internal audit review.",
    "Approve the budget for plant metering and for an independent BRSR Core assessment or assurance provider.",
    ...(pre ? ["Confirm the reporting boundary for the first BRSR (standalone or consolidated) against the offer document."] : []),
  ]
  const closedN = col.closed.length
  const standardise = {
    plants: [
      `One set of monthly templates, deadlines and named data owners at all ${m.plants.length} plants, with the plant head submitting and the corporate function approving.`,
      `Meters or bills for electricity (kWh and kVAh), fuels by quantity, water by source and ETP discharge at every plant${ef ? `, replacing the estimates in ${ef.file}` : ""}.`,
      "One EHS procedure set, incident register and waste register format, so plant figures add up without rework.",
      "Contract labour, wage, grievance and POSH records kept the same way at each plant.",
      "The same document checklist and interview guide at every plant, with findings closed on one tracker.",
    ],
    corporate: [
      "A Board-level ESG committee reviews progress quarterly; the director responsible signs off the BRSR.",
      "The ESG lead consolidates the plants each month and reports completeness and data checks to the committee.",
      "Functional owners (HR, EHS, finance, procurement) own their metrics across all plants, not plant by plant.",
      "Internal audit tests the data procedure once a year before the assessment or assurance provider does.",
      "One evidence vault for policies, consents, bills and registers, reviewed against the checklist each year.",
    ],
  }
  const est = col.setup ? col.completeness.est : 0
  const ivLeft = m.interviews.planned - m.interviews.done
  const nextSteps = [
    { when: "Weeks 1–4", text: pre ? "Board approves the policies and the ESG committee; data owners named at every plant." : "Policies and the committee reviewed; data owners confirmed at every plant." },
    closedN >= 3
      ? { when: "Weeks 1–8", text: `Keep the monthly cycle running (${plural(closedN, "cycle")} closed) and replace ${est ? `${est.toLocaleString("en-IN")} estimated values` : "estimates"} with bills and meter logs.` }
      : { when: "Weeks 1–12", text: `${closedN ? `${plural(closedN, "monthly cycle")} closed; close ${3 - closedN} more` : "Issue the collection templates and close three monthly cycles"}, with bills replacing estimates.` },
    { when: "Weeks 4–12", text: m.interviews.planned ? (ivLeft ? `Hold the remaining ${plural(ivLeft, "interview")}; close or schedule each finding.` : "Close or schedule every interview finding.") : "Plan and hold the management interviews at corporate and every plant." },
    { when: "Weeks 8–14", text: "Run a BRSR Core pre-assessment on energy, emissions, water and safety with the chosen provider." },
    { when: "Week 14", text: "BRSR test report drafted and reviewed with each data owner." },
  ]

  // Desktop document review
  const dr = m.docs
  const documents: GapReport["documents"] = {
    total: dr.rows.length,
    reviewed: dr.reviewed.length,
    plants: m.plants.length,
    byOutcome: dr.byOutcome,
    coverage: dr.coverage,
    byCategory: (Object.keys(CATEGORY_LABEL) as DocCategory[]).map((c) => ({ category: CATEGORY_LABEL[c], total: dr.rows.filter((r) => r.doc.category === c).length, reviewed: dr.reviewed.filter((r) => r.doc.category === c).length })),
    shortfalls: dr.reviewed
      .filter((r) => r.review!.outcome !== "adequate")
      .sort((a, b) => OUTCOME_ORDER.indexOf(a.review!.outcome!) - OUTCOME_ORDER.indexOf(b.review!.outcome!))
      .map((r) => ({ title: r.doc.title, site: r.site?.name, outcome: r.review!.outcome!, notes: r.review!.notes, recommendation: r.doc.recommendation, refs: r.doc.refs })),
  }
  const short = dr.reviewed.length - dr.byOutcome.adequate

  // Closing the gaps: every open item's route, and what loops back into collection.
  const ms = m.state
  const cin = closureInputs({ collection: ms.collection, closure: ms.closure, drafts: ms.drafts, docReview: ms.docReview, reportReview: ms.reportReview, sites: ms.sites }, r.coverage)
  const crow = closureRows(items, cin, ms.closure?.baseline?.at ?? ms.plan?.issuedAt ?? m.generatedAt)
  const openRows = crow.filter((x) => x.status !== "closed")
  const routesOut: ClosingRoute[] = ROUTE_ORDER.map((id) => {
    const list = openRows.filter((x) => x.route === id).sort((a, b) => b.item.score - a.item.score)
    const owners = Object.entries(list.reduce<Record<string, number>>((acc, x) => ((acc[x.item.owner.role] = (acc[x.item.owner.role] ?? 0) + 1), acc), {}))
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k)
    return { id, ...ROUTES[id], open: list.length, before: list.filter((x) => x.item.priority === "Before listing").length, closed: crow.filter((x) => x.route === id && x.status === "closed").length, examples: list.slice(0, 3).map((x) => x.item.title), owners: owners.slice(0, 3) }
  })
  const collectOpen = openRows.filter((x) => x.route === "collect")
  const addGroups = new Map<string, { ms: Set<string>; items: Set<string> }>()
  for (const x of collectOpen) {
    for (const mt of collectVia(x.item, ms.collection).missing) {
      const g = addGroups.get(mt.extra!.gap) ?? { ms: new Set<string>(), items: new Set<string>() }
      g.ms.add(mt.id)
      g.items.add(x.item.id)
      addGroups.set(mt.extra!.gap, g)
    }
  }
  const annualRows = collectOpen.filter((x) => x.via === "annual")
  const requestRows = collectOpen.filter((x) => x.via === "request").sort((a, b) => b.item.score - a.item.score)
  const closing: Closing = {
    open: openRows.length,
    follows: open.filter((x) => x.framework === "ISSB" && x.coverage === "covered").length,
    routes: routesOut,
    data: {
      open: collectOpen.length,
      monthly: collectOpen.filter((x) => x.via === "monthly").length,
      add: [...addGroups.entries()].map(([why, g]) => ({ metrics: describeMetrics(EXTRA_METRICS.filter((mt) => g.ms.has(mt.id))), why, items: [...g.items] })),
      annual: { items: annualRows.map((x) => x.item.id), fields: [...new Set(annualRows.flatMap((x) => collectVia(x.item, ms.collection).annual.filter((f) => !ms.collection.annual?.[f.id]).map((f) => f.label)))] },
      requests: { count: requestRows.length, owners: Object.entries(requestRows.reduce<Record<string, number>>((acc, x) => ((acc[x.item.owner.role] = (acc[x.item.owner.role] ?? 0) + 1), acc), {})).sort((a, b) => b[1] - a[1]) as [string, number][], examples: requestRows.slice(0, 4).map((x) => x.item.title) },
    },
    loop: [
      { title: "Gap analysis", text: "Every gap has an owner, a priority and a due date from its milestone." },
      { title: "Close the gap", text: "One of five routes: data, documents, a Board decision, a drafted disclosure or the partner programme." },
      { title: "Evidence comes in", text: "Monthly collection, the document review, Board minutes, drafted answers and partner returns." },
      { title: "Re-assessed", text: "Each closed month and each review re-runs the readiness assessment and updates the answers." },
      { title: "BRSR test report", text: "Owners confirm their answers in review; whatever is still open goes back to step 2." },
    ],
    cadence: [
      "Monthly: the ESG lead takes the closing tracker to the ESG committee: closed, overdue and awaiting verification.",
      "After every closed month and document review: the assessment re-runs and the gap list updates itself.",
      "Quarterly: the Board sees BRSR questions ready at the gap analysis and now.",
      `Before the test report: every item needed ${when["Before listing"]} is closed or has an agreed date and owner.`,
    ],
    progress: ms.closure?.baseline
      ? { since: fmtDate(ms.closure.baseline.at), readyThen: brsr.filter((x) => ms.closure!.baseline!.statuses[x.id] === "now").length, readyNow: brsr.filter((x) => x.status === "now").length, total: brsr.length, closed: crow.filter((x) => x.status === "closed").length }
      : undefined,
  }

  // Section titles: the finding in one line, shared by the page and the deck.
  const B = when["Before listing"]
  const beforeN = before.length
  const leadT = themes.filter((t) => t.before).sort((a, b) => b.before - a.before)
  const catName = (c: string) => (c === "BRSR Core" || c === "ISSB incremental" ? c : c === "Mandatory BRSR" ? "mandatory BRSR" : c.toLowerCase())
  const leadC = [...rows].sort((a, b) => b.cells[0] - a.cells[0]).filter((x) => x.cells[0])
  const complete = plants.filter((p) => AREAS.every((a) => p.areas[a.id].status === "now")).length
  const withReadings = plants.filter((p) => p.readings !== null)
  const avg = withReadings.length ? Math.round(withReadings.reduce((a, p) => a + (p.readings ?? 0), 0) / withReadings.length) : null
  const beforeMs = roadmap.filter((x) => x.before).map((x) => x.id)
  const months = Math.round((Math.max(...roadmap.map((x) => x.end)) * 7) / 30.4)
  const recN = Math.min(8, recommendations.length)
  const entries: [SectionId, string, string, boolean][] = [
    ["summary", "Executive summary", `${beforeN} items must close ${B}${leadT.length ? `, led by ${leadT[0].short}${leadT[1] ? ` and ${leadT[1].short}` : ""}` : ""}`, true],
    ["scope", "Scope and approach", "Every BRSR question and ISSB requirement, checked against data, documents and interviews", true],
    ["documents", "Document review", dr.reviewed.length ? `${dr.reviewed.length} of ${dr.rows.length} documents reviewed; ${short} fall short of what BRSR needs` : `${dr.rows.length} documents to review across corporate functions and ${m.plants.length} plants; none reviewed yet`, true],
    ["readiness", "Readiness at a glance", `${s.now} of ${s.total} BRSR questions are in place; ${s.sync} more have a source but need work`, true],
    ["heatmap", "Where the gaps are", `${beforeN} of ${open.length} gaps must close ${B}${leadC.length >= 2 ? `; most are ${catName(leadC[0].category)} (${leadC[0].cells[0]}) or ${catName(leadC[1].category)} (${leadC[1].cells[0]})` : ""}`, true],
    ["themes", "Gaps by theme", leadT.length >= 2 ? `${cap(words(themes.length))} themes; ${leadT[0].short} and ${leadT[1].short} need action first` : `The gaps fall into ${words(themes.length)} themes`, true],
    ["priority", "Priority gaps", `The ${words(Math.min(6, beforeN))} highest-ranked gaps to close ${B}`, beforeN > 0],
    ["core", "BRSR Core", s.coreReady === 0 ? `None of the ${s.core} BRSR Core KPIs can be traced to source documents yet` : `${s.coreReady} of ${s.core} BRSR Core KPIs can be traced to source documents`, true],
    ["plants", "Plants", `${complete === 0 ? "No plant has" : `${complete} of ${plants.length} plants have`} every data area in place${avg !== null ? `; energy readings average ${avg}% of months` : ""}`, plants.length > 0],
    ["interviews", "Management interviews", interviews.done ? `${interviews.done} of ${interviews.planned} interviews held: ${interviews.notInPlace} practices not in place, ${interviews.partial} only partly` : `${interviews.planned} interviews planned across functions and plants; none held yet`, interviews.planned > 0],
    ["issb", "ISSB S1/S2", `BRSR fully covers ${r.issb.covered} of ${r.issb.total} ISSB requirements; ${r.issb.not} need new work beyond it`, true],
    ["peer", "Peer benchmark", peer ? `${possessive(peer.name)} filed BRSR is the benchmark investors will compare against` : "", !!peer],
    ["recommendations", "Recommendations", `${cap(words(recN))} recommendations, ordered by what must close ${B}`, recN > 0],
    ["closing", "How the gaps close", closing.data.open ? `${closing.data.open} of the ${open.length} gaps close through data that loops back into collection; the rest through documents and decisions` : `Each of the ${open.length} gaps closes through documents, decisions or drafted answers, and is re-assessed`, closing.open > 0],
    ["standardise", "Plants and corporate oversight", `Standardise the ${m.plants.length} plants on one way of working, overseen from corporate`, m.plants.length > 0],
    ["roadmap", "Roadmap", `Five milestones over ${months} months; ${beforeMs.length ? `${beforeMs[0]} to ${beforeMs[beforeMs.length - 1]} close the ${beforeN} gaps needed ${B}` : "governance first, then data, then assurance"}`, true],
    ["decisions", "Decisions and next steps", "What we need from management, and the next 90 days", true],
  ]
  const outline: OutlineEntry[] = entries.filter((e) => e[3]).map(([id, label, title], i) => ({ id, n: String(i + 1).padStart(2, "0"), label, title }))

  return {
    title: "BRSR and ISSB readiness: gap analysis",
    outline,
    generatedAt: m.generatedAt,
    clientShort: c.shortName,
    legalName: c.legalName,
    fy: m.fy,
    date: fmtDate(m.generatedAt),
    preparedBy: m.preparedBy,
    preIpo: pre,
    priorityLabel,
    when,
    headline,
    messages,
    stats: {
      brsrTotal: s.total,
      brsrNow: s.now,
      brsrSync: s.sync,
      brsrOpen: s.open,
      coreTotal: s.core,
      coreReady: s.coreReady,
      issbTotal: r.issb.total,
      issbCovered: r.issb.covered,
      issbPartial: r.issb.partial,
      issbNot: r.issb.not,
      openTotal: open.length,
      byPriority: Object.fromEntries(PRIORITIES.map((p, i) => [p, totals[i]])) as Record<Priority, number>,
    },
    scope,
    sections,
    heatmap,
    themes,
    top: before.slice(0, 6),
    beforeListing: before,
    core: { ready: s.coreReady, total: s.core, attributes },
    issb: { pillars, beyond },
    plants,
    plantsNote,
    documents,
    standardise,
    interviews,
    peer,
    recommendations,
    closing,
    roadmap,
    decisions,
    nextSteps,
  }
}

export const STATUS_TEXT: Record<Status, string> = { now: "In place", sync: "Needs work", open: "Open" }
export const RATING_TEXT: Record<Rating, string> = { "in-place": "In place", partial: "Partly", "not-in-place": "Not in place", na: "N/A" }
export { FOCUS_LABEL, OUTCOME_LABEL }

export function outlineEntry(g: GapReport, id: SectionId): OutlineEntry {
  return g.outline.find((x) => x.id === id) ?? { id, n: "", label: "", title: "" }
}
