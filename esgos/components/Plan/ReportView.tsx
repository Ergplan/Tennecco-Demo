"use client"

// The BRSR test report and its data workbook, read in the app. The report is the
// same document model the Word file and the PDF are built from; the workbook view
// renders the very workbook the Excel download writes. Placeholders can be
// drafted where they are read, and the draft goes to the owner's review.

import { AnimatePresence, motion } from "framer-motion"
import { CircleAlert, FileDown, FileSpreadsheet, FileText, PenLine, Printer, Table2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { actorUser, useStore } from "@/esgos/lib/store"
import { buildReportModel, type ReportModel } from "@/esgos/lib/exports/model"
import { buildTestReport, principleName, type ReportQuestion, type TestReportDoc } from "@/esgos/lib/exports/testReport"
import type { Answer } from "@/esgos/lib/exports/answers"
import { downloadDeliverable } from "@/esgos/lib/exports/download"
import { Button, Eyebrow } from "../common/ui"
import { cn } from "../common/cn"
import { DraftEditor } from "./DraftEditor"
import { WorkbookView } from "./WorkbookView"

const KIND: Record<Answer["kind"], { label: string; cls: string; dot: string }> = {
  answered: { label: "Answered", cls: "bg-accent/12 text-accent", dot: "bg-accent" },
  partial: { label: "Partly answered", cls: "bg-amber/15 text-amber", dot: "bg-amber" },
  placeholder: { label: "To complete", cls: "bg-hue-gaps/12 text-hue-gaps", dot: "bg-hue-gaps" },
}

export function useReportModel(): ReportModel {
  const s = useStore()
  return useMemo(
    () => buildReportModel(s, actorUser()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.sources, s.documents, s.stakeholders, s.gaps, s.analysis, s.sites, s.connect, s.energy, s.group, s.interviews, s.collection, s.docReview, s.reportReview, s.closure, s.drafts, s.clientId, s.boundary, s.entities, s.reportingEntity],
  )
}

export function ReportView() {
  const view = useStore((s) => s.ui.reportView)
  const setUi = useStore((s) => s.setUi)
  const m = useReportModel()
  const doc = useMemo(() => buildTestReport(m), [m])
  const [busy, setBusy] = useState<string | null>(null)
  const dl = async (kind: "report" | "workbook", format: "docx" | "xlsx", slug: string) => {
    setBusy(kind)
    try {
      await downloadDeliverable(kind, format, slug)
    } finally {
      setBusy(null)
    }
  }
  const print = async () => {
    const { printReport } = await import("@/esgos/lib/exports/reportHtml")
    printReport(doc)
    useStore.getState().log("print test report", m.client.shortName, undefined, "Print or save as PDF")
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Eyebrow className="flex items-center gap-2">
            <FileText size={13} /> BRSR test report · Phase 3
          </Eyebrow>
          <h2 className="mt-1 text-xl font-medium tracking-tight">The report, and the data behind every number</h2>
          <p className="mt-1 text-sm text-muted">
            The full BRSR in SEBI&apos;s format, built from everything collected so far. Read it here, draft what is missing where you read it, and download it as Word, PDF or the Excel data workbook. All three are built from the same data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => dl("report", "docx", "brsr-test-report")} disabled={!!busy} aria-label="Download the test report as Word">
            <FileDown size={13} /> {busy === "report" ? "Building…" : "Word"}
          </Button>
          <Button size="sm" onClick={print} aria-label="Print or save the test report as PDF">
            <Printer size={13} /> PDF
          </Button>
          <Button size="sm" onClick={() => dl("workbook", "xlsx", "brsr-data-workbook")} disabled={!!busy} aria-label="Download the data workbook as Excel">
            <FileSpreadsheet size={13} /> {busy === "workbook" ? "Building…" : "Excel workbook"}
          </Button>
        </div>
      </div>
      <div role="tablist" aria-label="Report views" className="mt-5 inline-flex rounded-lg border border-line p-0.5 text-sm">
        {(
          [
            ["report", "Report", FileText],
            ["workbook", "Data workbook", Table2],
          ] as const
        ).map(([k, label, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setUi({ reportView: k })} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors", view === k ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      <div className="mt-5">{view === "workbook" ? <WorkbookView model={m} /> : <ReportDoc doc={doc} />}</div>
    </div>
  )
}

type Filter = "all" | "answered" | "partial" | "placeholder" | "core" | "drafted"

function ReportDoc({ doc }: { doc: TestReportDoc }) {
  const focus = useStore((s) => s.ui.reportFocus)
  const setUi = useStore((s) => s.setUi)
  const [filter, setFilter] = useState<Filter>("all")
  const scroller = useRef<HTMLDivElement>(null)
  const match = (q: ReportQuestion) => (filter === "all" ? true : filter === "core" ? q.core : filter === "drafted" ? q.drafted : q.answer.kind === filter)
  const count = (f: Filter) => doc.sections.flatMap((s) => s.groups.flatMap((g) => g.questions)).filter((q) => (f === "all" ? true : f === "core" ? q.core : f === "drafted" ? q.drafted : q.answer.kind === f)).length

  // Opened on a question (from Close gaps or review): scroll to it.
  useEffect(() => {
    if (!focus) return
    setFilter("all")
    const t = setTimeout(() => document.getElementById(`rq-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120)
    return () => clearTimeout(t)
  }, [focus])

  const t = doc.counts
  return (
    <div className="grid gap-6 xl:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label="Report contents" className="hidden xl:block">
        <div className="sticky top-0 max-h-[80vh] overflow-y-auto pr-1 text-xs scrollbar-thin">
          <a href="#rp-summary" className="block py-1 text-muted hover:text-fg">
            How complete
          </a>
          {doc.sections.map((s) => (
            <div key={s.id} className="mt-2">
              <a href={`#rp-${s.id}`} className="block py-1 font-medium hover:text-fg">
                {s.title.split(":")[0]}
              </a>
              {s.groups.map((g) => {
                const qs = g.questions
                const done = qs.filter((q) => q.answer.kind === "answered").length
                const part = qs.filter((q) => q.answer.kind === "partial").length
                return (
                  <a key={g.id} href={`#rg-${g.id}`} className="flex items-center gap-2 py-0.5 pl-2 text-muted hover:text-fg">
                    <span className="flex h-1 w-8 shrink-0 overflow-hidden rounded-full bg-hue-gaps/30">
                      <span className="bg-accent" style={{ width: `${(done / qs.length) * 100}%` }} />
                      <span className="bg-amber" style={{ width: `${(part / qs.length) * 100}%` }} />
                    </span>
                    <span className="truncate">{g.title.replace("Principle ", "P").replace(" · Essential indicators", " Essential").replace(" · Leadership indicators", " Leadership")}</span>
                  </a>
                )
              })}
            </div>
          ))}
          <a href="#rp-assumptions" className="mt-2 block py-1 text-muted hover:text-fg">
            Assumptions and limitations
          </a>
        </div>
      </nav>

      <div ref={scroller} className="min-w-0">
        {/* Cover */}
        <div className="overflow-hidden rounded-2xl border border-line-strong bg-surface">
          <div className="h-1 bg-gradient-to-r from-accent via-hue-connect to-hue-plan" />
          <div className="p-6 sm:p-8">
            <span className="inline-block rounded border border-hue-gaps px-2 py-0.5 text-[10.5px] font-medium tracking-[0.08em] text-hue-gaps">TEST REPORT · FOR INTERNAL REVIEW ONLY · NOT FOR PUBLICATION</span>
            <h3 className="mt-5 text-2xl font-medium tracking-tight sm:text-3xl">Business Responsibility and Sustainability Report</h3>
            <p className="mt-2 text-lg">{doc.meta.company}</p>
            <p className="text-sm text-muted">
              {doc.meta.fy} · {doc.meta.period}
            </p>
            <dl className="mt-6 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-[7rem_minmax(0,1fr)]">
              <dt className="text-faint">Status</dt>
              <dd>{doc.meta.status}</dd>
              <dt className="text-faint">Prepared</dt>
              <dd>
                {new Date(doc.meta.prepared).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} by {doc.meta.preparedBy}
              </dd>
              {doc.meta.cin && (
                <>
                  <dt className="text-faint">CIN</dt>
                  <dd className="font-mono">{doc.meta.cin}</dd>
                </>
              )}
              <dt className="text-faint">Boundary</dt>
              <dd>{doc.meta.boundary}</dd>
              <dt className="text-faint">Assurance</dt>
              <dd>Not assessed or assured. Not approved by the Board. Not for use in any offer document.</dd>
            </dl>
          </div>
        </div>

        {/* Summary */}
        <section id="rp-summary" className="mt-8 scroll-mt-4">
          <Eyebrow>How complete this report is</Eyebrow>
          <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-medium tracking-tight tabular-nums">{t.answered + t.partial}</span>
                <span className="text-sm text-muted">of {t.total} questions answered or partly answered</span>
              </div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-hue-gaps/25">
                <span className="bg-accent" style={{ width: `${(t.answered / t.total) * 100}%` }} />
                <span className="bg-amber" style={{ width: `${(t.partial / t.total) * 100}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                {(["answered", "partial", "placeholder"] as const).map((k) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", KIND[k].dot)} /> {t[k]} {KIND[k].label.toLowerCase()}
                  </span>
                ))}
              </div>
              <table className="mt-4 w-full text-xs">
                <tbody>
                  {doc.coverage.map((c) => {
                    const n = c.answered + c.partial + c.placeholder
                    return (
                      <tr key={c.id} className="border-b border-line">
                        <td className="w-24 py-1 text-muted">{c.label}</td>
                        <td className="py-1">
                          <div className="flex h-1.5 overflow-hidden rounded-full bg-hue-gaps/25">
                            <span className="bg-accent" style={{ width: `${(c.answered / n) * 100}%` }} />
                            <span className="bg-amber" style={{ width: `${(c.partial / n) * 100}%` }} />
                          </div>
                        </td>
                        <td className="w-16 py-1 text-right tabular-nums text-faint">
                          {c.answered + c.partial}/{n}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-5">
              {doc.keyNumbers.length > 0 && (
                <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
                  {doc.keyNumbers.map((k) => (
                    <div key={k.label} className="border-t-2 border-accent pt-2">
                      <div className="text-lg font-medium tabular-nums">
                        {k.value} <span className="text-[11px] font-normal text-faint">{k.unit}</span>
                      </div>
                      <div className="text-[11px] text-muted">
                        {k.label} · {k.ref}
                      </div>
                      {k.note && <div className="text-[10px] text-faint">{k.note}</div>}
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-line p-3 text-xs">
                <div className="font-medium">Review with data owners</div>
                <p className="mt-1 text-muted">
                  {doc.review.held} of {doc.review.sessions} sessions held, {doc.review.signedOff} signed off, {doc.review.openQueries} of {doc.review.queries} queries open.
                </p>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => setUi({ planTab: "review" })}>
                  Open the review
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <div className="sticky top-0 z-10 -mx-1 mt-8 flex flex-wrap gap-1.5 bg-bg/90 px-1 py-2 text-xs backdrop-blur" role="radiogroup" aria-label="Show questions">
          {(
            [
              ["all", "All"],
              ["answered", "Answered"],
              ["partial", "Partly"],
              ["placeholder", "To complete"],
              ["drafted", "Drafted"],
              ["core", "BRSR Core"],
            ] as [Filter, string][]
          ).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={filter === k} onClick={() => setFilter(k)} className={cn("rounded-md border px-2.5 py-1", filter === k ? "border-fg text-fg" : "border-line text-muted hover:text-fg")}>
              {l} <span className="text-faint">{count(k)}</span>
            </button>
          ))}
        </div>

        {doc.sections.map((s) => {
          const groups = s.groups.map((g) => ({ ...g, questions: g.questions.filter(match) })).filter((g) => g.questions.length)
          if (!groups.length) return null
          return (
            <section key={s.id} id={`rp-${s.id}`} className="mt-8 scroll-mt-14">
              <h3 className="border-b-2 border-fg pb-1.5 text-lg font-medium tracking-tight">{s.title}</h3>
              <p className="mt-1 text-xs text-muted">{s.intro}</p>
              {groups.map((g) => {
                const p = g.id.match(/^(P\d)/)?.[1]
                return (
                  <div key={g.id} id={`rg-${g.id}`} className="mt-6 scroll-mt-14">
                    <h4 className="text-sm font-medium">{g.title}</h4>
                    {p && <p className="text-[11px] italic text-faint">{principleName(p)}</p>}
                    <ol className="mt-3 space-y-3">
                      {g.questions.map((q) => (
                        <Question key={q.id} q={q} focused={focus === q.id} />
                      ))}
                    </ol>
                  </div>
                )
              })}
            </section>
          )
        })}

        <section id="rp-assumptions" className="mt-10 scroll-mt-14">
          <h3 className="border-b-2 border-fg pb-1.5 text-lg font-medium tracking-tight">Assumptions and limitations</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[11px] text-faint">
                  <th className="py-1.5 pr-3 font-medium">Area</th>
                  <th className="py-1.5 pr-3 font-medium">Assumption or limitation</th>
                  <th className="py-1.5 pr-3 font-medium">What removes it</th>
                  <th className="py-1.5 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody>
                {doc.assumptions.map((a, i) => (
                  <tr key={i} className="border-b border-line align-top">
                    <td className="py-1.5 pr-3 font-medium">{a.area}</td>
                    <td className="py-1.5 pr-3 text-muted">{a.assumption}</td>
                    <td className="py-1.5 pr-3 text-muted">{a.remove}</td>
                    <td className="py-1.5">{a.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function Question({ q, focused }: { q: ReportQuestion; focused: boolean }) {
  const [drafting, setDrafting] = useState(false)
  const a = q.answer
  const canDraft = !a.table || a.kind !== "answered"
  return (
    <li id={`rq-${q.id}`} className={cn("scroll-mt-20 rounded-xl border px-4 py-3", focused ? "border-hue-plan bg-hue-plan/[0.04]" : "border-line bg-surface/40")}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <span className="w-6 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-faint">{q.number}.</span>
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{q.text}</p>
      </div>
      <div className="ml-9 mt-1.5 flex flex-wrap items-center gap-1.5 text-[10.5px]">
        <span className={cn("rounded px-1.5 py-0.5 font-medium", KIND[a.kind].cls)}>{KIND[a.kind].label}</span>
        {q.core && <span className="rounded border border-line px-1.5 py-0.5 text-muted">BRSR Core</span>}
        {q.leadership && <span className="rounded border border-line px-1.5 py-0.5 text-muted">Leadership</span>}
        {q.drafted && <span className="rounded border border-hue-plan/50 px-1.5 py-0.5 text-hue-plan">Drafted</span>}
        {q.openQueries > 0 && (
          <span className="flex items-center gap-1 text-hue-gaps">
            <CircleAlert size={11} /> {q.openQueries} open quer{q.openQueries === 1 ? "y" : "ies"}
          </span>
        )}
        <span className="ml-auto font-mono text-faint">
          {q.id} · {q.session} · review {q.sessionStatus}
        </span>
      </div>
      <div className="ml-9 mt-2 space-y-2">
        {a.text && <p className={cn("whitespace-pre-line text-sm leading-relaxed", a.kind === "placeholder" ? "italic text-amber" : "text-fg/90")}>{a.text}</p>}
        {a.table && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr>
                  {a.table.head.map((h, i) => (
                    <th key={i} className={cn("bg-surface-3 px-2 py-1.5 text-left font-medium", i > 0 && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.table.rows.map((r, i) => (
                  <tr key={i} className="border-b border-line">
                    {r.map((c, j) => (
                      <td key={j} className={cn("px-2 py-1.5 align-top", j > 0 ? "text-right tabular-nums" : c.startsWith("  ") ? "pl-5 text-muted" : "", j === 2 && "text-muted")}>
                        {c.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(a.source || a.note) && <p className="text-[11px] text-faint">{[a.source && `Source: ${a.source}`, a.note].filter(Boolean).join(" · ")}</p>}
        {canDraft && (
          <div>
            <button type="button" onClick={() => setDrafting(!drafting)} aria-expanded={drafting} className="flex items-center gap-1 text-[11px] text-hue-plan hover:underline">
              <PenLine size={11} /> {q.drafted ? "Edit the drafted answer" : a.table ? "Add a narrative" : "Draft the answer"}
            </button>
            <AnimatePresence initial={false}>
              {drafting && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-2">
                    <DraftEditor id={q.id} ownerRole={q.owner} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </li>
  )
}
