// Closing the gaps: what happens after the gap analysis. Every open item closes
// one of five ways, and each way loops back into the part of esgOS that holds
// the evidence:
//
//   collect   → monthly collection (a new metric if the templates lack it), the
//               company's annual figures, or a data request to the owner
//   document  → the desktop document review (the policy or procedure is adopted,
//               then reviewed as adequate)
//   decide    → the ESG committee and the Board (minuted decision on file)
//   draft     → the BRSR test report (answer drafted, confirmed by its owner in review)
//   partners  → the value-chain programme (partner data received)
//
// Data closes items by itself: a data gap cannot be ticked off, it closes when
// the months are collected and approved. Decisions and programmes close when the
// ESG lead verifies the evidence. Either way the item is re-assessed in the
// readiness engine and its BRSR answer updates.

import raw from "./readiness/catalogue.json"
import type { BrsrEntry, ReadinessItem, Status } from "./readiness/types"
import { EXTRA_METRICS, METRICS, activeMetrics, type CollectionState, type Metric, type MetricId } from "./collection/model"
import { ANNUAL_BY_ID, ANNUAL_REQUIRED, annualStatus, type AnnualField } from "./collection/annual"
import { DOC_CHECKLIST, reviewKey, type DocReviewState, type ReviewDoc } from "./documents/review"
import { sessionOwner, type ReportReviewState } from "./reportReview"
import type { Site } from "./types"

export type Route = "collect" | "document" | "decide" | "draft" | "partners"
export type CollectVia = "monthly" | "extension" | "annual" | "request"

export const ROUTE_ORDER: Route[] = ["collect", "document", "decide", "draft", "partners"]

export const ROUTES: Record<Route, { label: string; loop: string; how: string; closesWhen: string; verifiedBy: string }> = {
  collect: {
    label: "Collect the data",
    loop: "monthly collection",
    how: "The metric goes into the monthly templates (added if they lack it), the company's annual figures, or a data request to its owner.",
    closesWhen: "Values are collected and approved for every plant and month, or the owner's data is received and confirmed.",
    verifiedBy: "The reviewer approves each value; nobody can tick a data gap off.",
  },
  document: {
    label: "Adopt the document",
    loop: "the document review",
    how: "The policy or procedure is drafted or fixed, approved, filed and reviewed again in the desktop document review.",
    closesWhen: "The document is reviewed as adequate.",
    verifiedBy: "The reviewer, in Gaps → Documents.",
  },
  decide: {
    label: "Board decision",
    loop: "the ESG committee and Board",
    how: "A proposal goes to the ESG committee and the Board; the decision is minuted and the minutes are filed.",
    closesWhen: "The minutes are on file and the ESG lead has verified them.",
    verifiedBy: "The ESG lead, against the minutes.",
  },
  draft: {
    label: "Draft the disclosure",
    loop: "the BRSR test report",
    how: "The answer is drafted in the test report from current practice and the documents it relies on.",
    closesWhen: "The question's owner confirms the answer in the test report review.",
    verifiedBy: "The data owner, at sign-off of their review session.",
  },
  partners: {
    label: "Partner programme",
    loop: "the value chain",
    how: "Partners above 2% of purchases or sales are listed, sent a short BRSR Core questionnaire, and their answers checked.",
    closesWhen: "Partner data is received, checked and verified by the ESG lead.",
    verifiedBy: "The ESG lead, against the partner returns.",
  },
}

export type Step = { id: string; label: string; auto: boolean; done: boolean; at?: string }

export type ClosureEntry = { steps: Record<string, string>; evidence?: string; verifiedAt?: string; verifiedBy?: string; at?: string; by?: string }
export type DataRequest = { sentAt?: string; due?: string; taskId?: string; receivedAt?: string; file?: string; by?: string }
export type Draft = { text: string; by: string; at: string }
export type Baseline = { at: string; statuses: Record<string, Status> }

export type ClosureState = { baseline?: Baseline; entries: Record<string, ClosureEntry>; requests: Record<string, DataRequest> }
export const EMPTY_CLOSURE: ClosureState = { entries: {}, requests: {} }

const BRSR = (raw as unknown as { brsr: BrsrEntry[] }).brsr
const DATA_TYPE: Record<string, string> = Object.fromEntries(BRSR.map((e) => [e.id, e.dataType]))
export const brsrOwner = (id: string) => BRSR.find((e) => e.id === id)?.owner

