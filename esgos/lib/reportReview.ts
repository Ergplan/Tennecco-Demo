// Phase 3 review sessions: the BRSR test report is walked through with each
// functional data owner to check accuracy, completeness and consistency with
// internal documents. Queries are raised against questions and resolved; a
// session is signed off only when all three checks pass and no query is open.

import raw from "./readiness/catalogue.json"
import type { BrsrEntry, Catalogue } from "./readiness/types"

const CATALOGUE = raw as unknown as Catalogue

export type CheckId = "accuracy" | "completeness" | "consistency"
export type CheckResult = "confirmed" | "issues"

export const CHECKS: { id: CheckId; label: string; help: string }[] = [
  { id: "accuracy", label: "Accuracy", help: "Numbers and statements match the source records." },
  { id: "completeness", label: "Completeness", help: "Every question in these sections is answered, or has a placeholder naming who completes it." },
  { id: "consistency", label: "Consistent with internal documents", help: "Answers agree with policies, registers, the annual report and the financial statements." },
]

export type Query = { id: string; questionId: string; text: string; raisedAt: string; by: string; resolvedAt?: string; resolution?: string }

export type ReviewSession = {
  date?: string
  attendees?: string
  checks: Partial<Record<CheckId, CheckResult>>
  notes?: string
  queries: Query[]
  heldAt?: string
  signedOffAt?: string
  signedOffBy?: string
}

export type ReportReviewState = { sessions: Record<string, ReviewSession> }
export const EMPTY_REPORT_REVIEW: ReportReviewState = { sessions: {} }
export const EMPTY_SESSION: ReviewSession = { checks: {}, queries: [] }

// Legal and risk questions are reviewed with the company secretary and finance.
const SEAT: Record<string, string> = { Legal: "Company secretary", Risk: "Finance controller" }
export const sessionOwner = (owner: string) => SEAT[owner] ?? owner

export type SessionPlan = { owner: string; questions: BrsrEntry[]; sections: string[] }

// One session per functional owner, largest first.
export function reviewPlan(): SessionPlan[] {
  const by = new Map<string, BrsrEntry[]>()
  for (const e of CATALOGUE.brsr) {
    const o = sessionOwner(e.owner)
    by.set(o, [...(by.get(o) ?? []), e])
  }
  return [...by.entries()]
    .map(([owner, questions]) => ({ owner, questions, sections: [...new Set(questions.map((q) => (q.section === "C" ? q.principle! : q.section)))] }))
    .sort((a, b) => b.questions.length - a.questions.length || a.owner.localeCompare(b.owner))
}

export type SessionStatus = "not held" | "issues" | "held" | "signed off"

export function sessionStatus(s?: ReviewSession): SessionStatus {
  if (!s || !s.heldAt) return "not held"
  if (s.signedOffAt) return "signed off"
  if (Object.values(s.checks).includes("issues") || s.queries.some((q) => !q.resolvedAt)) return "issues"
  return "held"
}

export function canSignOff(s?: ReviewSession) {
  return !!s?.heldAt && CHECKS.every((c) => s.checks[c.id] === "confirmed") && !s.queries.some((q) => !q.resolvedAt)
}

export function reviewSummary(state: ReportReviewState) {
  const plan = reviewPlan()
  const status = plan.map((p) => sessionStatus(state.sessions[p.owner]))
  const queries = Object.values(state.sessions).flatMap((s) => s.queries)
  return {
    sessions: plan.length,
    held: status.filter((x) => x !== "not held").length,
    signedOff: status.filter((x) => x === "signed off").length,
    withIssues: status.filter((x) => x === "issues").length,
    queries: queries.length,
    openQueries: queries.filter((q) => !q.resolvedAt).length,
    questionsSignedOff: plan.filter((p) => sessionStatus(state.sessions[p.owner]) === "signed off").reduce((a, p) => a + p.questions.length, 0),
  }
}
