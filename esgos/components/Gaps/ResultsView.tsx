"use client"

// Gap analysis results and recommendations: the Phase 1 deliverable as a page.
// Same model, section titles and numbers as the PowerPoint, so what is shown here
// is what gets presented. Every chart, cell and card opens the items behind it.

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check, Download, FileSearch, Layers, Loader2, MessagesSquare, Presentation, X } from "lucide-react"
import { useMemo, useState } from "react"
import { actorUser, useStore } from "@/esgos/lib/store"
import { goTo } from "@/esgos/lib/navigation"
import { buildReportModel } from "@/esgos/lib/exports/model"
import { AREAS, FOCI, FOCUS_LABEL, OUTCOME_LABEL, PRIORITIES, RATING_TEXT, STATUS_TEXT, buildGapReport, outlineEntry, type GapReport, type SectionId } from "@/esgos/lib/exports/gapReport"
import { downloadDeliverable } from "@/esgos/lib/exports/download"
import type { Priority, ReadinessItem, Status } from "@/esgos/lib/readiness/types"
import type { Rating } from "@/esgos/lib/interviews/plan"
import { Button, Eyebrow } from "../common/ui"
import { cn } from "../common/cn"
import { ItemRow } from "./ReadinessView"

const STATUS_BG: Record<Status, string> = { now: "bg-accent", sync: "bg-amber", open: "bg-hue-gaps" }
const STATUS_FG: Record<Status, string> = { now: "text-accent", sync: "text-amber", open: "text-hue-gaps" }
const STATUS_SOFT: Record<Status, string> = { now: "bg-accent/12 text-accent", sync: "bg-amber/15 text-amber", open: "bg-hue-gaps/12 text-hue-gaps" }
const PRIORITY_VAR: Record<Priority, string> = { "Before listing": "var(--hue-gaps)", "First BRSR year": "var(--amber)", "After listing": "var(--hue-seed)" }
const PRIORITY_FG: Record<Priority, string> = { "Before listing": "text-hue-gaps", "First BRSR year": "text-amber", "After listing": "text-hue-seed" }
const RATING_SOFT: Record<Rating, string> = { "in-place": "bg-accent/12 text-accent", partial: "bg-amber/15 text-amber", "not-in-place": "bg-hue-gaps/12 text-hue-gaps", na: "bg-surface-2 text-faint" }
const TONE_BG = { good: "bg-accent", warn: "bg-amber", bad: "bg-hue-gaps" } as const
const MS_VAR: Record<string, string> = { M1: "var(--hue-boundary)", M2: "var(--hue-connect)", M3: "var(--accent)", M4: "var(--hue-plan)", M5: "var(--hue-seed)" }

type Drill = { at: SectionId; label: string; items: ReadinessItem[] } | null

export function useGapReport(): GapReport {
  const s = useStore()
  return useMemo(
    () => buildGapReport(buildReportModel(s, actorUser())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.sources, s.documents, s.stakeholders, s.gaps, s.analysis, s.sites, s.connect, s.energy, s.group, s.interviews, s.collection, s.docReview, s.reportReview, s.closure, s.drafts, s.clientId, s.boundary, s.entities, s.reportingEntity],
  )
}

function StatusBar({ t, className }: { t: { now: number; sync: number; open: number }; className?: string }) {
  const total = t.now + t.sync + t.open
  return (
    <div className={cn("flex h-1.5 overflow-hidden rounded-full bg-surface-3", className)}>
      {total > 0 &&
        (["now", "sync", "open"] as Status[]).map((k) => (t[k] ? <span key={k} className={STATUS_BG[k]} style={{ width: `${(t[k] / total) * 100}%` }} /> : null))}
    </div>
  )
}