export function routeFor(item: Pick<ReadinessItem, "id" | "framework" | "pillar">): Route {
  if (ANNUAL_REQUIRED[item.id]) return "collect"
  if (item.framework === "Implementation") return item.id === "IMP.valuechain" ? "partners" : item.id === "IMP.metering" || item.id === "IMP.collection" ? "collect" : "document"
  if (item.framework === "ISSB") return item.pillar === "Risk management" ? "document" : item.pillar === "Metrics and targets" || item.pillar === "Industry-based metrics" ? "collect" : "decide"
  switch (DATA_TYPE[item.id]) {
    case "quantitative":
      return "collect"
    case "policy":
      return "document"
    case "governance":
      return "decide"
    case "value-chain":
      return "partners"
    default:
      return "draft"
  }
}

export const feeds = (m: Metric, id: string) => m.brsr.includes(id) || (id === "IMP.metering" && m.topic === "Energy" && m.id.startsWith("elec")) || (id === "IMP.collection" && !m.optional && !m.extra)

export function collectVia(item: Pick<ReadinessItem, "id" | "framework">, col: Pick<CollectionState, "added">): { via: CollectVia; metrics: Metric[]; missing: Metric[]; annual: AnnualField[] } {
  const active = activeMetrics(col)
  const metrics = active.filter((m) => feeds(m, item.id))
  const missing = EXTRA_METRICS.filter((m) => m.brsr.includes(item.id) && !(col.added ?? []).includes(m.id))
  const annual = (ANNUAL_REQUIRED[item.id] ?? []).map((id) => ANNUAL_BY_ID[id])
  if (annual.length) return { via: "annual", metrics, missing, annual }
  if (missing.length && !metrics.length) return { via: "extension", metrics, missing, annual }
  if (metrics.length) return { via: missing.length ? "extension" : "monthly", metrics, missing, annual }
  return { via: "request", metrics, missing, annual }
}

export const docsFor = (id: string): ReviewDoc[] => DOC_CHECKLIST.filter((d) => d.refs.includes(id))

// "Refrigerant top-up, R-410A" and "Refrigerant top-up, R-32" read as "refrigerant top-ups (R-410A, R-32)".
export function describeMetrics(ms: Metric[]) {
  const lc = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
  const groups = new Map<string, string[]>()
  for (const m of ms) {
    const [head, tail] = m.label.split(", ")
    const same = ms.filter((x) => x.label.startsWith(`${head}, `)).length > 1
    const key = same ? head : m.label
    groups.set(key, [...(groups.get(key) ?? []), ...(same && tail ? [tail] : [])])
  }
  const parts = [...groups.entries()].map(([k, tails]) => (tails.length ? `${lc(k)}s (${tails.join(", ")})` : lc(k)))
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0] ?? ""
}

const MANUAL_STEPS: Record<"decide" | "partners" | "document", { id: string; label: string }[]> = {
  decide: [
    { id: "proposal", label: "Proposal drafted" },
    { id: "committee", label: "Discussed at the ESG committee" },
    { id: "board", label: "Approved by the Board" },
    { id: "minutes", label: "Minutes on file" },
  ],
  partners: [
    { id: "list", label: "Partners above 2% of purchases or sales listed" },
    { id: "questionnaire", label: "Questionnaire agreed" },
    { id: "sent", label: "Sent to the top partners" },
    { id: "received", label: "Responses received and checked" },
  ],
  document: [
    { id: "drafted", label: "Drafted or updated" },
    { id: "approved", label: "Approved (Board for policies)" },
  ],
}

// Whether the owner confirmed a drafted answer: their review session was signed off after the draft.
export function draftConfirmed(qid: string, ownerRole: string | undefined, draft: Draft | undefined, review: ReportReviewState | undefined) {
  if (!draft || !ownerRole) return false
  const s = review?.sessions[sessionOwner(ownerRole)]
  return !!s?.signedOffAt && s.signedOffAt >= draft.at
}

export type ClosureInputs = {
  collection: CollectionState
  closure: ClosureState
  drafts: Record<string, Draft>
  docReview: DocReviewState
  reportReview: ReportReviewState
  sites: Site[]
  // Year coverage by BRSR question from the monthly collection (share of the closed months, approved for the year).
  coverage?: Record<string, { closedShare: number; yearApproved: boolean }>
  // The catalogue owner role of each BRSR question (for review confirmation).
  ownerOf?: (id: string) => string | undefined
}

