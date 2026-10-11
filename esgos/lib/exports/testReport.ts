// The BRSR test report as one document model, read by the in-app report, the
// Word file and the print (PDF) view, so all three say the same thing. It follows
// SEBI's structure: Section A in its seven parts, Section B, and Section C by
// principle with Essential and Leadership indicators.

import { answerAll, PRINCIPLE_NAMES, type Answer } from "./answers"
import type { Assumption, ReportModel } from "./model"
import { fmtN } from "./model"
import { sessionOwner, sessionStatus, type SessionStatus } from "../reportReview"
import type { BrsrEntry } from "../readiness/types"

export type ReportQuestion = {
  id: string
  number: string
  title: string
  text: string
  answer: Answer
  owner: string
  session: string
  sessionStatus: SessionStatus
  openQueries: number
  core: boolean
  leadership: boolean
  drafted: boolean
}

export type ReportGroup = { id: string; title: string; questions: ReportQuestion[] }
export type ReportSectionDoc = { id: "A" | "B" | "C"; title: string; intro: string; groups: ReportGroup[] }

export type KeyNumber = { label: string; value: string; unit: string; ref: string; note?: string }

export type TestReportDoc = {
  meta: { company: string; shortName: string; cin?: string; fy: string; period: string; prepared: string; preparedBy: string; boundary: string; marker: string; status: string }
  counts: { answered: number; partial: number; placeholder: number; total: number }
  coverage: { id: string; label: string; answered: number; partial: number; placeholder: number }[]
  keyNumbers: KeyNumber[]
  review: { sessions: number; held: number; signedOff: number; queries: number; openQueries: number; rows: { owner: string; questions: number; status: SessionStatus; held?: string; signedOff?: string }[] }
  sections: ReportSectionDoc[]
  assumptions: Assumption[]
  drafts: number
}

// SEBI's question text carries the table layout in a [Format: …] note; the report shows the table instead.
export const stripFormat = (t: string) => t.replace(/\s*\[Format:[^\]]*\]/g, "").trim()

export const SECTION_TITLES: Record<"A" | "B" | "C", string> = {
  A: "Section A: General disclosures",
  B: "Section B: Management and process disclosures",
  C: "Section C: Principle-wise performance disclosure",
}

const SECTION_INTRO: Record<"A" | "B" | "C", string> = {
  A: "The listed entity, its products, operations, employees, group companies, CSR and complaints.",
  B: "Policies for the nine principles, how they are governed and who is responsible.",
  C: "Performance against each principle: Essential indicators every listed entity reports, and Leadership indicators it may report.",
}