function Section({ g, id, children, aside }: { g: GapReport; id: SectionId; children: React.ReactNode; aside?: React.ReactNode }) {
  const o = outlineEntry(g, id)
  if (!o.n) return null
  return (
    <section id={`gr-${id}`} className="scroll-mt-14 border-t border-line pt-7" aria-labelledby={`gr-${id}-h`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <Eyebrow className="text-accent">
            {o.n} · {o.label}
          </Eyebrow>
          <h3 id={`gr-${id}-h`} className="mt-1.5 text-xl font-medium leading-snug tracking-tight">
            {o.title}
          </h3>
        </div>
        {aside}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function DrillList({ drill, at, onClose }: { drill: Drill; at: SectionId; onClose: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <AnimatePresence initial={false}>
      {drill && drill.at === at && (
        <motion.div key={drill.label} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-xl border border-line-strong bg-surface p-3">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div className="text-sm">
              <span className="font-medium">{drill.label}</span> <span className="text-muted">· {drill.items.length} item{drill.items.length === 1 ? "" : "s"}</span>
            </div>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-faint hover:bg-surface-2 hover:text-fg" aria-label="Close list">
              <X size={14} />
            </button>
          </div>
          <ul className="space-y-1.5">
            {drill.items.map((x) => (
              <ItemRow key={x.id} item={x} open={openId === x.id || drill.items.length === 1} onToggle={() => setOpenId(openId === x.id ? null : x.id)} />
            ))}
          </ul>
          {!drill.items.length && <p className="px-1 py-3 text-sm text-muted">Nothing here.</p>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ResultsView() {
  const g = useGapReport()
  const setUi = useStore((s) => s.setUi)
  const gapSiteFilter = useStore((s) => s.ui.gapSiteFilter)
  const [drill, setDrill] = useState<Drill>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const B = g.when["Before listing"]

  const open = (at: SectionId, label: string, items: ReadinessItem[]) => setDrill((d) => (d && d.at === at && d.label === label ? null : { at, label, items }))
  const close = () => setDrill(null)
  const isOpen = (at: SectionId, label: string) => drill?.at === at && drill.label === label

  const exportDeck = async () => {
    setBusy(true)
    setError(null)
    try {
      setSaved(await downloadDeliverable("gap", "pptx", "gap-analysis"))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the file.")
    } finally {
      setBusy(false)
    }
  }

  const jump = (id: SectionId) => document.getElementById(`gr-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <Eyebrow>Gap analysis · BRSR and ISSB S1/S2</Eyebrow>
          <h2 className="mt-1 text-2xl font-medium tracking-tight">Gap analysis results and recommendations</h2>
          <p className="mt-1 text-sm text-muted">
            {g.legalName} · {g.fy} · {g.date} · prepared by {g.preparedBy}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Button variant="primary" size="md" onClick={exportDeck} disabled={busy} aria-label="Download the gap analysis as PowerPoint">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {busy ? "Building…" : "Download PowerPoint"}
          </Button>
          {saved ? (
            <span className="flex items-center gap-1 text-[11px] text-accent">
              <Check size={11} /> {saved}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-faint">
              <Presentation size={11} /> Same sections and numbers as this page
            </span>
          )}
          {error && <span className="text-[11px] text-hue-gaps">{error}</span>}
        </div>
      </div>

      {/* Section nav */}
      <nav aria-label="Sections" className="sticky -top-4 z-10 -mx-1 mt-5 flex gap-1 overflow-x-auto bg-bg/90 px-1 py-2 backdrop-blur sm:-top-8">
        {g.outline.map((o) => (
          <button key={o.id} type="button" onClick={() => jump(o.id)} className="shrink-0 rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:border-line-strong hover:text-fg">
            <span className="font-mono text-[10px] text-faint">{o.n}</span> {o.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 space-y-10">
        {/* 01 Executive summary */}
        <Section g={g} id="summary">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div>
              <p className="text-[15px] leading-relaxed">{g.headline}</p>
              <ul className="mt-5 space-y-4">
                {g.messages.map((m) => (
                  <li key={m.title} className="flex gap-3">
                    <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", TONE_BG[m.tone])} aria-hidden />
                    <div>
                      <div className="text-sm font-medium">{m.title}</div>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">{m.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              {(
                [
                  [g.stats.brsrNow, `/${g.stats.brsrTotal}`, "BRSR questions in place today", g.stats.brsrNow / g.stats.brsrTotal, "bg-accent", "text-accent", () => setUi({ gapsTab: "brsr" })],
                  [g.stats.coreReady, `/${g.stats.coreTotal}`, "BRSR Core KPIs traceable to source", g.stats.coreReady / Math.max(1, g.stats.coreTotal), g.stats.coreReady === g.stats.coreTotal ? "bg-accent" : "bg-hue-gaps", g.stats.coreReady === g.stats.coreTotal ? "text-accent" : "text-hue-gaps", () => jump("core")],
                  [g.stats.byPriority["Before listing"], "", `to close ${B}, of ${g.stats.openTotal} gaps`, g.stats.byPriority["Before listing"] / Math.max(1, g.stats.openTotal), "bg-hue-gaps", "text-hue-gaps", () => open("summary", `Gaps to close ${B}`, g.beforeListing)],
                ] as const
              ).map(([big, small, label, share, bar, fg, onClick]) => (
                <button key={label} type="button" onClick={onClick} className="block w-full rounded-xl border border-line bg-surface/60 p-4 text-left transition-colors hover:border-line-strong">
                  <div className="flex items-baseline gap-0.5">
                    <span className={cn("text-4xl font-medium tracking-tight tnum", fg)}>{big}</span>
                    <span className="text-lg font-medium text-faint">{small}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted">{label}</div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3">
                    <div className={cn("h-full", bar)} style={{ width: `${Math.min(100, share * 100)}%` }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
          <DrillList drill={drill} at="summary" onClose={close} />
        </Section>

        {/* 02 Scope */}
        <Section g={g} id="scope">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {g.scope.cards.map((c) => (
              <div key={c.label} className="rounded-xl border border-line bg-surface/60 p-4">
                <Eyebrow>{c.label}</Eyebrow>
                <div className="mt-1.5 text-2xl font-medium tracking-tight">{c.value}</div>
                <p className="mt-2 text-xs leading-relaxed text-muted">{c.detail}</p>
              </div>
            ))}
          </div>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {g.scope.method.map((m, i) => (
              <li key={m.title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fg text-[11px] font-medium text-bg">{i + 1}</span>
                <div>
                  <div className="text-sm font-medium">{m.title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{m.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* Document review */}
        <Section
          g={g}
          id="documents"
          aside={
            <Button size="sm" variant="secondary" onClick={() => setUi({ gapsTab: "documents" })}>
              <FileSearch size={13} /> Open document review
            </Button>
          }
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <div className="text-2xl font-medium tracking-tight tnum">
                    {g.documents.reviewed}
                    <span className="text-sm text-faint">/{g.documents.total}</span>
                  </div>
                  <div className="text-[11px] text-muted">reviewed</div>
                </div>
                {(["adequate", "partial", "inadequate", "missing"] as const).map((o) => (
                  <div key={o}>
                    <div className={cn("text-2xl font-medium tracking-tight tnum", o === "adequate" ? "text-accent" : o === "partial" ? "text-amber" : o === "inadequate" ? "text-hue-gaps" : "text-muted")}>{g.documents.byOutcome[o]}</div>
                    <div className="text-[11px] text-muted">{OUTCOME_LABEL[o].toLowerCase()}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-6 gap-1.5">
                {g.documents.coverage.map((c) => (
                  <div key={c.area} className={cn("rounded-md border p-2 text-center", !c.reviewed ? "border-dashed border-line" : c.gaps ? "border-amber/40 bg-amber/[0.06]" : "border-accent/40 bg-accent/[0.06]")} title={`${c.area}: ${c.reviewed} of ${c.expected} reviewed, ${c.adequate} adequate`}>
                    <div className="font-mono text-[11px] font-medium">{c.area}</div>
                    <div className="text-[11px] text-muted tnum">
                      {c.reviewed}/{c.expected}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-faint">Coverage of BRSR areas by the documents reviewed.</p>
            </div>
            <div>
              <Eyebrow>{g.documents.shortfalls.length ? "Where the documents fall short" : "What the review covers"}</Eyebrow>
              {g.documents.shortfalls.length ? (
                <ul className="mt-2 space-y-2">
                  {g.documents.shortfalls.slice(0, 6).map((f, i) => (
                    <li key={i} className="rounded-lg border border-line bg-surface/60 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", f.outcome === "partial" ? "bg-amber/15 text-amber" : f.outcome === "inadequate" ? "bg-hue-gaps/12 text-hue-gaps" : "bg-surface-3 text-muted")}>{OUTCOME_LABEL[f.outcome]}</span>
                        <span className="text-xs font-medium">
                          {f.title}
                          {f.site ? ` · ${f.site}` : ""}
                        </span>
                      </div>
                      {f.notes && <p className="mt-1 text-xs text-muted">{f.notes}</p>}
                      <p className="mt-1 text-xs">
                        <ArrowRight size={11} className="mr-1 inline text-accent" />
                        {f.recommendation}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {g.documents.byCategory.map((c) => (
                    <li key={c.category} className="flex justify-between gap-3">
                      <span>{c.category}</span>
                      <span className="text-muted tnum">
                        {c.reviewed}/{c.total}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>

        {/* 03 Readiness */}
        <Section g={g} id="readiness" aside={<Legend />}>
          <div className="space-y-1.5">
            {g.sections.map((sec) => {
              const max = Math.max(...g.sections.map((x) => x.tally.total))
              const label = `${sec.id} · ${sec.title}`
              return (
                <button key={sec.id} type="button" onClick={() => open("readiness", label, sec.items)} aria-pressed={isOpen("readiness", label)} className={cn("grid w-full grid-cols-[minmax(140px,220px)_1fr_auto] items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-2", isOpen("readiness", label) && "bg-surface-2")}>
                  <span className="truncate text-xs text-muted">
                    <span className="font-mono text-faint">{sec.id}</span> {sec.title}
                  </span>
                  <span className="flex h-5 overflow-hidden rounded" style={{ width: `${(sec.tally.total / max) * 100}%` }}>
                    {(["now", "sync", "open"] as Status[]).map((k) =>
                      sec.tally[k] ? (
                        <span key={k} className={cn("flex items-center justify-center text-[10px] font-medium text-white", STATUS_BG[k])} style={{ width: `${(sec.tally[k] / sec.tally.total) * 100}%` }}>
                          {sec.tally[k]}
                        </span>
                      ) : null,
                    )}
                  </span>
                  <span className="w-14 text-right text-xs text-faint tnum">
                    {sec.tally.now}/{sec.tally.total}
                  </span>
                </button>
              )
            })}
          </div>
          <DrillList drill={drill} at="readiness" onClose={close} />
        </Section>

        {/* 04 Heatmap */}
        <Section g={g} id="heatmap">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th />
                  {PRIORITIES.map((p) => (
                    <th key={p} className={cn("px-2 pb-1 text-center text-xs font-medium", PRIORITY_FG[p])}>
                      {g.priorityLabel[p]}
                    </th>
                  ))}
                  <th className="px-2 pb-1 text-center text-xs font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {g.heatmap.rows.map((r) => (
                  <tr key={r.category}>
                    <td className="pr-3 text-xs text-muted">{r.category}</td>
                    {r.cells.map((v, i) => {
                      const p = PRIORITIES[i]
                      const label = `${r.category} · ${g.priorityLabel[p]}`
                      const items = itemsFor(g, r.category, p)
                      return (
                        <td key={p} className="p-0">
                          <button
                            type="button"
                            disabled={!v}
                            onClick={() => open("heatmap", label, items)}
                            aria-pressed={isOpen("heatmap", label)}
                            aria-label={`${label}: ${v}`}
                            className={cn("h-11 w-full rounded-md text-base font-medium tnum transition-shadow disabled:cursor-default", v ? "hover:ring-2 hover:ring-line-strong" : "bg-surface-2 text-faint", isOpen("heatmap", label) && "ring-2 ring-fg")}
                            style={v ? { background: `color-mix(in oklab, ${PRIORITY_VAR[p]} ${18 + 62 * Math.min(1, v / g.heatmap.max)}%, transparent)`, color: v / g.heatmap.max > 0.45 ? "white" : PRIORITY_VAR[p] } : undefined}
                          >
                            {v || "–"}
                          </button>
                        </td>
                      )
                    })}
                    <td className="rounded-md bg-surface-2 text-center font-medium tnum">{r.total}</td>
                  </tr>
                ))}
                <tr>
                  <td className="pr-3 text-xs font-medium">Total</td>
                  {g.heatmap.totals.map((v, i) => (
                    <td key={i} className="h-11 rounded-md text-center font-medium text-white tnum" style={{ background: PRIORITY_VAR[PRIORITIES[i]] }}>
                      {v}
                    </td>
                  ))}
                  <td className="rounded-md bg-fg text-center font-medium text-bg tnum">{g.stats.openTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <DrillList drill={drill} at="heatmap" onClose={close} />
        </Section>

        {/* 05 Themes */}
        <Section g={g} id="themes">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {g.themes.map((t) => {
              const label = `${t.n}. ${t.title}`
              return (
                <button key={t.id} type="button" onClick={() => open("themes", label, t.open)} aria-pressed={isOpen("themes", label)} className={cn("flex flex-col rounded-xl border bg-surface/60 p-4 text-left transition-colors hover:border-line-strong", isOpen("themes", label) ? "border-fg" : "border-line")}>
                  <div className="flex items-start gap-2.5">
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium", t.before ? "bg-hue-gaps text-white" : t.open.length ? "bg-fg text-bg" : "bg-accent text-white")}>{t.n}</span>
                    <span className="text-sm font-medium leading-snug">{t.title}</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-2xl font-medium tracking-tight tnum">{t.tally.total - t.tally.now}</span>
                    <span className="text-xs text-muted">of {t.tally.total} not in place</span>
                  </div>
                  <StatusBar t={t.tally} className="mt-2" />
                  <span className={cn("mt-3 self-start rounded-full px-2 py-0.5 text-[10px] font-medium", t.before ? "bg-hue-gaps/12 text-hue-gaps" : t.open.length ? "bg-hue-seed/12 text-hue-seed" : "bg-accent/12 text-accent")}>{t.before ? `${t.before} ${B}` : t.open.length ? "Not urgent" : "In place"}</span>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{t.finding}</p>
                </button>
              )
            })}
          </div>
          <DrillList drill={drill} at="themes" onClose={close} />
        </Section>

        {/* 06 Priority gaps */}
        <Section
          g={g}
          id="priority"
          aside={
            <Button size="sm" variant="secondary" onClick={() => open("priority", `All gaps to close ${B}`, g.beforeListing)}>
              <Layers size={13} /> All {g.beforeListing.length}
            </Button>
          }
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {g.top.map((x, i) => (
              <button key={x.id} type="button" onClick={() => open("priority", `${x.id} · ${x.title}`, [x])} aria-pressed={isOpen("priority", `${x.id} · ${x.title}`)} className={cn("flex flex-col rounded-xl border bg-surface/60 p-4 text-left transition-colors hover:border-line-strong", isOpen("priority", `${x.id} · ${x.title}`) ? "border-fg" : "border-line")}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-hue-gaps text-[10px] font-medium text-white">{i + 1}</span>
                  <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">{x.id}</span>
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", x.core ? "bg-accent/12 text-accent" : "bg-surface-3 text-muted")}>{x.category}</span>
                </div>
                <div className="mt-2.5 text-sm font-medium leading-snug">{x.title}</div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  <span className="font-medium text-fg">Today</span> {x.gap || x.how}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed">
                  <span className="font-medium text-accent">Action</span> {x.recommendation}
                </p>
                <p className="mt-auto pt-3 text-[11px] text-faint">
                  {x.owner.person ? `${x.owner.person} · ` : ""}
                  {x.owner.role} · about {x.weeks} weeks
                </p>
              </button>
            ))}
          </div>
          <DrillList drill={drill} at="priority" onClose={close} />
        </Section>

        {/* 07 BRSR Core */}
        <Section g={g} id="core">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.core.attributes.map((a) => {
              const label = `Attribute ${a.n} · ${a.name}`
              return (
                <button key={a.n} type="button" onClick={() => open("core", label, a.items)} aria-pressed={isOpen("core", label)} className={cn("rounded-xl border p-4 text-left transition-colors hover:border-line-strong", isOpen("core", label) ? "border-fg" : "border-line", a.status === "now" ? "bg-accent/[0.05]" : a.status === "sync" ? "bg-amber/[0.06]" : "bg-hue-gaps/[0.05]")}>
                  <div className="flex items-center justify-between gap-2">
                    <Eyebrow>Attribute {a.n}</Eyebrow>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_SOFT[a.status])}>{STATUS_TEXT[a.status]}</span>
                  </div>
                  <div className="mt-1.5 text-sm font-medium">{a.name}</div>
                  <div className="mt-1 font-mono text-[10px] text-faint">{a.items.map((x) => x.id).join(" · ")}</div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{a.note}</p>
                </button>
              )
            })}
          </div>
          <DrillList drill={drill} at="core" onClose={close} />
        </Section>

        {/* 08 Plants */}
        <Section g={g} id="plants" aside={<Legend />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] text-faint">
                  <th className="py-2 pr-3 font-medium">Plant</th>
                  <th className="px-2 py-2 text-center font-medium">Energy readings</th>
                  {AREAS.map((a) => (
                    <th key={a.id} className="px-1 py-2 text-center font-medium">
                      {a.label}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center font-medium">Interview</th>
                  <th className="py-2 pl-2 text-right font-medium">Open gaps</th>
                </tr>
              </thead>
              <tbody>
                {g.plants.map((p) => {
                  const active = gapSiteFilter === p.id
                  return (
                    <tr key={p.id} onClick={() => setUi({ gapSiteFilter: active ? null : p.id, showAllGaps: true })} className={cn("cursor-pointer border-b border-line transition-colors hover:bg-surface-2", active && "bg-surface-2")} aria-selected={active}>
                      <td className="py-2 pr-3">{p.name}</td>
                      <td className={cn("px-2 py-2 text-center text-xs font-medium tnum", p.readings === null ? "text-faint" : p.readings >= 90 ? "text-accent" : p.readings >= 50 ? "text-amber" : "text-hue-gaps")}>{p.readings === null ? "No data" : `${p.readings}%`}</td>
                      {AREAS.map((a) => (
                        <td key={a.id} className="px-1 py-1.5 text-center">
                          <span title={p.areas[a.id].note} className={cn("inline-block w-full rounded px-1.5 py-1 text-[10px] font-medium", STATUS_SOFT[p.areas[a.id].status])}>
                            {STATUS_TEXT[p.areas[a.id].status]}
                          </span>
                        </td>
                      ))}
                      <td className={cn("px-2 py-2 text-center text-xs", p.interview === "done" ? "text-accent" : "text-muted")}>{p.interview === "done" ? "Done" : p.interview === "planned" ? "Planned" : "—"}</td>
                      <td className="py-2 pl-2 text-right font-medium tnum">{p.gaps}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-faint">{g.plantsNote} Select a plant to list its gaps in the side panel; hover a cell for the detail.</p>
        </Section>

        {/* 09 Interviews */}
        <Section
          g={g}
          id="interviews"
          aside={
            <Button size="sm" variant="secondary" onClick={() => setUi({ gapsTab: "interviews" })}>
              <MessagesSquare size={13} /> Open interviews
            </Button>
          }
        >
          {g.interviews.done ? (
            <div className="space-y-6">
              <div className="max-w-3xl">
                <p className="text-sm">
                  <span className="font-medium">{g.interviews.answers} answers</span> <span className="text-muted">· {g.interviews.inPlace} in place · {g.interviews.partial} partly · {g.interviews.notInPlace} not in place</span>
                </p>
                <StatusBar t={{ now: g.interviews.inPlace, sync: g.interviews.partial, open: g.interviews.notInPlace }} className="mt-2 h-2" />
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[440px] text-xs">
                    <thead>
                      <tr className="text-faint">
                        <th className="py-1.5 pr-2 text-left font-medium">Interview</th>
                        {FOCI.map((f) => (
                          <th key={f} className="px-1 py-1.5 text-center font-medium">
                            {FOCUS_LABEL[f]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {g.interviews.rows
                        .filter((r) => r.status === "done")
                        .map((r) => (
                          <tr key={r.id}>
                            <td className="py-1 pr-2">{r.title}</td>
                            {FOCI.map((f) => {
                              const c = r.cells[f]
                              return (
                                <td key={f} className="px-1 py-1 text-center">
                                  <span className={cn("inline-block w-full rounded px-1 py-1 text-[10px] font-medium", c.rating ? RATING_SOFT[c.rating] : "bg-surface-2 text-faint")}>{c.rating ? RATING_TEXT[c.rating] : c.total ? "Not asked" : "—"}</span>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-faint">Worst answer per focus area. {g.interviews.planned - g.interviews.done} interviews not held yet.</p>
              </div>
              <div>
                <Eyebrow>What we heard, and what to do</Eyebrow>
                <ul className="mt-2 grid gap-2 xl:grid-cols-2">
                  {g.interviews.issues.slice(0, 6).map((x, i) => (
                    <li key={i} className="rounded-lg border border-line bg-surface/60 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", RATING_SOFT[x.rating])}>{RATING_TEXT[x.rating]}</span>
                        <span className="text-xs font-medium">{x.who}</span>
                        <span className="text-[11px] text-faint">{FOCUS_LABEL[x.focus]}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted">{x.text}</p>
                      <p className="mt-1 text-xs">
                        <ArrowRight size={11} className="mr-1 inline text-accent" />
                        {x.recommendation}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">
              {g.interviews.planned} interviews are planned across corporate functions and every plant. They confirm governance and accountability, how policy is practised, data systems and controls, and what data exists. Findings feed this page as they are recorded.
            </p>
          )}
        </Section>

        {/* 10 ISSB */}
        <Section g={g} id="issb">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent" /> Covered by BRSR</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber" /> Partly covered</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-hue-gaps" /> Not covered</span>
              </div>
              {g.issb.pillars.map((p) => {
                const max = Math.max(...g.issb.pillars.map((x) => x.items.length))
                const label = `ISSB · ${p.name}`
                return (
                  <button key={p.name} type="button" onClick={() => open("issb", label, p.items)} aria-pressed={isOpen("issb", label)} className={cn("grid w-full grid-cols-[150px_1fr] items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-surface-2", isOpen("issb", label) && "bg-surface-2")}>
                    <span className="truncate text-xs text-muted">{p.name}</span>
                    <span className="flex h-5 overflow-hidden rounded" style={{ width: `${(p.items.length / max) * 100}%` }}>
                      {(
                        [
                          [p.covered, "bg-accent"],
                          [p.partial, "bg-amber"],
                          [p.not, "bg-hue-gaps"],
                        ] as const
                      ).map(([v, c], i) =>
                        v ? (
                          <span key={i} className={cn("flex items-center justify-center text-[10px] font-medium text-white", c)} style={{ width: `${(v / p.items.length) * 100}%` }}>
                            {v}
                          </span>
                        ) : null,
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
            <div>
              <Eyebrow>Not covered by BRSR: the largest gaps</Eyebrow>
              <ul className="mt-2 space-y-2">
                {g.issb.beyond.slice(0, 5).map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => open("issb", `${x.id} · ${x.title}`, [x])} className="w-full rounded-lg border border-line bg-surface/60 p-3 text-left hover:border-line-strong">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-snug">{x.title}</span>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", x.priority === "After listing" ? "bg-hue-seed/12 text-hue-seed" : "bg-amber/15 text-amber")}>{g.priorityLabel[x.priority]}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">
                        {x.ref} · {x.gap}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DrillList drill={drill} at="issb" onClose={close} />
        </Section>

        {/* 11 Peer */}
        {g.peer && (
          <Section g={g} id="peer">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] text-faint">
                      <th className="py-2 pr-3 font-medium">Metric</th>
                      <th className="py-2 pr-3 text-right font-medium">
                        {g.peer.short} · filed {g.peer.fy}
                      </th>
                      <th className="py-2 pr-3 text-right font-medium">
                        {g.clientShort} at {g.peer.short}&apos;s intensity
                      </th>
                      <th className="py-2 text-right font-medium">{g.clientShort} · its own data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.peer.rows.map((r) => (
                      <tr key={r.id} className="border-b border-line">
                        <td className="py-2 pr-3">{r.label}</td>
                        <td className="py-2 pr-3 text-right font-medium tnum">{fmt(r.peer, r.unit)}</td>
                        <td className="py-2 pr-3 text-right italic text-muted tnum">{r.scaled !== undefined ? fmt(r.scaled, r.unit) : <span className="not-italic text-faint">Not scaled</span>}</td>
                        <td className="py-2 text-right tnum" title={r.ours?.basis}>
                          {r.ours ? (
                            <span className="font-medium">
                              {fmt(r.ours.value, r.ours.unit)}
                              {r.ours.estimate ? " *" : ""}
                            </span>
                          ) : (
                            <span className="text-faint">Not shared yet</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-line bg-surface/60 p-4">
                  <div className="text-2xl font-medium">{g.peer.plants ?? "—"} plants</div>
                  <p className="mt-1 text-xs text-muted">
                    {g.peer.short}&apos;s filed boundary; assurance: {g.peer.assurance.toLowerCase()}.
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-faint">{g.peer.note} * Includes estimates; hover a value for its basis.</p>
              </div>
            </div>
          </Section>
        )}

        {/* 12 Recommendations */}
        <Section g={g} id="recommendations">
          <div className="grid gap-3 lg:grid-cols-2">
            {g.recommendations.slice(0, 8).map((r) => {
              const t = g.themes.find((x) => x.id === r.theme)!
              const label = `${r.n}. ${r.title}`
              return (
                <button key={r.theme} type="button" onClick={() => open("recommendations", label, t.open)} aria-pressed={isOpen("recommendations", label)} className={cn("flex gap-3 rounded-xl border bg-surface/60 p-4 text-left transition-colors hover:border-line-strong", isOpen("recommendations", label) ? "border-fg" : "border-line")}>
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white", r.before ? "bg-hue-gaps" : "bg-hue-seed")}>{r.n}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{r.title}</div>
                    <p className="mt-1 text-xs leading-relaxed">{r.action}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-faint">
                      <span className={cn("rounded-full px-2 py-0.5 font-medium", r.before ? "bg-hue-gaps/12 text-hue-gaps" : "bg-hue-seed/12 text-hue-seed")}>{r.before ? `${r.before} ${B}` : `${r.items} items`}</span>
                      {r.owner} · {r.when}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <DrillList drill={drill} at="recommendations" onClose={close} />
        </Section>

        {/* How the gaps close */}
        {g.closing.open > 0 && (
          <Section
            g={g}
            id="closing"
            aside={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setUi({ planTab: "closure" })
                  goTo("plan")
                }}
              >
                Open Close gaps <ArrowRight size={13} />
              </Button>
            }
          >
            <ol className="grid gap-2 sm:grid-cols-5">
              {g.closing.loop.map((st, i) => (
                <li key={st.title} className={cn("rounded-xl border p-3", i === 1 ? "border-hue-plan/50 bg-hue-plan/[0.06]" : "border-line bg-surface/60")}>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] text-white", i === 1 ? "bg-hue-plan" : "bg-fg/70")}>{i + 1}</span>
                    {st.title}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{st.text}</p>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-hue-plan">↺ Still open after a closed month or the review? It goes back to its owner at step 2.</p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] text-faint">
                    <th className="py-2 pr-3 font-medium">Route</th>
                    <th className="py-2 pr-3 text-right font-medium">Open</th>
                    <th className="py-2 pr-3 font-medium">Loops back to</th>
                    <th className="py-2 pr-3 font-medium">Closes when</th>
                    <th className="py-2 font-medium">Verified by</th>
                  </tr>
                </thead>
                <tbody>
                  {g.closing.routes.map((r) => (
                    <tr key={r.id} className="border-b border-line align-top">
                      <td className="py-2 pr-3 font-medium">{r.label}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {r.open}
                        {r.before > 0 && <span className="block text-[11px] text-hue-gaps">{r.before} {B}</span>}
                      </td>
                      <td className="py-2 pr-3 text-muted">{r.loop.charAt(0).toUpperCase() + r.loop.slice(1)}</td>
                      <td className="py-2 pr-3 text-xs">{r.closesWhen}</td>
                      <td className="py-2 text-xs text-muted">{r.verifiedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {g.closing.follows > 0 && <p className="mt-1.5 text-[11px] text-faint">Plus {g.closing.follows} ISSB requirement{g.closing.follows === 1 ? "" : "s"} BRSR already covers, closing with the BRSR items {g.closing.follows === 1 ? "it maps" : "they map"} to.</p>}
            </div>
            {g.closing.data.open > 0 && (
              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      [g.closing.data.monthly, "Monthly collection", "In the templates already"],
                      [new Set(g.closing.data.add.flatMap((x) => x.items)).size, "Add a metric", "Templates lack it"],
                      [g.closing.data.annual.items.length, "Company data", "Financial statements"],
                      [g.closing.data.requests.count, "Data request", "From the owner"],
                    ] as [number, string, string][]
                  ).map(([v, l, d]) => (
                    <div key={l} className="rounded-xl border border-line bg-surface/60 p-3">
                      <div className="text-2xl font-medium tabular-nums">{v}</div>
                      <div className="text-xs">{l}</div>
                      <div className="text-[11px] text-faint">{d}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 text-sm">
                  {g.closing.data.add.length > 0 && (
                    <div>
                      <Eyebrow>Add to the monthly templates</Eyebrow>
                      <ul className="mt-2 space-y-1.5">
                        {g.closing.data.add.map((a) => (
                          <li key={a.why}>
                            <span className="font-medium">{a.metrics.charAt(0).toUpperCase() + a.metrics.slice(1)}</span>
                            <span className="block text-xs text-muted">
                              {a.why} Closes {a.items.join(", ")}.
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {g.closing.data.annual.items.length > 0 && (
                    <div>
                      <Eyebrow>Company data, once a year</Eyebrow>
                      <p className="mt-1.5 text-xs text-muted">
                        {g.closing.data.annual.items.join(", ")}
                        {g.closing.data.annual.fields.length ? `: ${g.closing.data.annual.fields.join("; ")}, from the audited financial statements.` : ": entered; awaiting approval."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="mt-5">
              <Eyebrow>Cadence</Eyebrow>
              <ul className="mt-2 space-y-1 text-xs text-muted">
                {g.closing.cadence.map((c) => (
                  <li key={c}>· {c}</li>
                ))}
              </ul>
            </div>
          </Section>
        )}

        {/* Plants and corporate oversight */}
        <Section g={g} id="standardise">
          <div className="grid gap-3 lg:grid-cols-2">
            {(
              [
                [`The same at every plant (${g.plants.length})`, g.standardise.plants, "var(--hue-plan)"],
                ["Oversight from corporate", g.standardise.corporate, "var(--hue-boundary)"],
              ] as const
            ).map(([label, list, color]) => (
              <div key={label} className="rounded-xl border border-line bg-surface/60 p-4">
                <div className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em]" style={{ color }}>
                  {label}
                </div>
                <ol className="mt-3 space-y-2.5">
                  {list.map((t, i) => (
                    <li key={i} className="flex gap-2.5 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white" style={{ background: color }}>
                        {i + 1}
                      </span>
                      {t}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Section>

        {/* 13 Roadmap */}
        <Section
          g={g}
          id="roadmap"
          aside={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setUi({ planTab: "roadmap" })
                goTo("plan")
              }}
            >
              Open the roadmap <ArrowRight size={13} />
            </Button>
          }
        >
          <div className="space-y-2">
            {g.roadmap.map((m) => {
              const horizon = Math.max(...g.roadmap.map((x) => x.end))
              const label = `${m.id} · ${m.title}`
              return (
                <button key={m.id} type="button" onClick={() => open("roadmap", label, m.list)} aria-pressed={isOpen("roadmap", label)} className={cn("grid w-full grid-cols-[minmax(150px,240px)_1fr] items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-2", isOpen("roadmap", label) && "bg-surface-2")}>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      <span className="font-mono text-xs" style={{ color: MS_VAR[m.id] }}>
                        {m.id}
                      </span>{" "}
                      {m.title}
                    </span>
                    <span className="block truncate text-[11px] text-faint">{m.outcome}</span>
                  </span>
                  <span className="relative h-8">
                    <span className="absolute inset-y-0 rounded-md" style={{ left: `${(m.start / horizon) * 100}%`, width: `${((m.end - m.start) / horizon) * 100}%`, background: MS_VAR[m.id] }} />
                    {m.end / horizon < 0.6 ? (
                      <span className="absolute inset-y-0 flex items-center whitespace-nowrap text-[11px] text-muted" style={{ left: `calc(${(m.end / horizon) * 100}% + 8px)` }}>
                        {m.from} – {m.to} · {m.items} items{m.before ? ` · ${m.before} ${B}` : ""}
                      </span>
                    ) : (
                      <span className="absolute inset-y-0 flex items-center overflow-hidden whitespace-nowrap px-2 text-[11px] font-medium text-white" style={{ left: `${(m.start / horizon) * 100}%`, width: `${((m.end - m.start) / horizon) * 100}%` }}>
                        {m.from} – {m.to} · {m.items} items{m.before ? ` · ${m.before} ${B}` : ""}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          <DrillList drill={drill} at="roadmap" onClose={close} />
        </Section>

        {/* 14 Decisions */}
        <Section g={g} id="decisions">
          <div className="grid gap-6 rounded-2xl bg-[#0b0f17] p-6 text-white lg:grid-cols-2">
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/50">Decisions needed</div>
              <ol className="mt-3 space-y-3">
                {g.decisions.map((d, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5ad2a4] text-[11px] font-medium text-[#0b0f17]">{i + 1}</span>
                    {d}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/50">Next 90 days</div>
              <ol className="mt-3 space-y-3 border-l border-white/15 pl-4">
                {g.nextSteps.map((n) => (
                  <li key={n.when} className="text-sm">
                    <div className="text-xs font-medium text-[#5ad2a4]">{n.when}</div>
                    <div className="mt-0.5">{n.text}</div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}

function itemsFor(g: GapReport, category: string, p: Priority) {
  const all = g.themes.flatMap((t) => t.open)
  return all.filter((x) => x.category === category && x.priority === p).sort((a, b) => b.score - a.score)
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-muted">
      {(["now", "sync", "open"] as Status[]).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-sm", STATUS_BG[k])} /> <span className={STATUS_FG[k]}>{STATUS_TEXT[k]}</span>
        </span>
      ))}
    </div>
  )
}

function fmt(v: number, unit: string) {
  if (unit === "%") return `${v.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`
  if (unit === "₹ cr") return `₹${Math.round(v).toLocaleString("en-IN")} cr`
  return `${v.toLocaleString("en-IN", { maximumFractionDigits: v < 10 ? 2 : 0 })} ${unit}`
}
