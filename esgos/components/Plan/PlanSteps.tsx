"use client"

// The steps after the gap analysis, in order, each with where it stands. The
// loop runs from Close gaps through collection and the test report back to
// Close gaps until every gap is closed.

import { CalendarCheck2, CalendarRange, FileDown, FileText, LayoutGrid, RefreshCcw, ShieldCheck, type LucideIcon } from "lucide-react"
import { useStore, type UiState } from "@/esgos/lib/store"
import { reviewSummary } from "@/esgos/lib/reportReview"
import { cn } from "../common/cn"
import { useClosure } from "./ClosureView"

type Tab = UiState["planTab"]

export const PLAN_STEPS: { key: Tab; label: string; phase: string; icon: LucideIcon; n?: number }[] = [
  { key: "foundation", label: "BRSR foundation", phase: "Overview", icon: LayoutGrid },
  { key: "roadmap", label: "Roadmap", phase: "Phase 1 · plan", icon: CalendarRange, n: 1 },
  { key: "closure", label: "Close gaps", phase: "Phase 1 → 2 · act", icon: RefreshCcw, n: 2 },
  { key: "collection", label: "Monthly collection", phase: "Phase 2 · data", icon: CalendarCheck2, n: 3 },
  { key: "report", label: "BRSR test report", phase: "Phase 3 · report", icon: FileText, n: 4 },
  { key: "review", label: "Test report review", phase: "Phase 3 · review", icon: ShieldCheck, n: 5 },
  { key: "deliverables", label: "Deliverables", phase: "All phases", icon: FileDown, n: 6 },
]

export function PlanSteps() {
  const tab = useStore((s) => s.ui.planTab)
  const setUi = useStore((s) => s.setUi)
  const collection = useStore((s) => s.collection)
  const reportReview = useStore((s) => s.reportReview)
  const { summary, readiness } = useClosure()
  const closed = collection.months.filter((m) => collection.cycles[m]?.closedAt).length
  const rv = reviewSummary(reportReview)
  const status: Record<Tab, string> = {
    foundation: "Where the data stands",
    roadmap: `M1–M5 · ${summary.total - summary.closed} items`,
    closure: summary.closed ? `${summary.closed} closed · ${summary.total - summary.closed} open` : `${summary.total} to close`,
    collection: collection.setupAt ? `${closed} of ${collection.months.length} months closed` : "Not set up",
    report: `${readiness.brsr.now} of ${readiness.brsr.total} ready`,
    review: `${rv.signedOff} of ${rv.sessions} signed off`,
    deliverables: "9 files",
  }
  return (
    <div role="tablist" aria-label="Plan views" className="scrollbar-thin -mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line px-1 pb-px">
      {PLAN_STEPS.map(({ key, label, phase, icon: Icon, n }) => {
        const active = tab === key
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            onClick={() => setUi({ planTab: key })}
            className={cn("-mb-px flex min-w-[7.25rem] shrink-0 flex-col items-start border-b-2 px-2.5 pb-2 pt-1.5 text-left transition-colors", active ? "border-hue-plan" : "border-transparent hover:bg-surface-2/50")}
          >
            <span className="text-[10px] uppercase tracking-[0.12em] text-faint">{phase}</span>
            <span className={cn("mt-0.5 flex items-center gap-1.5 text-sm", active ? "text-fg" : "text-muted")}>
              {n ? <span className={cn("grid h-4 w-4 place-items-center rounded-full text-[10px] tabular-nums", active ? "bg-hue-plan text-white" : "bg-surface-3 text-muted")}>{n}</span> : <Icon size={13} className={active ? "text-hue-plan" : undefined} />}
              {label}
            </span>
            <span className="mt-0.5 text-[10.5px] text-faint">{status[key]}</span>
          </button>
        )
      })}
    </div>
  )
}