// The steps for one item, with what is already done, from the data where it can be read.
export function stepsFor(item: ReadinessItem, route: Route, s: ClosureInputs): Step[] {
  const entry = s.closure.entries[item.id]
  const manual = (list: { id: string; label: string }[]) => list.map((x) => ({ id: x.id, label: x.label, auto: false, done: !!entry?.steps[x.id], at: entry?.steps[x.id] }))
  if (route === "collect") {
    const c = collectVia(item, s.collection)
    if (c.via === "annual") {
      const vals = c.annual.map((f) => s.collection.annual?.[f.id])
      return [
        { id: "entered", label: "Entered from the financial statements", auto: true, done: vals.every(Boolean) },
        { id: "approved", label: "Approved by the reviewer", auto: true, done: annualStatus(s.collection.annual, item.id) === "approved" },
      ]
    }
    if (c.via === "request") {
      const r = s.closure.requests[item.id]
      const draft = s.drafts[item.id]
      const steps: Step[] = [
        // Recorded by sending the request and recording the file, not ticked by hand.
        { id: "sent", label: "Data request sent to the owner", auto: true, done: !!r?.sentAt, at: r?.sentAt },
        { id: "received", label: "Data received", auto: true, done: !!r?.receivedAt, at: r?.receivedAt },
        { id: "drafted", label: "Answer drafted in the test report", auto: true, done: !!draft?.text.trim(), at: draft?.at },
      ]
      if (item.framework === "BRSR") steps.push({ id: "confirmed", label: "Confirmed by the owner in review", auto: true, done: draftConfirmed(item.id, s.ownerOf?.(item.id), draft, s.reportReview) })
      return steps
    }
    if (item.id === "IMP.collection") {
      const closed = Object.values(s.collection.cycles).filter((x) => x.closedAt).length
      return [
        { id: "templates", label: "Templates issued to named owners", auto: true, done: !!s.collection.setupAt, at: s.collection.setupAt },
        { id: "closed", label: `Three monthly cycles closed (${Math.min(closed, 3)} of 3)`, auto: true, done: closed >= 3 },
      ]
    }
    const cov = s.coverage?.[item.id]
    return [
      { id: "templates", label: c.missing.length ? `Add to the monthly templates: ${describeMetrics(c.missing)}` : "In the monthly templates", auto: true, done: !c.missing.length },
      { id: "collected", label: item.id === "IMP.metering" ? "Bills or readings for every plant, closed months" : "Collected for the closed months", auto: true, done: !!cov && cov.closedShare >= 0.9 },
      { id: "year", label: "Approved for the whole year", auto: true, done: !!cov?.yearApproved },
    ]
  }
  if (route === "document") {
    const docs = docsFor(item.id)
    const rows = docs.flatMap((d) => (d.perPlant ? s.sites.filter((x) => x.type === "factory").map((p) => s.docReview.reviews[reviewKey(d.id, p.id)]) : [s.docReview.reviews[reviewKey(d.id)]]))
    const reviewed = rows.length > 0 && rows.every((r) => r?.outcome === "adequate")
    return [...manual(MANUAL_STEPS.document), docs.length ? { id: "reviewed", label: "Reviewed as adequate", auto: true, done: reviewed } : { id: "verified", label: "Verified by the ESG lead", auto: false, done: !!entry?.verifiedAt, at: entry?.verifiedAt }]
  }
  if (route === "draft") {
    const draft = s.drafts[item.id]
    return [
      { id: "drafted", label: "Answer drafted in the test report", auto: true, done: !!draft?.text.trim(), at: draft?.at },
      { id: "confirmed", label: "Confirmed by the owner in review", auto: true, done: draftConfirmed(item.id, s.ownerOf?.(item.id), draft, s.reportReview) },
    ]
  }
  return manual(MANUAL_STEPS[route])
}

// Routes the ESG lead verifies by hand, once the evidence is named.
export const needsVerification = (route: Route, item: ReadinessItem, s: Pick<ClosureInputs, "collection">) =>
  route === "decide" || route === "partners" || (route === "document" && !docsFor(item.id).length) || (route === "collect" && item.framework === "ISSB" && collectVia(item, s.collection).via === "request")

export type ClosureStatus = "not started" | "in progress" | "awaiting verification" | "closed"

export type ClosureRow = {
  item: ReadinessItem
  route: Route
  via?: CollectVia
  steps: Step[]
  status: ClosureStatus
  next: string
  due: string
  overdue: boolean
  wasOpen: boolean
}

