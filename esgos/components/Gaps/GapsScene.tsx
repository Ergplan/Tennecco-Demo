"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Bot, Check, FileSearch, FileText, Globe2, Grid3x3, Landmark, ListChecks, MessagesSquare, Presentation, RefreshCw, Wrench } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { ANALYSIS_STEPS, runAnalysis } from "@/esgos/lib/pipelines"
import { goTo } from "@/esgos/lib/navigation"
import { featuredGaps, inputLabel, GAP_RULES_VERSION } from "@/esgos/lib/gapEngine"
import { INDICATORS, INDICATOR_BY_ID, PRINCIPLE_LABELS, indicatorRef, type Principle } from "@/esgos/lib/indicators"
import { countValue } from "@/esgos/lib/derived"
import { profileOrder } from "@/esgos/lib/selectors"
import type { Gap, GapResolution, IndicatorResult, IndicatorStatus } from "@/esgos/lib/types"
import { AgentLine } from "../common/AgentLine"
import { Button, Count, Eyebrow, SceneLayout } from "../common/ui"
import { Value } from "../common/Value"
import { SiteVisual } from "../Factory/SiteVisual"
import { cn } from "../common/cn"
import { filedDp, filedMetrics } from "@/esgos/lib/filed"
import { ownerPerson } from "@/esgos/lib/org"
import { PRINCIPLE_ICON } from "../common/icons"
import { BrsrReadiness, IssbReadiness, useReadiness } from "./ReadinessView"
import { InterviewsView } from "./InterviewsView"
import { ResultsView } from "./ResultsView"
import { DocumentsView } from "./DocumentsView"
import { getClient } from "@/esgos/lib/clients"
import type { UiState } from "@/esgos/lib/store"

const TABS: { key: UiState["gapsTab"]; label: string; icon: typeof Bot }[] = [
  { key: "results", label: "Results", icon: Presentation },
  { key: "coverage", label: "Data coverage", icon: Grid3x3 },
  { key: "documents", label: "Documents", icon: FileSearch },
  { key: "brsr", label: "BRSR readiness", icon: ListChecks },
  { key: "issb", label: "ISSB S1/S2", icon: Globe2 },
  { key: "interviews", label: "Interviews", icon: MessagesSquare },
]

function GapsTabs() {
  const tab = useStore((s) => s.ui.gapsTab)
  const setUi = useStore((s) => s.setUi)
  const r = useReadiness()
  const interviews = useStore((s) => s.interviews.plan.length)
  const docsReviewed = useStore((s) => Object.values(s.docReview.reviews).filter((x) => x.outcome).length)
  const counts: Record<UiState["gapsTab"], string> = {
    results: `${r.byPriority["Before listing"]} ${getClient().preIpo ? "before listing" : "before filing"}`,
    coverage: `${INDICATORS.length} indicators`,
    documents: `${docsReviewed} reviewed`,
    brsr: `${r.brsr.total} questions`,
    issb: `${r.issb.total} requirements`,
    interviews: interviews ? `${interviews} planned` : "not planned",
  }
  return (
    <div role="tablist" aria-label="Gap views" className="flex flex-wrap gap-1 border-b border-line">
      {TABS.map((t) => {
        const Icon = t.icon
        const active = tab === t.key
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setUi({ gapsTab: t.key })}
            className={cn("-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors", active ? "border-hue-gaps text-fg" : "border-transparent text-muted hover:text-fg")}
          >
            <Icon size={14} className={active ? "text-hue-gaps" : undefined} />
            {t.label}
            <span className="hidden text-[11px] text-faint sm:inline">{counts[t.key]}</span>
          </button>
        )
      })}
    </div>
  )
}

const STATUS_STYLE: Record<IndicatorStatus, string> = {
  now: "bg-accent text-[#04110c] border-accent",
  sync: "bg-amber/85 text-[#1a1003] border-amber",
  open: "bg-transparent text-muted border-grey",
}
const STATUS_LABEL: Record<IndicatorStatus, string> = { now: "Producible now", sync: "After sources sync", open: "Open" }

export const RESOLUTION_META: Record<GapResolution, { label: string; icon: typeof Bot; tone: string }> = {
  automatic: { label: "Automatic", icon: Bot, tone: "text-teal border-teal/30 bg-teal/10" },
  data: { label: "Needs data", icon: Wrench, tone: "text-amber border-amber/30 bg-amber/10" },
  document: { label: "Needs document", icon: FileText, tone: "text-amber border-amber/30 bg-amber/10" },
  management: { label: "Needs management", icon: Landmark, tone: "text-fg border-line-strong bg-surface-2" },
}

