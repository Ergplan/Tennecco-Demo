"use client"

// Reference library: every BRSR / BRSR Core / GHG Protocol requirement and
// Indian regulation the product relies on, with its official wording, the
// plain-language reason, the evidence an assurer will ask for, and sources.

import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, BookOpen, ExternalLink, Search, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { FRAMEWORKS, REFERENCE, entriesForIndicator, entriesForQuestion, entry as getEntry, searchReference } from "@/esgos/lib/reference"
import type { RefEntry } from "@/esgos/lib/reference/types"
import { QUESTION_BY_ID, QUESTION_LABELS } from "@/esgos/lib/questionEngine"
import { INDICATOR_BY_ID } from "@/esgos/lib/indicators"
import { getClient } from "@/esgos/lib/clients"
import { Eyebrow } from "./ui"
import { cn } from "./cn"
import { FRAMEWORK_ICON } from "./icons"

function SourceList({ sources }: { sources: RefEntry["sources"] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {sources.map((s, i) => (
        <li key={i} className="text-xs leading-snug">
          {s.url ? (
            <a href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-start gap-1 text-fg underline-offset-2 hover:underline">
              <ExternalLink size={11} className="mt-0.5 shrink-0" />
              <span>{s.title}</span>
            </a>
          ) : (
            <span>{s.title}</span>
          )}
          <span className="text-faint">
            {[s.publisher, s.date, s.page && `p. ${s.page}`].filter(Boolean).length ? ` · ${[s.publisher, s.date, s.page && `p. ${s.page}`].filter(Boolean).join(" · ")}` : ""}
            {s.primary === false ? " · secondary" : ""}
          </span>
        </li>
      ))}
    </ul>
  )
}

