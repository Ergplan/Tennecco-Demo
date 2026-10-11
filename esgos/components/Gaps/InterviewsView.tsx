"use client"

// Management interviews: the plan (functions and plants), a runner to record
// each answer, and what the interviews found. Answers feed BRSR readiness.

import { motion } from "framer-motion"
import { ArrowLeft, CalendarDays, Check, ClipboardCheck, Factory, Gavel, HardHat, Landmark, MessagesSquare, Package, ShieldAlert, Sparkles, UserRound, UsersRound, Wallet, type LucideIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { getClient } from "@/esgos/lib/clients"
import { FOCUS_LABEL, GUIDE_BY_ID, type Focus, type GuideId, type InterviewQuestion } from "@/esgos/lib/interviews/guides"
import { RATING_LABEL, SYSTEM_LABEL, answerKey, findings, progress, type DataSystem, type Interview, type Rating } from "@/esgos/lib/interviews/plan"
import { Button, Eyebrow } from "../common/ui"
import { cn } from "../common/cn"

export const GUIDE_ICON: Record<GuideId, LucideIcon> = {
  cs: Landmark,
  legal: Gavel,
  finance: Wallet,
  hr: UsersRound,
  ehs: HardHat,
  operations: Factory,
  procurement: Package,
  risk: ShieldAlert,
  audit: ClipboardCheck,
  plant: Factory,
}

const RATING_STYLE: Record<Rating, string> = {
  "in-place": "border-accent bg-accent/12 text-accent",
  partial: "border-amber bg-amber/12 text-amber",
  "not-in-place": "border-hue-gaps bg-hue-gaps/12 text-hue-gaps",
  na: "border-line-strong bg-surface-2 text-muted",
}
const FOCUS_ORDER: Focus[] = ["governance", "practice", "systems", "availability"]

function fmtDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
}