export function GapCard({ gap, index = 0 }: { gap: Gap; index?: number }) {
  const owner = useStore((s) => ownerPerson(gap.ownerRole, gap.scope.siteId, s.stakeholders))
  const meta = RESOLUTION_META[gap.resolution]
  const Icon = meta.icon
  const finding = gap.title.slice(gap.scopeLabel.length + 3)
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="rounded-2xl border border-line bg-surface/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold">{gap.scopeLabel}</div>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", meta.tone)}>
          <Icon size={11} /> {meta.label}
        </span>
      </div>
      <p className="mt-1 text-[15px] leading-snug">{finding}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-faint">Blocks</span>
        {gap.blocks.map((b) => (
          <span key={b} className="rounded-md border border-line-strong px-1.5 py-0.5 font-medium text-muted" title={INDICATOR_BY_ID[b]?.title}>
            {indicatorRef(b)}
          </span>
        ))}
        <span className="ml-1 rounded-md bg-surface-2 px-1.5 py-0.5 capitalize text-faint">{gap.weight}</span>
      </div>
      <p className="mt-2 text-[13px] text-muted">
        <span className="text-fg">Resolve:</span> {gap.nextStep}.
      </p>
      {gap.note && <p className="mt-1 text-xs text-teal">{gap.note}</p>}
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-faint">
          Owner: {owner ? <span className="text-muted">{owner.name}</span> : null}
          {owner ? ` · ${gap.ownerRole}` : gap.ownerRole}
        </p>
        <button type="button" onClick={() => useStore.getState().setUi({ reference: { indicatorId: gap.indicator } })} className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline">
          Why it matters
        </button>
      </div>
    </motion.article>
  )
}

function Cell({ id, result, onSelect, selected }: { id: string; result?: IndicatorResult; onSelect: (id: string) => void; selected: boolean }) {
  const ind = INDICATOR_BY_ID[id]
  const status = result?.status
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(id)}
      initial={false}
      animate={status ? { scale: [0.9, 1.06, 1] } : {}}
      transition={{ duration: 0.4 }}
      className={cn(
        "flex h-12 min-w-0 flex-col justify-center rounded-lg border px-2 text-left transition-colors",
        status ? STATUS_STYLE[status] : "border-line bg-surface/40 text-faint",
        status === "open" && "border-dashed",
        selected && "ring-2 ring-teal ring-offset-2 ring-offset-bg",
      )}
      aria-label={`${ind.id} ${ind.title}: ${status ? STATUS_LABEL[status] : "not evaluated"}`}
      title={`${ind.id} · ${ind.title}${status ? " · " + STATUS_LABEL[status] : ""}`}
    >
      <span className="truncate text-[10px] font-semibold opacity-80">{ind.id.replace(/\.(elec|fuel|withdrawal|intensity|scope1|scope2)$/, "")}</span>
      <span className="truncate text-[11px] font-medium">{ind.short}</span>
    </motion.button>
  )
}