export function buildTestReport(m: ReportModel): TestReportDoc {
  const all = answerAll(m)
  const c = m.client
  const sessions = m.state.reportReview.sessions
  const q = (e: BrsrEntry, answer: Answer): ReportQuestion => {
    const s = sessions[sessionOwner(e.owner)]
    return {
      id: e.id,
      number: e.number,
      title: e.title,
      text: stripFormat(e.text),
      answer,
      owner: e.owner,
      session: sessionOwner(e.owner),
      sessionStatus: sessionStatus(s),
      openQueries: (s?.queries ?? []).filter((x) => x.questionId === e.id && !x.resolvedAt).length,
      core: e.core,
      leadership: e.kind === "leadership",
      drafted: !!m.state.drafts?.[e.id]?.text.trim(),
    }
  }
  const rows = all.rows
  const groupBy = (list: typeof rows, key: (e: BrsrEntry) => string) => {
    const out: ReportGroup[] = []
    for (const r of list) {
      const k = key(r.entry)
      let g = out.find((x) => x.title === k)
      if (!g) out.push((g = { id: `${r.entry.section}-${out.length + 1}`, title: k, questions: [] }))
      g.questions.push(q(r.entry, r.answer))
    }
    return out
  }
  const A = groupBy(
    rows.filter((r) => r.entry.section === "A"),
    (e) => e.part,
  )
  const B = groupBy(
    rows.filter((r) => r.entry.section === "B"),
    (e) => e.part,
  )
  const C: ReportGroup[] = []
  for (let n = 1; n <= 9; n++) {
    const p = `P${n}`
    for (const kind of ["essential", "leadership"] as const) {
      const list = rows.filter((r) => r.entry.principle === p && r.entry.kind === kind)
      if (!list.length) continue
      C.push({ id: `${p}-${kind}`, title: `Principle ${n} · ${kind === "essential" ? "Essential indicators" : "Leadership indicators"}`, questions: list.map((r) => q(r.entry, r.answer)) })
    }
  }
  const tally = (list: typeof rows) => ({ answered: list.filter((x) => x.answer.kind === "answered").length, partial: list.filter((x) => x.answer.kind === "partial").length, placeholder: list.filter((x) => x.answer.kind === "placeholder").length })
  const coverage = [
    { id: "A", label: "Section A", ...tally(rows.filter((r) => r.entry.section === "A")) },
    { id: "B", label: "Section B", ...tally(rows.filter((r) => r.entry.section === "B")) },
    ...Array.from({ length: 9 }, (_, i) => ({ id: `P${i + 1}`, label: `Principle ${i + 1}`, ...tally(rows.filter((r) => r.entry.principle === `P${i + 1}`)) })),
  ]

  const w = m.collection.withEstimates
  const col = m.collection.collected
  const months = m.collection.closed.length
  const per = months ? `${months} closed month${months === 1 ? "" : "s"}` : "months collected so far"
  const keyNumbers: KeyNumber[] = m.collection.setup
    ? [
        { label: "Energy consumed", value: fmtN(col.totalGJ), unit: "GJ", ref: "P6 E1", note: w.totalGJ !== col.totalGJ ? `${fmtN(w.totalGJ)} with estimates` : undefined },
        { label: "Scope 1 emissions", value: fmtN(col.scope1), unit: "tCO2e", ref: "P6 E7" },
        { label: "Scope 2 emissions", value: fmtN(col.scope2), unit: "tCO2e", ref: "P6 E7" },
        { label: "Water withdrawn", value: fmtN(col.waterWithdrawal), unit: "kL", ref: "P6 E3" },
        { label: "Waste generated", value: fmtN(col.waste, 1), unit: "t", ref: "P6 E9" },
        { label: "LTIFR", value: col.ltifr !== undefined ? fmtN(col.ltifr, 2) : "—", unit: "per million hours", ref: "P3 E11" },
      ].map((k) => ({ ...k, note: k.note ?? per }))
    : []

  const rv = m.review.summary
  const status = rv.signedOff === rv.sessions ? "Reviewed with every data owner" : rv.held ? `In review: ${rv.signedOff} of ${rv.sessions} owners signed off` : "Draft, not yet reviewed with data owners"
  return {
    meta: {
      company: c.legalName,
      shortName: c.shortName,
      cin: c.cin,
      fy: m.fy,
      period: m.period,
      prepared: m.generatedAt,
      preparedBy: m.preparedBy,
      boundary: m.boundary,
      marker: "Test report · for internal review only · not for publication or for use in any offer document",
      status,
    },
    counts: { answered: all.answered, partial: all.partial, placeholder: all.placeholder, total: all.rows.length },
    coverage,
    keyNumbers,
    review: {
      sessions: rv.sessions,
      held: rv.held,
      signedOff: rv.signedOff,
      queries: rv.queries,
      openQueries: rv.openQueries,
      rows: m.review.plan.map((p) => {
        const s = sessions[p.owner]
        return { owner: p.owner, questions: p.questions.length, status: sessionStatus(s), held: s?.heldAt, signedOff: s?.signedOffAt ? `${s.signedOffBy?.split(" (")[0]}, ${s.signedOffAt.slice(0, 10)}` : undefined }
      }),
    },
    sections: [
      { id: "A", title: SECTION_TITLES.A, intro: SECTION_INTRO.A, groups: A },
      { id: "B", title: SECTION_TITLES.B, intro: SECTION_INTRO.B, groups: B },
      { id: "C", title: SECTION_TITLES.C, intro: SECTION_INTRO.C, groups: C },
    ],
    assumptions: m.assumptions,
    drafts: Object.values(m.state.drafts ?? {}).filter((d) => d.text.trim()).length,
  }
}

export const principleName = (p: string) => PRINCIPLE_NAMES[p]
