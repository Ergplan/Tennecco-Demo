"use client"

// Test report review (Phase 3): one session per functional data owner. The owner's
// questions are shown with the draft answer; the session records the three checks
// (accuracy, completeness, consistency with internal documents), raises and
// resolves queries, and is signed off only when everything passes.

import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronDown, CircleAlert, MessageSquarePlus, ShieldCheck } from "lucide-react"
import { useMemo, useState } from "react"
import { actorUser, useStore } from "@/esgos/lib/store"
import { buildReportModel } from "@/esgos/lib/exports/model"
import { answerAll, type Answer } from "@/esgos/lib/exports/answers"
import { CHECKS, EMPTY_SESSION, canSignOff, reviewPlan, reviewSummary, sessionStatus, type CheckResult, type SessionPlan, type SessionStatus } from "@/esgos/lib/reportReview"
import { roleForOwner } from "@/esgos/lib/org"
import { Button, Eyebrow } from "../common/ui"
import { cn } from "../common/cn"

const STATUS_STYLE: Record<SessionStatus, string> = {
  "not held": "bg-surface-2 text-muted",
  issues: "bg-hue-gaps/12 text-hue-gaps",
  held: "bg-amber/15 text-amber",
  "signed off": "bg-accent/12 text-accent",
}
const KIND_STYLE: Record<Answer["kind"], string> = { answered: "text-accent", partial: "text-amber", placeholder: "text-hue-gaps" }
const KIND_LABEL: Record<Answer["kind"], string> = { answered: "Answered", partial: "Partly", placeholder: "Placeholder" }

function answerText(a: Answer) {
  if (a.text) return a.text
  if (a.table) return `Table: ${a.table.head.join(", ")} (${a.table.rows.length} rows)`
  return ""
}