function nextAction(item: ReadinessItem, route: Route, steps: Step[], s: ClosureInputs): string {
  const todo = steps.find((x) => !x.done)
  if (!todo) return needsVerification(route, item, s) && !s.closure.entries[item.id]?.verifiedAt ? "Verify the evidence and close" : "Re-assessed; nothing left to do"
  if (route === "collect") {
    const c = collectVia(item, s.collection)
    if (todo.id === "templates") return `Add ${describeMetrics(c.missing)} to monthly collection`
    if (todo.id === "collected") return `Collect ${describeMetrics(c.metrics.slice(0, 3))} every month`
    if (todo.id === "year") return "Close and approve the remaining months"
    if (todo.id === "entered") return `Enter ${c.annual.filter((f) => !s.collection.annual?.[f.id]).map((f) => f.label.toLowerCase()).join(", ")} from the financial statements`
    if (todo.id === "approved") return "Approve the company data"
  }
  if (todo.id === "sent") return `Send the data request to the ${item.owner.role.toLowerCase()}`
  if (todo.id === "received") return "Record the data when it arrives"
  if (todo.id === "drafted") return "Draft the answer in the test report"
  if (todo.id === "confirmed") return `Confirm it with the ${item.owner.role.toLowerCase()} in the test report review`
  if (todo.id === "reviewed") return "Review the document again in Gaps → Documents"
  return todo.label
}

const WEEK = 7 * 86400000

export function closureRows(items: ReadinessItem[], s: ClosureInputs, startAt: string, today = new Date().toISOString()): ClosureRow[] {
  const baseline = s.closure.baseline
  const MS_END: Record<string, number> = { M1: 10, M2: 20, M3: 30, M4: 40, M5: 78 }
  return items
    .filter((x) => !(x.framework === "ISSB" && x.coverage === "covered"))
    // Open now, or open at the gap analysis and closed since (shown as progress).
    .filter((x) => x.status !== "now" || (!!baseline && baseline.statuses[x.id] !== undefined && baseline.statuses[x.id] !== "now"))
    .map((item) => {
      const route = routeFor(item)
      const steps = stepsFor(item, route, s)
      const done = steps.filter((x) => x.done).length
      const verified = !!s.closure.entries[item.id]?.verifiedAt
      const closed = item.status === "now"
      const status: ClosureStatus = closed ? "closed" : done === steps.length && needsVerification(route, item, s) && !verified ? "awaiting verification" : done > 0 || s.closure.entries[item.id]?.at ? "in progress" : "not started"
      const due = new Date(new Date(startAt).getTime() + (MS_END[item.milestone] ?? 40) * WEEK).toISOString().slice(0, 10)
      return {
        item,
        route,
        via: route === "collect" ? collectVia(item, s.collection).via : undefined,
        steps,
        status,
        next: closed ? "Closed" : nextAction(item, route, steps, s),
        due,
        overdue: !closed && due < today.slice(0, 10),
        wasOpen: baseline ? baseline.statuses[item.id] !== "now" : item.status !== "now",
      }
    })
}

export function closureSummary(rows: ClosureRow[], items: ReadinessItem[], baseline?: Baseline) {
  const brsr = items.filter((x) => x.framework === "BRSR")
  const readyNow = brsr.filter((x) => x.status === "now").length
  const readyThen = baseline ? brsr.filter((x) => baseline.statuses[x.id] === "now").length : readyNow
  const byRoute = Object.fromEntries(
    ROUTE_ORDER.map((r) => {
      const list = rows.filter((x) => x.route === r)
      return [r, { total: list.length, closed: list.filter((x) => x.status === "closed").length, inProgress: list.filter((x) => x.status === "in progress" || x.status === "awaiting verification").length }]
    }),
  ) as Record<Route, { total: number; closed: number; inProgress: number }>
  // Items that were ready at the gap analysis and are not now (e.g. a metric found missing).
  const reopened = baseline ? items.filter((x) => baseline.statuses[x.id] === "now" && x.status !== "now") : []
  return {
    total: rows.length,
    closed: rows.filter((x) => x.status === "closed").length,
    inProgress: rows.filter((x) => x.status === "in progress").length,
    awaiting: rows.filter((x) => x.status === "awaiting verification").length,
    notStarted: rows.filter((x) => x.status === "not started").length,
    overdue: rows.filter((x) => x.overdue).length,
    byRoute,
    brsr: { total: brsr.length, readyThen, readyNow },
    reopened,
  }
}

