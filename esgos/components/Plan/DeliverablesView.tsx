"use client"

// The engagement deliverables, built on demand from the current state: Phase 1
// decks, Phase 2 templates and procedures, Phase 3 test report, data workbook,
// assumptions note and board presentation. Libraries load only on download.

import { motion } from "framer-motion"
import { Check, Download, FileSpreadsheet, FileText, Loader2, Presentation, type LucideIcon } from "lucide-react"
import { useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { downloadDeliverable, type DeliverableFormat, type DeliverableKind } from "@/esgos/lib/exports/download"
import { Button, Eyebrow } from "../common/ui"
import { cn } from "../common/cn"

type Kind = DeliverableKind
type Format = DeliverableFormat

const FORMAT: Record<Format, { icon: LucideIcon; label: string }> = {
  pptx: { icon: Presentation, label: "PowerPoint" },
  xlsx: { icon: FileSpreadsheet, label: "Excel" },
  docx: { icon: FileText, label: "Word" },
}

const DELIVERABLES: { phase: string; items: { kind: Kind; format: Format; title: string; slug: string; inside: string }[] }[] = [
  {
    phase: "Phase 1 · Gap analysis",
    items: [
      { kind: "gap", format: "pptx", title: "Gap analysis results and recommendations", slug: "gap-analysis", inside: "The same story as Gaps → Results: executive summary, readiness by section, where the gaps are, eight themes, priority gaps, BRSR Core, plants, interviews, ISSB, peer, recommendations, roadmap, decisions, and the ranked gap register." },
      { kind: "roadmap", format: "pptx", title: "Implementation roadmap", slug: "roadmap", inside: "Milestone timeline, one slide per milestone with effort, dependencies and owners, ownership by priority, key dependencies." },
      { kind: "board", format: "pptx", title: "Board and management summary", slug: "board-summary", inside: "Where the company stands, decisions needed from the Board, what must be done first, roadmap, risks and the next 90 days. For the live presentation." },
    ],
  },
  {
    phase: "Phase 2 · Data collection",
    items: [
      { kind: "templates", format: "xlsx", title: "Data collection templates", slug: "data-templates", inside: "One sheet per topic with every plant, metric and month; formulas for totals, GJ, Scope 1 and 2, water consumption, waste and LTIFR; factors with sources; named data owners." },
      { kind: "procedures", format: "docx", title: "Implementation procedures", slug: "procedures", inside: "Roles, the monthly cycle and deadlines, metrics with owners and evidence, named owners per plant, calculation guidance, controls." },
    ],
  },
  {
    phase: "Phase 3 · BRSR test report",
    items: [
      { kind: "report", format: "docx", title: "BRSR test report (SEBI format)", slug: "brsr-test-report", inside: "Sections A, B and C question by question, marked as a test report for internal use. Each answer names its source; anything not collected is a placeholder naming its owner." },
      { kind: "workbook", format: "xlsx", title: "Completed BRSR data workbook", slug: "brsr-data-workbook", inside: "The templates filled from the monthly collection, plus the collection log, checks, BRSR readiness, ISSB map, gap register, interviews, assumptions and test report answers." },
      { kind: "assumptions", format: "docx", title: "Disclosure assumptions and limitations note", slug: "assumptions-note", inside: "Every assumption behind the numbers, what it does to the disclosure, what removes it and who owns it." },
      { kind: "testdeck", format: "pptx", title: "Management and board presentation", slug: "test-report-presentation", inside: "Test report coverage by section, key numbers collected and with estimates, assumptions, and what is needed before the real filing." },
    ],
  },
]

export function DeliverablesView() {
  const interviews = useStore((s) => s.interviews)
  const collection = useStore((s) => s.collection)
  const [busy, setBusy] = useState<Kind | null>(null)
  const [done, setDone] = useState<Partial<Record<Kind, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const closed = collection.months.filter((m) => collection.cycles[m]?.closedAt).length

  const run = async (kind: Kind, format: Format, slug: string) => {
    setBusy(kind)
    setError(null)
    try {
      const name = await downloadDeliverable(kind, format, slug)
      setDone((d) => ({ ...d, [kind]: name }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the file.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <Eyebrow>Deliverables · built from what is in esgOS now</Eyebrow>
      <h2 className="mt-1 text-xl font-medium tracking-tight">Download the engagement deliverables</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Each file is generated from the current readiness assessment, interviews ({interviews.plan.filter((x) => x.status === "done").length} of {interviews.plan.length || "—"} done) and monthly collection ({closed} month{closed === 1 ? "" : "s"} closed). Download again after more data comes in and the numbers update. Tables and charts are native, so they can be edited.
      </p>
      {error && <p className="mt-3 text-sm text-hue-gaps">{error}</p>}
      <div className="mt-6 space-y-7">
        {DELIVERABLES.map((g) => (
          <section key={g.phase}>
            <Eyebrow>{g.phase}</Eyebrow>
            <ul className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {g.items.map((d, i) => {
                const F = FORMAT[d.format]
                const Icon = F.icon
                return (
                  <motion.li key={d.kind} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex flex-col rounded-lg border border-line bg-surface/50 p-4">
                    <div className="flex items-start gap-3">
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md", d.format === "pptx" ? "bg-hue-connect/12 text-hue-connect" : d.format === "xlsx" ? "bg-accent/12 text-accent" : "bg-hue-seed/12 text-hue-seed")}>
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-snug">{d.title}</div>
                        <div className="text-[11px] text-faint">{F.label}</div>
                      </div>
                    </div>
                    <p className="mt-2 flex-1 text-xs leading-relaxed text-muted">{d.inside}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <Button size="sm" variant={done[d.kind] ? "secondary" : "primary"} onClick={() => run(d.kind, d.format, d.slug)} disabled={busy !== null} aria-label={`Download ${d.title}`}>
                        {busy === d.kind ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} {busy === d.kind ? "Building…" : "Download"}
                      </Button>
                      {done[d.kind] && (
                        <span className="flex min-w-0 items-center gap-1 truncate text-[11px] text-accent">
                          <Check size={11} /> {done[d.kind]}
                        </span>
                      )}
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-6 text-xs text-faint">Files are built in your browser; nothing is uploaded. The test report and its presentation are marked for internal use only.</p>
    </div>
  )
}