function EntryCard({ e, open, onToggle }: { e: RefEntry; open: boolean; onToggle: () => void }) {
  return (
    <li className={cn("rounded-lg border", open ? "border-line-strong bg-surface" : "border-line")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full px-4 py-3 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              {(() => {
                const I = FRAMEWORK_ICON[e.framework]
                return <I size={11} className="mr-1 inline-block -translate-y-px" aria-hidden />
              })()}
              {e.framework} · {e.ref}
            </div>
            <div className="mt-0.5 text-sm font-medium">{e.title}</div>
          </div>
          {e.confidence && e.confidence !== "verified" && <span className="shrink-0 rounded border border-amber/40 px-1.5 py-0.5 text-[10px] text-amber">{e.confidence}</span>}
        </div>
        {!open && <p className="mt-1 line-clamp-2 text-xs text-muted">{e.whyNeeded}</p>}
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-4 py-3 text-sm">
          {e.officialText && (
            <blockquote className="border-l-2 border-fg/40 pl-3 text-[13px] italic leading-relaxed text-muted">“{e.officialText}”</blockquote>
          )}
          <div>
            <Eyebrow>Why it's needed</Eyebrow>
            <p className="mt-1 leading-relaxed">{e.whyNeeded}</p>
          </div>
          {e.whatToReport && (
            <div>
              <Eyebrow>What to report</Eyebrow>
              <p className="mt-1 text-[13px] text-muted">
                {e.whatToReport}
                {e.unit ? ` · ${e.unit}` : ""}
              </p>
            </div>
          )}
          {e.core && (e.core.attribute || e.core.parameter) && (
            <div>
              <Eyebrow>BRSR Core</Eyebrow>
              <p className="mt-1 text-[13px] text-muted">{[e.core.attribute, e.core.parameter, e.core.measurement].filter(Boolean).join(" · ")}</p>
            </div>
          )}
          {!!e.evidence?.length && (
            <div>
              <Eyebrow>Evidence an assurer asks for</Eyebrow>
              <ul className="mt-1 list-disc pl-4 text-[13px] text-muted">
                {e.evidence.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {!!e.stakeholders?.length && (
            <p className="text-[13px] text-muted">
              <span className="text-fg">Who usually knows:</span> {e.stakeholders.join(", ")}
            </p>
          )}
          <div>
            <Eyebrow>Sources</Eyebrow>
            <SourceList sources={e.sources} />
          </div>
        </div>
      )}
    </li>
  )
}

export function ReferenceDrawer() {
  const focus = useStore((s) => s.ui.reference)
  const setUi = useStore((s) => s.setUi)
  const [query, setQuery] = useState("")
  const [framework, setFramework] = useState<RefEntry["framework"] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [tab, setTab] = useState<"library" | "sector" | "factors">("library")
  const client = getClient()
  const sector: "paints" | "snacks" = client.sector === "paints" ? "paints" : "snacks"
  const sectorQs = (REFERENCE.suggestedQuestions ?? []).filter((q) => q.sector === sector)
  const showSector = client.sector === "paints" || client.sector === "snacks"

  useEffect(() => {
    if (!focus) return
    setQuery(focus.query ?? "")
    setFramework(null)
    setTab("library")
    const first = focus.entryId ?? (focus.questionId ? entriesForQuestion(focus.questionId)[0]?.id : focus.indicatorId ? entriesForIndicator(focus.indicatorId)[0]?.id : undefined)
    setOpenId(first ?? null)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setUi({ reference: null })
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [focus, setUi])

  const question = focus?.questionId ? QUESTION_BY_ID[focus.questionId] : undefined
  const why = focus?.questionId ? REFERENCE.questions[focus.questionId] : undefined
  const indicator = focus?.indicatorId ? INDICATOR_BY_ID[focus.indicatorId] : undefined
  const focused = useMemo(() => (focus?.questionId ? entriesForQuestion(focus.questionId) : focus?.indicatorId ? entriesForIndicator(focus.indicatorId) : []), [focus])
  const list = useMemo(() => searchReference(query, framework), [query, framework])
  const contextual = !!(question || indicator) && !query && !framework
  const pending = REFERENCE.generatedAt === "pending"

  return (
    <AnimatePresence>
      {focus && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUi({ reference: null })} className="fixed inset-0 z-40 bg-black/40" aria-hidden />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Reference library"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[640px] flex-col border-l border-line-strong bg-elev shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line p-6">
              <div>
                <Eyebrow>Reference library</Eyebrow>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-medium tracking-tight">
                  <BookOpen size={18} /> BRSR, GHG Protocol and Indian rules
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {pending ? "Library is being compiled from primary sources." : `${REFERENCE.entries.length} requirements with sources · compiled ${REFERENCE.generatedAt.slice(0, 10)}`}
                </p>
              </div>
              <button type="button" onClick={() => setUi({ reference: null })} className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Close reference library" autoFocus>
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-1 px-6 pt-4 text-xs" role="tablist">
              {(["library", "sector", "factors"] as const).filter((t) => t !== "sector" || showSector).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-md px-3 py-1.5", tab === t ? "bg-surface-3 text-fg" : "text-muted hover:text-fg")}>
                  {t === "library" ? "Requirements" : t === "sector" ? `${sector === "paints" ? "Paints" : "Snacks"} questions` : "Emission factors and GWPs"}
                </button>
              ))}
            </div>

            {tab === "library" ? (
              <>
                <div className="space-y-3 px-6 py-4">
                  <label className="flex items-center gap-2 rounded-md border border-line-strong bg-bg px-3">
                    <Search size={14} className="text-faint" />
                    <span className="sr-only">Search the library</span>
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search — e.g. Scope 2, water, CTO, LTIFR" className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-faint" />
                  </label>
                  <div className="flex flex-wrap gap-1" role="group" aria-label="Framework">
                    {[null, ...FRAMEWORKS].map((f) => (
                      <button key={f ?? "all"} type="button" aria-pressed={framework === f} onClick={() => setFramework(f)} className={cn("rounded-md border px-2.5 py-1 text-xs", framework === f ? "border-fg text-fg" : "border-line text-muted hover:text-fg")}>
                        {f &&
                          (() => {
                            const I = FRAMEWORK_ICON[f]
                            return <I size={12} className="mr-1 inline-block -translate-y-px" aria-hidden />
                          })()}
                        {f ?? "All"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="scrollbar-thin flex-1 overflow-y-auto px-6 pb-8">
                  {contextual && (
                    <section className="mb-6 rounded-lg border border-fg/30 p-4">
                      <button type="button" onClick={() => setUi({ reference: { query: "" } })} className="mb-2 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
                        <ArrowLeft size={12} /> Whole library
                      </button>
                      <Eyebrow>{question ? "Why we ask" : "Indicator"}</Eyebrow>
                      <p className="mt-1 text-base font-medium">{question ? `${QUESTION_LABELS[question.id] ?? question.id}: “${question.text({ name: "this site" } as never)}”` : `${indicator!.id} ${indicator!.title}`}</p>
                      {why?.why && <p className="mt-2 text-sm leading-relaxed">{why.why}</p>}
                      {showSector && why?.sectorNotes?.[sector] && (
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                          <span className="text-fg">In {sector === "paints" ? "paint plants" : "snack plants"}:</span> {why.sectorNotes[sector]}
                        </p>
                      )}
                      {!!why?.evidence?.length && <p className="mt-2 text-xs text-muted">Evidence: {why.evidence.join("; ")}</p>}
                      {!!why?.stakeholders?.length && <p className="mt-1 text-xs text-muted">Who usually knows: {why.stakeholders.join(", ")}</p>}
                      {!why?.why && !focused.length && <p className="mt-2 text-sm text-muted">{pending ? "The sourced explanation for this is still being compiled." : "No linked requirement yet."}</p>}
                    </section>
                  )}
                  <ul className="space-y-2">
                    {(contextual && focused.length ? focused : list).map((e) => (
                      <EntryCard key={e.id} e={e} open={openId === e.id} onToggle={() => setOpenId(openId === e.id ? null : e.id)} />
                    ))}
                  </ul>
                  {contextual && focused.length > 0 && (
                    <button type="button" onClick={() => setUi({ reference: { query: "" } })} className="mt-4 text-xs text-muted hover:text-fg">
                      Browse all {REFERENCE.entries.length} requirements →
                    </button>
                  )}
                  {!list.length && !contextual && <p className="py-8 text-center text-sm text-muted">{pending ? "Compiling the library from SEBI, GHG Protocol, CEA and CPCB sources." : "Nothing matches."}</p>}
                </div>
              </>
            ) : tab === "sector" ? (
              <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-4 pb-8">
                <p className="text-sm text-muted">
                  Questions a {sector === "paints" ? "paints and coatings" : "packaged snacks"} plant should also answer, beyond the core profile. Each says which requirement it feeds.
                </p>
                <ul className="mt-4 space-y-3">
                  {sectorQs.map((q) => (
                    <li key={q.id} className="rounded-lg border border-line p-4">
                      <div className="text-sm font-medium">{q.text}</div>
                      {!!q.options?.length && <div className="mt-1 text-xs text-faint">{q.options.join(" · ")}</div>}
                      <p className="mt-2 text-[13px] leading-relaxed text-muted">{q.why}</p>
                      {!!q.stakeholders?.length && <p className="mt-2 text-xs text-muted">Who usually knows: {q.stakeholders.join(", ")}</p>}
                      {!!q.feeds?.length && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {q.feeds.map((id) => {
                            const e = getEntry(id)
                            return e ? (
                              <button
                                key={id}
                                type="button"
                                onClick={() => {
                                  setTab("library")
                                  setQuery("")
                                  setFramework(null)
                                  setUi({ reference: { entryId: id, query: e.title } })
                                }}
                                className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted hover:border-fg/60 hover:text-fg"
                              >
                                {e.ref.length > 40 ? e.title : e.ref}
                              </button>
                            ) : null
                          })}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-4 pb-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-faint">
                      <th className="py-2 font-medium">Factor</th>
                      <th className="py-2 text-right font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REFERENCE.emissionFactors.map((f) => (
                      <tr key={f.id} className="border-b border-line align-top">
                        <td className="py-2 pr-3">
                          <div>{f.item}</div>
                          <div className="text-xs text-faint">
                            {[f.basis, f.version].filter(Boolean).join(" · ")}
                            {f.source?.url && (
                              <>
                                {" · "}
                                <a href={f.source.url} target="_blank" rel="noreferrer noopener" className="underline-offset-2 hover:underline">
                                  {f.source.publisher ?? f.source.title}
                                </a>
                              </>
                            )}
                          </div>
                          {f.notes && <div className="text-xs text-muted">{f.notes}</div>}
                        </td>
                        <td className="tnum py-2 text-right">
                          {f.value ?? "—"} <span className="text-xs text-muted">{f.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!!REFERENCE.gwp.length && (
                  <table className="mt-6 w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-faint">
                        <th className="py-2 font-medium">Gas</th>
                        <th className="py-2 text-right font-medium">GWP AR5</th>
                        <th className="py-2 text-right font-medium">GWP AR6</th>
                      </tr>
                    </thead>
                    <tbody>
                      {REFERENCE.gwp.map((g) => (
                        <tr key={g.gas} className="border-b border-line">
                          <td className="py-2">{g.gas}</td>
                          <td className="tnum py-2 text-right">{g.ar5 ?? "—"}</td>
                          <td className="tnum py-2 text-right">{g.ar6 ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!REFERENCE.emissionFactors.length && <p className="py-8 text-center text-sm text-muted">Emission factors are being compiled.</p>}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export function ReferenceButton() {
  const setUi = useStore((s) => s.setUi)
  return (
    <button type="button" onClick={() => setUi({ reference: { query: "" } })} className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted hover:bg-surface-2 hover:text-fg" aria-label="Open the reference library">
      <BookOpen size={15} /> <span className="hidden sm:inline">Reference</span>
    </button>
  )
}

export function useReferenceLookup(id: string) {
  return getEntry(id)
}