// Applied by the readiness engine after collection, documents and interviews:
// the evidence from closing work moves an item's status.
export function applyClosure(items: ReadinessItem[], s: ClosureInputs) {
  for (const item of items) {
    if (item.framework === "ISSB" && item.coverage === "covered") continue
    const route = routeFor(item)
    const entry = s.closure.entries[item.id]
    if (route === "collect") {
      const c = collectVia(item, s.collection)
      // A metric the templates lack keeps the item from being complete.
      if (c.missing.length && c.via !== "annual") {
        if (item.status === "now") item.status = "sync"
        item.gap = [...new Set(c.missing.map((m) => m.extra!.gap))].join(" ")
        item.recommendation = `Add ${describeMetrics(c.missing)} to the monthly templates for every plant, with the evidence named, and collect from the next cycle.`
      }
      if (c.via === "annual") {
        const st = annualStatus(s.collection.annual, item.id)
        if (st === "approved") {
          item.status = "now"
          item.gap = ""
          item.how = `${item.how}; company data approved`
        } else if (st === "submitted") {
          if (item.status === "open") item.status = "sync"
          item.gap = "Company data entered; the reviewer has not approved it yet."
          item.how = `${item.how}; company data entered`
        } else {
          const missing = c.annual.filter((f) => !s.collection.annual?.[f.id]).map((f) => f.label.toLowerCase())
          if (item.status !== "now") item.gap = `Needs ${missing.join(", ")} from the audited financial statements.`
        }
      }
      if (c.via === "request") applyDraft(item, s, true)
    }
    if (route === "draft") applyDraft(item, s, false)
    if (needsVerification(route, item, s) && entry?.verifiedAt) {
      item.status = "now"
      item.gap = ""
      item.how = `${item.how}; closed: verified by ${entry.verifiedBy} on ${entry.verifiedAt.slice(0, 10)}${entry.evidence ? ` (${entry.evidence})` : ""}`
    } else if (route === "decide" || route === "partners") {
      const steps = stepsFor(item, route, s)
      const done = steps.filter((x) => x.done)
      if (done.length) {
        if (item.status === "open" && done.length === steps.length) item.status = "sync"
        item.how = `${item.how}; closing: ${done[done.length - 1].label.toLowerCase()}`
        if (item.status !== "now") item.gap = done.length === steps.length ? "Evidence on file; the ESG lead has not verified it yet." : `${done.length} of ${steps.length} steps done; next: ${steps.find((x) => !x.done)!.label.toLowerCase()}.`
      }
    }
  }
}

function applyDraft(item: ReadinessItem, s: ClosureInputs, request: boolean) {
  const draft = s.drafts[item.id]
  const r = s.closure.requests[item.id]
  if (draft?.text.trim()) {
    if (item.framework !== "BRSR") return
    if (draftConfirmed(item.id, s.ownerOf?.(item.id), draft, s.reportReview)) {
      item.status = "now"
      item.gap = ""
      item.how = `${item.how}; answer drafted and confirmed by the ${item.owner.role.toLowerCase()} in review`
    } else {
      if (item.status === "open") item.status = "sync"
      item.gap = `Answer drafted ${draft.at.slice(0, 10)}; to be confirmed by the ${item.owner.role.toLowerCase()} in the test report review.`
      item.how = `${item.how}; answer drafted`
    }
  } else if (request && r?.receivedAt) {
    if (item.status === "open") item.status = "sync"
    item.gap = `Data received${r.file ? ` (${r.file})` : ""}; draft the answer.`
  } else if (request && r?.sentAt) {
    item.gap = `Data requested from the ${item.owner.role.toLowerCase()} on ${r.sentAt.slice(0, 10)}${r.due ? `, due ${r.due}` : ""}.`
  }
}

export const isMonthlyMetric = (id: MetricId) => METRICS.some((m) => m.id === id) || EXTRA_METRICS.some((m) => m.id === id)

// The inputs closing work needs, from the store and the readiness coverage.
export function closureInputs(
  state: { collection: CollectionState; closure?: ClosureState; drafts?: Record<string, Draft>; docReview: DocReviewState; reportReview: ReportReviewState; sites: Site[] },
  coverage: ClosureInputs["coverage"],
): ClosureInputs {
  return {
    collection: state.collection,
    closure: state.closure ?? EMPTY_CLOSURE,
    drafts: state.drafts ?? {},
    docReview: state.docReview,
    reportReview: state.reportReview,
    sites: state.sites.filter((x) => x.status === "confirmed"),
    coverage,
    ownerOf: brsrOwner,
  }
}

export const VIA_LABEL: Record<CollectVia, string> = { monthly: "Monthly collection", extension: "Add to monthly collection", annual: "Company data", request: "Data request" }