export function GapsScene() {
  const state = useStore()
  const { analysis, gaps, ui, setUi, say, sites } = state
  const [selected, setSelected] = useState<string | null>(null)
  const [revealGaps, setRevealGaps] = useState(analysis.phase === "done")
  const resultMap = useMemo(() => Object.fromEntries(analysis.results.map((r) => [r.id, r])), [analysis.results])
  const principles = useMemo(() => [...new Set(INDICATORS.map((i) => i.principle))] as Principle[], [])
  const order = profileOrder(state)

  useEffect(() => {
    if (analysis.phase !== "done" || analysis.stale) {
      setRevealGaps(false)
      void runAnalysis()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (analysis.phase === "done" && !revealGaps) {
      const t = setTimeout(() => {
        const g = analysis.gapCounts!
        say(`I found ${g.total} gaps: ${g.automatic} automatic, ${g.dataOrDocument} need data or documents, ${g.management} need management.`)
        setRevealGaps(true)
      }, 2200)
      return () => clearTimeout(t)
    }
  }, [analysis.phase, analysis.gapCounts, revealGaps, say])

  const evaluated = analysis.results.length
  const step = analysis.phase === "done" ? ANALYSIS_STEPS.length : Math.min(ANALYSIS_STEPS.length - 1, Math.floor((evaluated / INDICATORS.length) * ANALYSIS_STEPS.length))
  const counts = analysis.counts
  const filterEntity = sites.find((s) => s.id === ui.gapSiteFilter)?.legalEntityId
  // A site's gaps include those raised on its legal entity (for example payroll outside HRMS).
  const filteredGaps = ui.gapSiteFilter ? gaps.filter((g) => g.scope.siteId === ui.gapSiteFilter || (!!filterEntity && g.scope.entityId === filterEntity)) : gaps
  const featured = featuredGaps(gaps, 5)
  const filterSite = sites.find((s) => s.id === ui.gapSiteFilter)
  const sel = selected ? INDICATOR_BY_ID[selected] : undefined
  const selResult = selected ? resultMap[selected] : undefined

  const groups: GapResolution[][] = [["automatic"], ["data", "document"], ["management"]]

  return (
    <SceneLayout
      visual={
        <div className="scrollbar-thin absolute inset-0 overflow-y-auto p-4 sm:p-8">
          <div className="mb-5">
            <GapsTabs />
          </div>
          {ui.gapsTab === "results" ? (
            <ResultsView />
          ) : ui.gapsTab === "documents" ? (
            <DocumentsView />
          ) : ui.gapsTab === "brsr" ? (
            <BrsrReadiness />
          ) : ui.gapsTab === "issb" ? (
            <IssbReadiness />
          ) : ui.gapsTab === "interviews" ? (
            <InterviewsView />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-accent" /> Producible now</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber/85" /> After sources sync</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-dashed border-grey" /> Open</span>
                <span className="ml-auto text-faint">{GAP_RULES_VERSION} · 48 data-heavy indicators; the full question list is under BRSR readiness</span>
              </div>
              <div className="space-y-3">
                {principles.map((p) => (
                  <div key={p} className="grid grid-cols-[120px_1fr] items-start gap-3">
                    <div className="flex items-start gap-1.5 pt-3 text-[11px] font-medium leading-tight text-muted">
                      {(() => {
                        const I = PRINCIPLE_ICON[p]
                        return <I size={12} className="mt-px shrink-0" aria-hidden />
                      })()}
                      {PRINCIPLE_LABELS[p]}
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-1.5">
                      {INDICATORS.filter((i) => i.principle === p).map((i) => (
                        <Cell key={i.id} id={i.id} result={resultMap[i.id]} onSelect={setSelected} selected={selected === i.id} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {analysis.phase === "done" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
                  <Eyebrow>Sites</Eyebrow>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                    {order.filter((s) => !ui.siteFilter || s.type === ui.siteFilter).map((s) => {
                      const n = gaps.filter((g) => g.scope.siteId === s.id).length
                      const active = ui.gapSiteFilter === s.id
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setUi({ gapSiteFilter: active ? null : s.id, showAllGaps: true })}
                          aria-pressed={active}
                          className={cn("rounded-xl border p-2 text-left transition-colors", active ? "border-teal bg-teal/[0.06]" : "border-line hover:bg-surface-2")}
                        >
                          <SiteVisual type={s.type} phase="building" meters={state.connect.validated[s.id] ?? []} muted={state.connect.siteStatus[s.id] !== "connected"} gaps={n} title={`${s.name}: ${n} gaps`} />
                          <div className="truncate text-xs font-medium">{s.name}</div>
                          <div className="text-[11px] text-faint">{n ? `${n} gap${n === 1 ? "" : "s"}` : "No site gaps"}</div>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      }
      panel={
        <div className="flex flex-col gap-6 p-6">
          <AgentLine />

          <ol className="space-y-2" aria-label="Analysis steps">
            {ANALYSIS_STEPS.map((s, i) => (
              <li key={s} className={cn("flex items-center gap-2.5 text-sm transition-colors", i < step ? "text-muted" : i === step && analysis.phase === "running" ? "text-fg" : "text-faint")}>
                {i < step ? <Check size={14} className="text-accent" /> : <span className={cn("h-1.5 w-1.5 rounded-full", i === step && analysis.phase === "running" ? "bg-teal motion-breathe" : "bg-line-strong")} />}
                {s}
              </li>
            ))}
          </ol>

          {analysis.phase === "running" && (
            <div className="text-xs text-muted">
              <Count value={evaluated} /> of {INDICATORS.length} indicator rules evaluated
            </div>
          )}

          <AnimatePresence>
            {counts && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line bg-surface/60 p-5">
                <p className="text-sm text-muted">
                  Of <Value dp={countValue("cov:total", "Indicators in scope", counts.total, GAP_RULES_VERSION)} size="sm" detail={false} /> indicators in scope
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {(
                    [
                      ["now", counts.now, "producible now"],
                      ["sync", counts.sync, "after sources sync"],
                      ["open", counts.open, "open"],
                    ] as const
                  ).map(([k, n, label]) => (
                    <div key={k}>
                      <Value dp={countValue(`cov:${k}`, label, n, GAP_RULES_VERSION)} size="xl" badge="below" detail={false} className={cn(k === "now" ? "[&>span:first-child]:text-accent" : k === "sync" ? "[&>span:first-child]:text-amber" : "")} />
                      <div className="mt-1 text-xs text-muted">{label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {sel && (
            <div className="rounded-2xl border border-teal/30 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-faint">
                    {sel.id} · {sel.weight}
                  </div>
                  <div className="text-sm font-medium">{sel.title}</div>
                </div>
                <span className="flex gap-3">
                  <button type="button" onClick={() => setUi({ reference: { indicatorId: sel.id } })} className="text-xs text-muted hover:text-fg">
                    Reference
                  </button>
                  <button type="button" onClick={() => setSelected(null)} className="text-xs text-faint hover:text-fg">
                    Close
                  </button>
                </span>
              </div>
              {selResult ? (
                <ul className="mt-3 space-y-1.5 text-xs">
                  {selResult.inputs.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", c.status === "now" ? "bg-accent" : c.status === "sync" ? "bg-amber" : "border border-grey")} />
                      <span className="min-w-0">
                        <span className="text-fg">{inputLabel(c.inputId)}</span> · {c.scopeLabel} — <span className="text-muted">{c.via}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted">Not evaluated yet.</p>
              )}
              {filedMetrics(sel.id).length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <Eyebrow>Last filed</Eyebrow>
                  <ul className="mt-1.5 space-y-1">
                    {filedMetrics(sel.id).map((m) => (
                      <li key={m.key} className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="text-muted">{m.label}</span>
                        <Value dp={filedDp(m)} size="sm" detail={false} className="justify-end" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {revealGaps && analysis.gapCounts && (
            <section aria-label="Gaps" className="space-y-3">
              <div className="flex items-center justify-between">
                <Eyebrow>{filterSite ? `Gaps at ${filterSite.name}` : ui.showAllGaps ? `All ${gaps.length} gaps` : "Gaps worth seeing first"}</Eyebrow>
                <div className="flex gap-2">
                  {filterSite && (
                    <button type="button" className="text-xs text-muted hover:text-fg" onClick={() => setUi({ gapSiteFilter: null })}>
                      Clear filter
                    </button>
                  )}
                  <button type="button" className="text-xs text-teal hover:underline" onClick={() => setUi({ showAllGaps: !ui.showAllGaps, gapSiteFilter: null })}>
                    {ui.showAllGaps ? "Show fewer" : "Show all"}
                  </button>
                </div>
              </div>
              {ui.showAllGaps || filterSite
                ? groups.map((g) => {
                    const list = filteredGaps.filter((x) => g.includes(x.resolution))
                    if (!list.length) return null
                    return (
                      <div key={g.join()} className="space-y-2">
                        <div className="pt-2 text-xs font-medium text-muted">
                          {g[0] === "automatic" ? "Automatic" : g[0] === "data" ? "Need data or documents" : "Need management"} · {list.length}
                        </div>
                        {list.map((x, i) => (
                          <GapCard key={x.id} gap={x} index={i} />
                        ))}
                      </div>
                    )
                  })
                : featured.map((g, i) => <GapCard key={g.id} gap={g} index={i} />)}
              {filterSite && !filteredGaps.length && <p className="text-sm text-muted">No gaps at {filterSite.name}.</p>}
            </section>
          )}

          {analysis.phase === "done" && analysis.stale && (
            <div className="rounded-2xl border border-amber/30 bg-amber/[0.05] p-4 text-sm">
              Inputs changed since this check.{" "}
              <button type="button" className="text-teal hover:underline" onClick={() => runAnalysis()}>
                Re-check coverage
              </button>
            </div>
          )}

          {analysis.phase === "done" && ui.gapsTab !== "results" && (
            <button type="button" onClick={() => setUi({ gapsTab: "results" })} className="flex items-center gap-3 rounded-2xl border border-hue-gaps/30 bg-hue-gaps/[0.05] p-4 text-left transition-colors hover:bg-hue-gaps/[0.09]">
              <Presentation size={18} className="shrink-0 text-hue-gaps" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Gap analysis results and recommendations</span>
                <span className="block text-xs text-muted">Findings, priorities, roadmap and decisions on one page; download it as PowerPoint.</span>
              </span>
              <ArrowRight size={15} className="shrink-0 text-muted" />
            </button>
          )}

          {analysis.phase === "done" && (
            <div className="sticky bottom-0 -mx-6 flex gap-2 border-t border-line bg-bg/90 px-6 py-4 backdrop-blur">
              <Button variant="ghost" size="md" onClick={() => runAnalysis()} aria-label="Re-run gap analysis">
                <RefreshCw size={14} />
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => goTo("plan")}>
                See my BRSR foundation <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </div>
      }
    />
  )
}
