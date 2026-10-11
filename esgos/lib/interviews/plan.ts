// The interview plan, answers and the findings they produce. Findings feed the
// readiness assessment: an answer can confirm, weaken or open a BRSR item.

import { GUIDES, GUIDE_BY_ID, type GuideId, type InterviewGuide, type InterviewQuestion } from "./guides"
import type { Site, Stakeholder } from "../types"

export type Rating = "in-place" | "partial" | "not-in-place" | "na"
export type DataSystem = "system" | "spreadsheet" | "manual" | "none"

export const RATING_LABEL: Record<Rating, string> = { "in-place": "In place", partial: "Partly", "not-in-place": "Not in place", na: "N/A" }
export const SYSTEM_LABEL: Record<DataSystem, string> = { system: "System (ERP, HRMS, meters)", spreadsheet: "Spreadsheet", manual: "Paper or manual", none: "Not recorded" }

export type InterviewAnswer = { rating?: Rating; system?: DataSystem; evidence?: string; note?: string; at: string; by: string; example?: boolean }

export type InterviewStatus = "planned" | "done"

export type Interview = {
  id: string
  guideId: GuideId
  siteId?: string
  title: string
  interviewee: { name?: string; role: string }
  date: string
  status: InterviewStatus
  completedAt?: string
}

export type InterviewState = { plan: Interview[]; answers: Record<string, InterviewAnswer> }

export const EMPTY_INTERVIEWS: InterviewState = { plan: [], answers: {} }

export const answerKey = (interviewId: string, questionId: string) => `${interviewId}::${questionId}`

const CORPORATE: GuideId[] = ["cs", "legal", "finance", "hr", "ehs", "operations", "procurement", "risk", "audit"]

// Working days from a start date: two corporate interviews a day, then one plant a day.
function workingDays(from: Date, n: number): string[] {
  const out: string[] = []
  const d = new Date(from)
  d.setDate(d.getDate() + 1)
  while (out.length < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}

// Legal, risk and internal audit have no seat of their own; leave the name for the user.
const OWN_SEAT: GuideId[] = ["cs", "finance", "hr", "ehs", "operations", "procurement", "plant"]

function personFor(guide: InterviewGuide, stakeholders: Stakeholder[], siteId?: string) {
  if (!OWN_SEAT.includes(guide.id)) return undefined
  const p = stakeholders.find((s) => !s.vacant && s.role === guide.role && (siteId ? s.siteId === siteId : !s.siteId))
  return p?.name
}

export function buildInterviewPlan(sites: Site[], stakeholders: Stakeholder[], today = new Date()): Interview[] {
  const plants = sites.filter((s) => s.type === "factory" && s.status === "confirmed")
  const days = workingDays(today, Math.ceil(CORPORATE.length / 2) + plants.length)
  const corporate: Interview[] = CORPORATE.map((id, i) => {
    const g = GUIDE_BY_ID[id]
    return { id: `int-${id}`, guideId: id, title: g.title, interviewee: { name: personFor(g, stakeholders), role: g.interviewee }, date: days[Math.floor(i / 2)], status: "planned" }
  })
  const offset = Math.ceil(CORPORATE.length / 2)
  const plant: Interview[] = plants.map((s, i) => ({
    id: `int-plant-${s.id}`,
    guideId: "plant",
    siteId: s.id,
    title: s.name,
    interviewee: { name: personFor(GUIDE_BY_ID.plant, stakeholders, s.id), role: "Plant head with EHS and HR" },
    date: days[offset + i],
    status: "planned",
  }))
  return [...corporate, ...plant]
}

export type Finding = {
  interview: Interview
  guide: InterviewGuide
  question: InterviewQuestion
  answer: InterviewAnswer
}

export function findings(state: InterviewState): Finding[] {
  const out: Finding[] = []
  for (const iv of state.plan) {
    const guide = GUIDE_BY_ID[iv.guideId]
    for (const question of guide.questions) {
      const answer = state.answers[answerKey(iv.id, question.id)]
      if (answer?.rating) out.push({ interview: iv, guide, question, answer })
    }
  }
  return out
}

export function progress(state: InterviewState, iv: Interview) {
  const qs = GUIDE_BY_ID[iv.guideId].questions
  const answered = qs.filter((q) => state.answers[answerKey(iv.id, q.id)]?.rating).length
  return { answered, total: qs.length }
}

const ORDER: Rating[] = ["not-in-place", "partial", "in-place", "na"]
export function worst(ratings: Rating[]): Rating | undefined {
  return ORDER.find((r) => ratings.includes(r))
}

// Example answers for the fictional sample only: a plausible spread so the
// workflow can be shown end to end. Never used for a real company.
export function exampleAnswer(q: InterviewQuestion, seed: number): Omit<InterviewAnswer, "at" | "by"> {
  const h = [...q.id].reduce((n, c) => (n * 31 + c.charCodeAt(0) + seed) % 9973, 7)
  const rating: Rating = h % 5 === 0 ? "not-in-place" : h % 5 < 3 ? "partial" : "in-place"
  const system: DataSystem | undefined = q.focus === "systems" || q.focus === "availability" ? (["system", "spreadsheet", "manual", "none"] as DataSystem[])[h % 4] : undefined
  return {
    rating,
    system,
    evidence: rating === "in-place" ? q.evidence : undefined,
    note: rating === "not-in-place" ? "Not done today (example answer)." : rating === "partial" ? "Done at some plants or informally (example answer)." : "In place (example answer).",
    example: true,
  }
}

export { GUIDES }