function QuestionCard({ iv, q, index }: { iv: Interview; q: InterviewQuestion; index: number }) {
  const answer = useStore((s) => s.interviews.answers[answerKey(iv.id, q.id)])
  const answerInterview = useStore((s) => s.answerInterview)
  const [note, setNote] = useState(answer?.note ?? "")
  const [evidence, setEvidence] = useState(answer?.evidence ?? "")
  const showSystem = q.focus === "systems" || q.focus === "availability"
  return (
    <li className="rounded-lg border border-line bg-surface/50 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 w-5 shrink-0 font-mono text-[11px] text-faint">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed">{q.text}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-faint">
            {q.refs.map((r) => (
              <span key={r} className="rounded border border-line px-1.5 py-px font-mono">
                {r}
              </span>
            ))}
            {q.evidence && <span>· Ask to see: {q.evidence}</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Answer">
            {(Object.keys(RATING_LABEL) as Rating[]).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={answer?.rating === r}
                onClick={() => answerInterview(iv.id, q.id, { rating: r })}
                className={cn("rounded-md border px-2.5 py-1 text-xs transition-colors", answer?.rating === r ? RATING_STYLE[r] : "border-line text-muted hover:text-fg")}
              >
                {RATING_LABEL[r]}
              </button>
            ))}
          </div>
          {showSystem && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Where the data is kept">
              <span className="text-[11px] text-faint">Kept in:</span>
              {(Object.keys(SYSTEM_LABEL) as DataSystem[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={answer?.system === k}
                  onClick={() => answerInterview(iv.id, q.id, { system: k })}
                  className={cn("rounded-md border px-2 py-0.5 text-[11px]", answer?.system === k ? "border-fg text-fg" : "border-line text-muted hover:text-fg")}
                >
                  {SYSTEM_LABEL[k]}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <input
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              onBlur={() => evidence !== (answer?.evidence ?? "") && answerInterview(iv.id, q.id, { evidence })}
              placeholder="Evidence seen (document name)"
              aria-label="Evidence seen"
              className="h-9 rounded-md border border-line-strong bg-bg px-2.5 text-xs outline-none placeholder:text-faint focus:border-fg/60"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => note !== (answer?.note ?? "") && answerInterview(iv.id, q.id, { note })}
              placeholder="Notes"
              aria-label="Notes"
              className="h-9 rounded-md border border-line-strong bg-bg px-2.5 text-xs outline-none placeholder:text-faint focus:border-fg/60"
            />
          </div>
          {answer?.example && <p className="mt-1.5 text-[11px] text-faint">Example answer (sample client only)</p>}
        </div>
      </div>
    </li>
  )
}

function Runner({ iv, onBack }: { iv: Interview; onBack: () => void }) {
  const guide = GUIDE_BY_ID[iv.guideId]
  const state = useStore((s) => s.interviews)
  const updateInterview = useStore((s) => s.updateInterview)
  const completeInterview = useStore((s) => s.completeInterview)
  const fillExample = useStore((s) => s.fillExampleInterview)
  const p = progress(state, iv)
  const Icon = GUIDE_ICON[iv.guideId]
  const [name, setName] = useState(iv.interviewee.name ?? "")
  return (
    <div>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg">
        <ArrowLeft size={13} /> All interviews
      </button>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-hue-boundary/12 text-hue-boundary">
            <Icon size={18} />
          </span>
          <div>
            <h2 className="text-xl font-medium tracking-tight">
              {iv.title} {iv.siteId ? "plant interview" : "interview"}
            </h2>
            <p className="mt-0.5 max-w-2xl text-sm text-muted">{guide.purpose}</p>
          </div>
        </div>
        <div className="text-right text-xs text-muted">
          <div>
            {p.answered} of {p.total} answered · about {guide.minutes} min
          </div>
          <div className="mt-1.5 h-1.5 w-40 rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-hue-boundary" style={{ width: `${(p.answered / p.total) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-muted">
          Interviewee ({iv.interviewee.role})
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== (iv.interviewee.name ?? "") && updateInterview(iv.id, { interviewee: { name, role: iv.interviewee.role } })}
            placeholder="Name"
            className="mt-1 h-9 w-full rounded-md border border-line-strong bg-bg px-2.5 text-sm text-fg outline-none focus:border-fg/60"
          />
        </label>
        <label className="text-xs text-muted">
          Date
          <input type="date" value={iv.date} onChange={(e) => e.target.value && updateInterview(iv.id, { date: e.target.value })} className="mt-1 h-9 w-full rounded-md border border-line-strong bg-bg px-2.5 text-sm text-fg outline-none focus:border-fg/60" />
        </label>
        <div className="flex items-end gap-2">
          {getClient().kind === "sample" && (
            <Button size="sm" variant="ghost" onClick={() => fillExample(iv.id)}>
              <Sparkles size={13} /> Example answers (demo)
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {FOCUS_ORDER.map((f) => {
          const qs = guide.questions.filter((q) => q.focus === f)
          if (!qs.length) return null
          return (
            <section key={f}>
              <Eyebrow>{FOCUS_LABEL[f]}</Eyebrow>
              <ul className="mt-2 space-y-2">
                {qs.map((q) => (
                  <QuestionCard key={q.id} iv={iv} q={q} index={guide.questions.indexOf(q)} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        {iv.status === "done" ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-sm text-accent">
              <Check size={14} /> Done
            </span>
            <Button size="sm" variant="ghost" onClick={() => completeInterview(iv.id, false)}>
              Reopen
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={() => completeInterview(iv.id, true)} disabled={p.answered === 0}>
            <Check size={14} /> Mark interview done
          </Button>
        )}
        <span className="text-xs text-faint">Answers update BRSR readiness as you go.</span>
      </div>
    </div>
  )
}

function Row({ iv, onOpen }: { iv: Interview; onOpen: () => void }) {
  const state = useStore((s) => s.interviews)
  const p = progress(state, iv)
  const Icon = GUIDE_ICON[iv.guideId]
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface/40 px-3 py-2.5 text-left hover:bg-surface-2">
        <Icon size={15} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{iv.title}</span>
          <span className="flex items-center gap-1 truncate text-xs text-muted">
            <UserRound size={11} /> {iv.interviewee.name ?? <span className="text-faint">{iv.interviewee.role}, name not on file</span>}
          </span>
        </span>
        <span className="hidden w-28 shrink-0 items-center gap-1 text-xs text-muted sm:flex">
          <CalendarDays size={11} /> {fmtDay(iv.date)}
        </span>
        <span className="hidden w-24 shrink-0 sm:block">
          <span className="block h-1.5 rounded-full bg-surface-3">
            <span className="block h-full rounded-full bg-hue-boundary" style={{ width: `${(p.answered / p.total) * 100}%` }} />
          </span>
          <span className="mt-0.5 block text-[10px] text-faint">
            {p.answered}/{p.total}
          </span>
        </span>
        <span className={cn("w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-medium", iv.status === "done" ? "bg-accent/12 text-accent" : p.answered ? "bg-amber/15 text-amber" : "bg-surface-2 text-muted")}>
          {iv.status === "done" ? "Done" : p.answered ? "Started" : "Planned"}
        </span>
      </button>
    </li>
  )
}

export function InterviewsView() {
  const state = useStore((s) => s.interviews)
  const sites = useStore((s) => s.sites)
  const planInterviews = useStore((s) => s.planInterviews)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = state.plan.find((x) => x.id === openId)
  const all = useMemo(() => findings(state), [state])
  const plants = sites.filter((s) => s.type === "factory" && s.status === "confirmed").length

  if (open) return <Runner key={open.id} iv={open} onBack={() => setOpenId(null)} />

  const done = state.plan.filter((x) => x.status === "done").length
  const issues = all.filter((f) => f.answer.rating === "not-in-place" || f.answer.rating === "partial")
  const byFocus = FOCUS_ORDER.map((f) => {
    const list = all.filter((x) => x.question.focus === f && x.answer.rating !== "na")
    return { f, inPlace: list.filter((x) => x.answer.rating === "in-place").length, partial: list.filter((x) => x.answer.rating === "partial").length, not: list.filter((x) => x.answer.rating === "not-in-place").length }
  })

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <Eyebrow className="flex items-center gap-2">
            <MessagesSquare size={13} /> Management interviews
          </Eyebrow>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            One interview per function (company secretarial, legal, finance, HR, EHS, operations, procurement, risk and internal audit) and one per plant. Each asks who is accountable, whether policy is practised, how the data is produced and controlled, and what data exists today. Every answer is tied to the BRSR questions it evidences.
          </p>
        </div>
        {state.plan.length > 0 && (
          <div className="grid grid-cols-3 gap-x-6 text-right">
            <div>
              <div className="text-2xl font-medium tracking-tight">{state.plan.length}</div>
              <div className="text-[11px] text-muted">interviews</div>
            </div>
            <div>
              <div className="text-2xl font-medium tracking-tight text-accent">{done}</div>
              <div className="text-[11px] text-muted">done</div>
            </div>
            <div>
              <div className="text-2xl font-medium tracking-tight text-hue-gaps">{issues.length}</div>
              <div className="text-[11px] text-muted">findings</div>
            </div>
          </div>
        )}
      </div>

      {state.plan.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line-strong p-6">
          <p className="text-sm">
            I&apos;ll plan 9 function interviews and {plants} plant interview{plants === 1 ? "" : "s"} over the next {Math.ceil(9 / 2) + plants} working days, addressed to the people named in your organisation details.
          </p>
          <Button className="mt-4" variant="primary" onClick={planInterviews}>
            <CalendarDays size={14} /> Plan the interviews
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-5">
            {[
              ["Functions", state.plan.filter((x) => !x.siteId)],
              ["Plants", state.plan.filter((x) => x.siteId)],
            ].map(([label, list]) =>
              (list as Interview[]).length ? (
                <section key={label as string}>
                  <Eyebrow>{label as string}</Eyebrow>
                  <ul className="mt-2 space-y-1.5">
                    {(list as Interview[]).map((iv) => (
                      <Row key={iv.id} iv={iv} onOpen={() => setOpenId(iv.id)} />
                    ))}
                  </ul>
                </section>
              ) : null,
            )}
          </div>
          <aside>
            <Eyebrow>What the interviews found</Eyebrow>
            <div className="mt-2 space-y-1.5">
              {byFocus.map(({ f, inPlace, partial, not }) => {
                const n = inPlace + partial + not
                return (
                  <div key={f} className="text-xs">
                    <div className="flex justify-between text-muted">
                      <span>{FOCUS_LABEL[f]}</span>
                      <span>{n ? `${inPlace} in place · ${partial} partly · ${not} not` : "No answers yet"}</span>
                    </div>
                    <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-surface-3">
                      {n > 0 && (
                        <>
                          <span className="bg-accent" style={{ width: `${(inPlace / n) * 100}%` }} />
                          <span className="bg-amber" style={{ width: `${(partial / n) * 100}%` }} />
                          <span className="bg-hue-gaps" style={{ width: `${(not / n) * 100}%` }} />
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <ul className="mt-5 space-y-2">
              {issues.slice(0, 12).map((f) => (
                <motion.li key={f.interview.id + f.question.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-line p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{f.interview.siteId ? `${f.interview.title} plant` : f.guide.title}</span>
                    <span className={cn("rounded-full border px-2 py-px text-[10px]", RATING_STYLE[f.answer.rating!])}>{RATING_LABEL[f.answer.rating!]}</span>
                  </div>
                  <p className="mt-1 text-muted">{f.answer.note?.trim() || f.question.text}</p>
                  <p className="mt-1.5">
                    <span className="text-faint">Recommend: </span>
                    {f.question.recommendation}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-faint">{f.question.refs.join(" · ")}</p>
                </motion.li>
              ))}
              {!issues.length && <li className="text-xs text-faint">Findings appear here as answers come in.</li>}
              {issues.length > 12 && <li className="text-xs text-faint">{issues.length - 12} more in the gap analysis export.</li>}
            </ul>
          </aside>
        </div>
      )}
    </div>
  )
}