function Session({ plan, answers, open, onToggle }: { plan: SessionPlan; answers: Map<string, Answer>; open: boolean; onToggle: () => void }) {
  const session = useStore((s) => s.reportReview.sessions[plan.owner]) ?? EMPTY_SESSION
  const stakeholders = useStore((s) => s.stakeholders)
  const { updateSession, holdSession, raiseQuery, resolveQuery, signOffSession } = useStore.getState()
  const status = sessionStatus(session)
  const role = roleForOwner(plan.owner)
  const person = stakeholders.find((p) => !p.siteId && !p.vacant && (p.role === role || p.role === plan.owner))?.name
  const [attendees, setAttendees] = useState(session.attendees ?? person ?? "")
  const [notes, setNotes] = useState(session.notes ?? "")
  const [qId, setQId] = useState(plan.questions[0]?.id ?? "")
  const [qText, setQText] = useState("")
  const [resolution, setResolution] = useState<Record<string, string>>({})
  const kinds = plan.questions.map((q) => answers.get(q.id)?.kind ?? "placeholder")
  const openQueries = session.queries.filter((q) => !q.resolvedAt)

  return (
    <li className={cn("rounded-xl border", open ? "border-line-strong bg-surface" : "border-line bg-surface/40")}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`Review session: ${plan.owner}`} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            {plan.owner}
            {person && <span className="font-normal text-muted"> · {person}</span>}
          </span>
          <span className="block text-xs text-muted">
            {plan.questions.length} questions · {plan.sections.join(", ")} · {kinds.filter((k) => k === "answered").length} answered, {kinds.filter((k) => k === "partial").length} partly, {kinds.filter((k) => k === "placeholder").length} placeholders
            {session.queries.length ? ` · ${openQueries.length} of ${session.queries.length} queries open` : ""}
          </span>
        </span>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_STYLE[status])}>{status}</span>
        <ChevronDown size={14} className={cn("shrink-0 text-faint transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-5 border-t border-line px-4 py-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  onBlur={() => attendees !== (session.attendees ?? "") && updateSession(plan.owner, { attendees })}
                  placeholder="Attendees"
                  aria-label="Attendees"
                  className="h-9 rounded-md border border-line-strong bg-bg px-2.5 text-xs outline-none placeholder:text-faint focus:border-fg/60"
                />
                <Button size="sm" variant={session.heldAt ? "secondary" : "primary"} onClick={() => holdSession(plan.owner, !session.heldAt)}>
                  {session.heldAt ? `Held ${new Date(session.heldAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · reopen` : "Mark session held"}
                </Button>
              </div>

              <div>
                <Eyebrow>Questions and draft answers</Eyebrow>
                <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
                  {plan.questions.map((q) => {
                    const a = answers.get(q.id)
                    const qs = session.queries.filter((x) => x.questionId === q.id)
                    return (
                      <li key={q.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-surface-2">
                        <span className="w-14 shrink-0 font-mono text-faint">{q.id}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block">{q.title}</span>
                          <span className="line-clamp-2 block text-muted">{a ? answerText(a) : ""}</span>
                        </span>
                        {qs.some((x) => !x.resolvedAt) && <CircleAlert size={12} className="mt-0.5 shrink-0 text-hue-gaps" aria-label="Open query" />}
                        <span className={cn("w-20 shrink-0 text-right font-medium", KIND_STYLE[a?.kind ?? "placeholder"])}>{KIND_LABEL[a?.kind ?? "placeholder"]}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="space-y-2">
                <Eyebrow>Checks</Eyebrow>
                {CHECKS.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 text-sm">
                      {c.label} <span className="text-xs text-faint">· {c.help}</span>
                    </span>
                    <span className="flex gap-1" role="radiogroup" aria-label={c.label}>
                      {(
                        [
                          ["confirmed", "Confirmed"],
                          ["issues", "Issues found"],
                        ] as [CheckResult, string][]
                      ).map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={session.checks[c.id] === v}
                          disabled={!session.heldAt}
                          onClick={() => updateSession(plan.owner, { check: [c.id, session.checks[c.id] === v ? undefined : v] })}
                          className={cn("rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-40", session.checks[c.id] === v ? (v === "confirmed" ? "border-accent bg-accent/12 text-accent" : "border-hue-gaps bg-hue-gaps/12 text-hue-gaps") : "border-line text-muted hover:text-fg")}
                        >
                          {label}
                        </button>
                      ))}
                    </span>
                  </div>
                ))}
                {!session.heldAt && <p className="text-[11px] text-faint">Mark the session held to record the checks.</p>}
              </div>

              <div className="space-y-2">
                <Eyebrow>Queries</Eyebrow>
                <div className="flex flex-wrap gap-2">
                  <select value={qId} onChange={(e) => setQId(e.target.value)} aria-label="Question" className="h-9 max-w-[220px] rounded-md border border-line-strong bg-bg px-2 text-xs">
                    {plan.questions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.id} · {q.title.slice(0, 40)}
                      </option>
                    ))}
                  </select>
                  <input value={qText} onChange={(e) => setQText(e.target.value)} placeholder="What needs checking or changing" aria-label="Query" className="h-9 min-w-[220px] flex-1 rounded-md border border-line-strong bg-bg px-2.5 text-xs outline-none placeholder:text-faint focus:border-fg/60" />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!qText.trim()}
                    onClick={() => {
                      raiseQuery(plan.owner, qId, qText.trim())
                      setQText("")
                    }}
                  >
                    <MessageSquarePlus size={13} /> Raise query
                  </Button>
                </div>
                {session.queries.length > 0 && (
                  <ul className="space-y-1.5">
                    {session.queries.map((q) => (
                      <li key={q.id} className="rounded-md border border-line px-3 py-2 text-xs">
                        <div className="flex items-start gap-2">
                          <span className="w-14 shrink-0 font-mono text-faint">{q.questionId}</span>
                          <span className="min-w-0 flex-1">{q.text}</span>
                          {q.resolvedAt && (
                            <span className="flex shrink-0 items-center gap-1 text-accent">
                              <Check size={11} /> Resolved
                            </span>
                          )}
                        </div>
                        {q.resolvedAt ? (
                          <p className="mt-1 pl-16 text-muted">{q.resolution}</p>
                        ) : (
                          <div className="mt-1.5 flex gap-2 pl-16">
                            <input value={resolution[q.id] ?? ""} onChange={(e) => setResolution({ ...resolution, [q.id]: e.target.value })} placeholder="Resolution" aria-label="Resolution" className="h-8 flex-1 rounded-md border border-line-strong bg-bg px-2 text-xs outline-none placeholder:text-faint" />
                            <Button size="sm" variant="secondary" disabled={!(resolution[q.id] ?? "").trim()} onClick={() => resolveQuery(plan.owner, q.id, resolution[q.id]!.trim())}>
                              Resolve
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => notes !== (session.notes ?? "") && updateSession(plan.owner, { notes })}
                placeholder="Session notes"
                aria-label="Session notes"
                className="h-9 w-full rounded-md border border-line-strong bg-bg px-2.5 text-xs outline-none placeholder:text-faint focus:border-fg/60"
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" variant={session.signedOffAt ? "secondary" : "primary"} disabled={!session.signedOffAt && !canSignOff(session)} onClick={() => signOffSession(plan.owner, !session.signedOffAt)}>
                  <ShieldCheck size={13} /> {session.signedOffAt ? "Withdraw sign-off" : "Sign off"}
                </Button>
                <span className="text-xs text-faint">
                  {session.signedOffAt
                    ? `Signed off by ${session.signedOffBy} on ${new Date(session.signedOffAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                    : canSignOff(session)
                      ? "All three checks confirmed and no open queries."
                      : "Sign-off needs the session held, all three checks confirmed and every query resolved."}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

export function ReviewView() {
  const state = useStore()
  const reportReview = useStore((s) => s.reportReview)
  const [openOwner, setOpenOwner] = useState<string | null>(null)
  const answers = useMemo(
    () => new Map(answerAll(buildReportModel(state, actorUser())).rows.map((r) => [r.entry.id, r.answer])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.sources, state.documents, state.interviews, state.collection, state.docReview, state.sites, state.energy, state.clientId, state.boundary],
  )
  const plan = useMemo(() => reviewPlan(), [])
  const sum = reviewSummary(reportReview)
  return (
    <div>
      <Eyebrow>Phase 3 · BRSR test report review</Eyebrow>
      <h2 className="mt-1 text-xl font-medium tracking-tight">Review the test report with each data owner</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        One session per functional owner. Walk through their questions and the draft answers, confirm accuracy, completeness and consistency with internal documents, raise queries where something is wrong, and sign off. The test report and its presentation show the outcome.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {(
          [
            [`${sum.held}/${sum.sessions}`, "sessions held", ""],
            [`${sum.signedOff}/${sum.sessions}`, "signed off", "text-accent"],
            [String(sum.openQueries), `open queries of ${sum.queries}`, sum.openQueries ? "text-hue-gaps" : ""],
            [`${sum.questionsSignedOff}/148`, "questions signed off", ""],
          ] as const
        ).map(([v, l, c]) => (
          <div key={l}>
            <div className={cn("text-3xl font-medium tracking-tight tnum", c)}>{v}</div>
            <div className="text-xs text-muted">{l}</div>
          </div>
        ))}
      </div>
      <ul className="mt-6 space-y-2">
        {plan.map((p) => (
          <Session key={p.owner} plan={p} answers={answers} open={openOwner === p.owner} onToggle={() => setOpenOwner(openOwner === p.owner ? null : p.owner)} />
        ))}
      </ul>
    </div>
  )
}
