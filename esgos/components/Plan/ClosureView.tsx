"use client"

// Close the gaps: the work between the gap analysis and the BRSR test report.
// Every open item has a route that loops back to where its evidence lives:
// monthly collection (a metric is added if the templates lack it), company data,
// a data request, the document review, a Board decision, a drafted answer or the
// partner programme. Data closes items by itself; decisions are verified by the
// ESG lead. Every change re-runs the readiness assessment.

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Building2, CalendarCheck2, Check, ChevronDown, CircleCheck, FileCheck2, FileText, Gavel, Handshake, Landmark, Plus, RefreshCcw, Send, type LucideIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { goTo } from "@/esgos/lib/navigation"
import { assessReadiness } from "@/esgos/lib/readiness/engine"
import { useReadiness } from "../Gaps/ReadinessView"
import { ROUTES, ROUTE_ORDER, VIA_LABEL, closureInputs, closureRows, closureSummary, collectVia, docsFor, needsVerification, type ClosureRow, type ClosureStatus, type Route } from "@/esgos/lib/closure"
import { reviewKey, OUTCOME_LABEL } from "@/esgos/lib/documents/review"
import { monthLabel } from "@/esgos/lib/collection/model"
import { ANNUAL_BY_ID } from "@/esgos/lib/collection/annual"
import { roleForOwner } from "@/esgos/lib/org"
import { Button, Eyebrow } from "../common/ui"
import { cn } from "../common/cn"
import { DraftEditor } from "./DraftEditor"

export const ROUTE_ICON: Record<Route, LucideIcon> = { collect: CalendarCheck2, document: FileCheck2, decide: Gavel, draft: FileText, partners: Handshake }

const STATUS_STYLE: Record<ClosureStatus, string> = {
  "not started": "bg-surface-2 text-muted",
  "in progress": "bg-amber/15 text-amber",
  "awaiting verification": "bg-hue-plan/15 text-hue-plan",
  closed: "bg-accent/12 text-accent",
}

const fmtDay = (d: string) => new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })

// The baseline: item statuses when the gap analysis was issued. Progress is measured from it.
export function useBaseline() {
  const issued = useStore((s) => s.plan.issued)
  const issuedAt = useStore((s) => s.plan.issuedAt)
  const has = useStore((s) => !!s.closure.baseline)
  useEffect(() => {
    if (!issued || has) return
    const st = useStore.getState()
    const r = assessReadiness(st)
    st.setBaseline({ at: issuedAt ?? new Date().toISOString(), statuses: Object.fromEntries(r.items.map((x) => [x.id, x.status])) })
  }, [issued, issuedAt, has])
}

export function useClosure() {
  const readiness = useReadiness()
  const collection = useStore((s) => s.collection)
  const closure = useStore((s) => s.closure)
  const drafts = useStore((s) => s.drafts)
  const docReview = useStore((s) => s.docReview)
  const reportReview = useStore((s) => s.reportReview)
  const sites = useStore((s) => s.sites)
  const issuedAt = useStore((s) => s.plan.issuedAt)
  return useMemo(() => {
    const inputs = closureInputs({ collection, closure, drafts, docReview, reportReview, sites }, readiness.coverage)
    const start = closure.baseline?.at ?? issuedAt ?? new Date().toISOString()
    const rows = closureRows(readiness.items, inputs, start)
    return { readiness, inputs, rows, summary: closureSummary(rows, readiness.items, closure.baseline), start }
  }, [readiness, collection, closure, drafts, docReview, reportReview, sites, issuedAt])
}

export function ClosureView() {
  useBaseline()
  const { rows, summary, inputs, start } = useClosure()
  const baseline = useStore((s) => s.closure.baseline)
  const [route, setRoute] = useState<Route | null>(null)
  const [status, setStatus] = useState<"open" | "closed" | "all">("open")
  const [priority, setPriority] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const focus = useStore((s) => s.ui.closureFocus)
  const setUi = useStore((s) => s.setUi)

  const list = rows
    .filter((r) => !route || r.route === route)
    .filter((r) => !priority || r.item.priority === priority)
    .filter((r) => (status === "all" ? true : status === "closed" ? r.status === "closed" : r.status !== "closed"))
    .filter((r) => !query.trim() || `${r.item.id} ${r.item.title} ${r.item.owner.role} ${r.item.owner.person ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(a.status === "closed") - Number(b.status === "closed") || b.item.score - a.item.score || a.item.id.localeCompare(b.item.id, undefined, { numeric: true }))
  const [limit, setLimit] = useState(40)
  const b = summary.brsr

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Eyebrow className="flex items-center gap-2">
            <RefreshCcw size={13} /> Close the gaps · after the gap analysis
          </Eyebrow>
          <h2 className="mt-1 text-xl font-medium tracking-tight">
            {summary.total - summary.closed} items to close{summary.closed ? `, ${summary.closed} closed since the gap analysis` : ""}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Every gap closes one of five ways, and each one loops back to where its evidence lives. Data gaps go back into monthly collection, so they close only when the values are collected and approved. Documents go back to the document review, decisions to the Board, disclosures into the test report. Every change re-runs the readiness assessment.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-x-5 text-right">
          <Stat value={`${b.readyThen} → ${b.readyNow}`} label={`of ${b.total} BRSR ready`} title={baseline ? `At the gap analysis (${fmtDay(baseline.at)}) and now` : "Now"} tone={b.readyNow > b.readyThen ? "text-accent" : undefined} />
          <Stat value={`${summary.inProgress + summary.awaiting}`} label="in progress" tone="text-amber" />
          <Stat value={`${summary.overdue}`} label="overdue" tone={summary.overdue ? "text-hue-gaps" : undefined} title={`Due dates run from ${fmtDay(start)} to each item's milestone`} />
        </div>
      </div>

      <Loop />

      {/* Routes */}
      <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-5" role="group" aria-label="Closing routes">
        {ROUTE_ORDER.map((r) => {
          const c = summary.byRoute[r]
          const Icon = ROUTE_ICON[r]
          const active = route === r
          return (
            <button
              key={r}
              type="button"
              aria-pressed={active}
              onClick={() => setRoute(active ? null : r)}
              className={cn("rounded-xl border p-3 text-left transition-colors", active ? "border-hue-plan bg-hue-plan/[0.06]" : "border-line hover:bg-surface-2/60")}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon size={14} className="text-hue-plan" /> {ROUTES[r].label}
              </div>
              <div className="mt-0.5 text-[11px] text-muted">Loops back to {ROUTES[r].loop}</div>
              <div className="mt-2 flex items-baseline justify-between text-xs">
                <span className="tabular-nums">
                  <span className="text-lg font-medium">{c.total - c.closed}</span> <span className="text-muted">open</span>
                </span>
                <span className="text-faint">
                  {c.closed} closed · {c.inProgress} moving
                </span>
              </div>
              <div className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-surface-3">
                <span className="bg-accent" style={{ width: `${c.total ? (c.closed / c.total) * 100 : 0}%` }} />
                <span className="bg-amber" style={{ width: `${c.total ? (c.inProgress / c.total) * 100 : 0}%` }} />
              </div>
            </button>
          )
        })}
      </div>
      {route && (
        <p className="mt-2 max-w-4xl text-xs text-muted">
          <span className="text-fg">{ROUTES[route].label}.</span> {ROUTES[route].how} Closes when: {ROUTES[route].closesWhen.toLowerCase()} Verified by: {ROUTES[route].verifiedBy.charAt(0).toLowerCase() + ROUTES[route].verifiedBy.slice(1)}
        </p>
      )}

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="flex gap-1" role="radiogroup" aria-label="Status">
          {(
            [
              ["open", "Open"],
              ["closed", "Closed"],
              ["all", "All"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={status === k} onClick={() => setStatus(k)} className={cn("rounded-md border px-2.5 py-1", status === k ? "border-fg text-fg" : "border-line text-muted hover:text-fg")}>
              {l}
            </button>
          ))}
        </span>
        <span className="flex gap-1" role="group" aria-label="Priority">
          {["Before listing", "First BRSR year", "After listing"].map((p) => (
            <button key={p} type="button" aria-pressed={priority === p} onClick={() => setPriority(priority === p ? null : p)} className={cn("rounded-md border px-2.5 py-1", priority === p ? "border-fg text-fg" : "border-line text-muted hover:text-fg")}>
              {p}
            </button>
          ))}
        </span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ID, question or owner" aria-label="Search gaps" className="ml-auto h-7 w-56 rounded-md border border-line bg-bg px-2.5 text-xs outline-none placeholder:text-faint focus:border-fg/60" />
        <span className="text-faint">
          {list.length} item{list.length === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="mt-3 space-y-1.5">
        {list.slice(0, limit).map((r) => (
          <Row key={r.item.id} row={r} open={focus === r.item.id} onToggle={() => setUi({ closureFocus: focus === r.item.id ? null : r.item.id })} inputs={inputs} />
        ))}
      </ul>
      {list.length > limit && (
        <Button className="mt-3" size="sm" variant="ghost" onClick={() => setLimit(limit + 40)}>
          Show {Math.min(40, list.length - limit)} more
        </Button>
      )}
      {!list.length && <p className="mt-6 text-sm text-faint">Nothing here with these filters.</p>}
      {summary.reopened.length > 0 && (
        <p className="mt-6 max-w-3xl text-xs text-faint">
          {summary.reopened.length} item{summary.reopened.length === 1 ? " was" : "s were"} ready at the gap analysis and {summary.reopened.length === 1 ? "is" : "are"} not now: {summary.reopened.map((x) => x.id).join(", ")}. Usually a metric found missing (for example refrigerants in Scope 1); each one is in the list above.
        </p>
      )}
    </div>
  )
}

function Stat({ value, label, tone, title }: { value: string; label: string; tone?: string; title?: string }) {
  return (
    <div title={title}>
      <div className={cn("text-2xl font-medium tracking-tight tabular-nums", tone)}>{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  )
}

// The loop, drawn once: where a gap goes and how it comes back.
function Loop() {
  const steps: [string, string, LucideIcon][] = [
    ["Gap analysis", "Gaps → Results", Landmark],
    ["Close the gap", "five routes, one owner each", RefreshCcw],
    ["Evidence comes in", "collection, documents, minutes, drafts", CalendarCheck2],
    ["Re-assessed", "readiness and answers update", CircleCheck],
    ["BRSR test report", "reviewed with data owners", FileText],
  ]
  return (
    <div className="mt-5 rounded-xl border border-line bg-surface/40 p-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {steps.map(([t, d, Icon], i) => (
          <li key={t} className="flex items-center gap-2">
            <span className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-strong text-hue-plan">
                <Icon size={13} />
              </span>
              <span>
                <span className="block text-xs font-medium">{t}</span>
                <span className="block text-[10.5px] text-faint">{d}</span>
              </span>
            </span>
            {i < steps.length - 1 && <ArrowRight size={13} className="mx-1 text-faint" />}
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
        <RefreshCcw size={11} className="text-hue-plan" /> Loops back: a gap the review or a closed month still shows goes back to step 2 with its owner, until it closes.
      </p>
    </div>
  )
}

function Row({ row, open, onToggle, inputs }: { row: ClosureRow; open: boolean; onToggle: () => void; inputs: ReturnType<typeof useClosure>["inputs"] }) {
  const { item, route } = row
  const Icon = ROUTE_ICON[route]
  return (
    <li className={cn("rounded-xl border", open ? "border-line-strong bg-surface" : "border-line bg-surface/40")}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`Close gap: ${item.id} ${item.title}`} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left">
        <Icon size={14} className="shrink-0 text-hue-plan" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2 text-sm">
            <span className="shrink-0 font-mono text-[11px] text-faint">{item.id}</span>
            <span className="truncate">{item.title}</span>
          </span>
          <span className="block truncate text-xs text-muted">
            {row.status === "closed" ? "Closed" : row.next} · {item.owner.person ?? item.owner.role}
          </span>
        </span>
        <span className="hidden w-36 shrink-0 truncate text-right text-[11px] text-faint md:block">{row.via ? VIA_LABEL[row.via] : ROUTES[route].label}</span>
        <span className={cn("hidden w-20 shrink-0 text-right text-[11px] tabular-nums sm:block", row.overdue ? "text-hue-gaps" : "text-faint")} title={`Due by milestone ${item.milestone}`}>
          {row.status === "closed" ? "" : `due ${fmtDay(row.due)}`}
        </span>
        <span className={cn("w-[8.5rem] shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-medium", STATUS_STYLE[row.status])}>{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</span>
        <ChevronDown size={14} className={cn("shrink-0 text-faint transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Detail row={row} inputs={inputs} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function Detail({ row, inputs }: { row: ClosureRow; inputs: ReturnType<typeof useClosure>["inputs"] }) {
  const { item, route, steps } = row
  const st = useStore.getState()
  const entry = useStore((s) => s.closure.entries[item.id])
  const request = useStore((s) => s.closure.requests[item.id])
  const [evidence, setEvidence] = useState(entry?.evidence ?? "")
  const [file, setFile] = useState(request?.file ?? "")
  const c = route === "collect" ? collectVia(item, inputs.collection) : undefined
  const verify = needsVerification(route, item, inputs)
  const allSteps = steps.every((x) => x.done)
  const openPlan = (p: Parameters<typeof st.setUi>[0]) => st.setUi(p)

  return (
    <div className="grid gap-5 border-t border-line px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4 text-sm">
        <div>
          <Eyebrow>The gap</Eyebrow>
          <p className="mt-1">{item.gap || "Closed; nothing outstanding."}</p>
          {item.recommendation && <p className="mt-1.5 text-muted">{item.recommendation}</p>}
        </div>
        <div>
          <Eyebrow>
            {ROUTES[route].label} · loops back to {ROUTES[route].loop}
          </Eyebrow>
          <ol className="mt-2 space-y-1.5">
            {steps.map((x, i) => (
              <li key={x.id} className="flex items-start gap-2.5">
                {x.auto ? (
                  <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border", x.done ? "border-accent bg-accent text-[#04110c]" : "border-line-strong text-faint")} aria-label={x.done ? "Done" : "Not yet"}>
                    {x.done ? <Check size={10} /> : <span className="text-[9px]">{i + 1}</span>}
                  </span>
                ) : (
                  <input type="checkbox" checked={x.done} aria-label={x.label} onChange={(e) => st.setClosureStep(item.id, x.id, e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]" />
                )}
                <span className={cn("min-w-0", x.done ? "text-fg" : "text-muted")}>
                  {x.label}
                  {x.auto && <span className="ml-1.5 text-[10px] text-faint">{x.id === "sent" || x.id === "received" ? "recorded below" : "from the data"}</span>}
                  {x.at && <span className="ml-1.5 text-[10px] text-faint">{fmtDay(x.at)}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-faint">
          Owner: {item.owner.person ? `${item.owner.person} (${item.owner.role})` : item.owner.role} · {item.priority} · milestone {item.milestone}, due {fmtDay(row.due)} · re-assessed: {item.how}
        </p>
      </div>

      <div className="space-y-4 text-sm">
        {c && (c.via === "monthly" || c.via === "extension") && (
          <div className="space-y-2">
            <Eyebrow>Monthly collection</Eyebrow>
            {c.missing.length > 0 && (
              <div className="rounded-lg border border-hue-plan/40 bg-hue-plan/[0.05] p-3">
                <p className="text-xs">Not in the templates yet: {c.missing.map((m) => `${m.label} (${m.unit})`).join("; ")}.</p>
                <p className="mt-1 text-[11px] text-muted">{[...new Set(c.missing.map((m) => m.extra!.gap))].join(" ")}</p>
                <Button size="sm" variant="primary" className="mt-2" onClick={() => st.addMetrics(c.missing.map((m) => m.id), item.id)}>
                  <Plus size={13} /> Add to monthly collection
                </Button>
              </div>
            )}
            {c.metrics.length > 0 && (
              <>
                <ul className="space-y-0.5 text-xs text-muted">
                  {c.metrics.slice(0, 6).map((m) => (
                    <li key={m.id}>
                      {m.label} · {m.unit} · {m.owner} · {m.evidence}
                      {m.extra && <span className="ml-1 text-hue-plan">(added {inputs.collection.addedAt?.[m.id] ? monthLabel(inputs.collection.addedAt[m.id]!.slice(0, 7)) : ""})</span>}
                    </li>
                  ))}
                  {c.metrics.length > 6 && <li className="text-faint">and {c.metrics.length - 6} more</li>}
                </ul>
                <Button size="sm" onClick={() => openPlan({ planTab: "collection", collectionView: "monthly", collectionMetric: c.metrics[0].id })}>
                  <CalendarCheck2 size={13} /> Open monthly collection
                </Button>
              </>
            )}
          </div>
        )}
        {c?.via === "annual" && (
          <div className="space-y-2">
            <Eyebrow>Company data</Eyebrow>
            <ul className="space-y-0.5 text-xs">
              {c.annual.map((f) => {
                const v = inputs.collection.annual?.[f.id]
                return (
                  <li key={f.id} className="flex justify-between gap-3">
                    <span className="text-muted">{ANNUAL_BY_ID[f.id].label}</span>
                    <span className="tabular-nums">{v ? `${v.value.toLocaleString("en-IN")} ${f.unit} · ${v.status === "approved" ? "approved" : "awaiting review"}` : <span className="text-faint">not entered</span>}</span>
                  </li>
                )
              })}
            </ul>
            <Button size="sm" onClick={() => openPlan({ planTab: "collection", collectionView: "annual" })}>
              <Building2 size={13} /> Enter company data
            </Button>
          </div>
        )}
        {c?.via === "request" && (
          <div className="space-y-2">
            <Eyebrow>Data request</Eyebrow>
            {!request?.sentAt ? (
              <Button size="sm" variant="primary" onClick={() => st.sendDataRequest(item.id, { ownerRole: roleForOwner(item.owner.role) ?? (item.owner.role === "Legal" ? "Company secretary" : item.owner.role === "Risk" ? "Finance controller" : "ESG lead"), question: `Data for ${item.id}: ${item.title}. Usual source: ${item.how}`, indicator: item.id })}>
                <Send size={13} /> Send data request to the {item.owner.role.toLowerCase()}
              </Button>
            ) : (
              <p className="text-xs text-muted">
                Requested {fmtDay(request.sentAt)}
                {request.due ? `, due ${fmtDay(request.due)}` : ""}. The request is in the owner&apos;s task list.
              </p>
            )}
            <div className="flex gap-2">
              <input value={file} onChange={(e) => setFile(e.target.value)} placeholder="File or register received" aria-label="File received" className="h-8 min-w-0 flex-1 rounded-md border border-line-strong bg-bg px-2.5 text-xs outline-none placeholder:text-faint focus:border-fg/60" />
              <Button size="sm" onClick={() => st.receiveData(item.id, file)} disabled={(request?.file ?? "") === file.trim()}>
                Record
              </Button>
            </div>
          </div>
        )}
        {route === "document" && (
          <div className="space-y-2">
            <Eyebrow>Document review</Eyebrow>
            {docsFor(item.id).length ? (
              <ul className="space-y-1 text-xs">
                {docsFor(item.id).map((d) => {
                  const plants = inputs.sites.filter((x) => x.type === "factory")
                  const outcomes = d.perPlant ? plants.map((p) => inputs.docReview.reviews[reviewKey(d.id, p.id)]?.outcome) : [inputs.docReview.reviews[reviewKey(d.id)]?.outcome]
                  const adequate = outcomes.filter((o) => o === "adequate").length
                  return (
                    <li key={d.id} className="flex justify-between gap-3">
                      <span className="text-muted">{d.title}</span>
                      <span className="shrink-0">{d.perPlant ? `${adequate} of ${plants.length} plants adequate` : outcomes[0] ? OUTCOME_LABEL[outcomes[0]] : "Not reviewed"}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted">No document in the review checklist covers this; the ESG lead verifies the evidence.</p>
            )}
            {docsFor(item.id).length > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  st.setUi({ gapsTab: "documents" })
                  goTo("gaps")
                }}
              >
                <FileCheck2 size={13} /> Open the document review
              </Button>
            )}
          </div>
        )}
        {(route === "draft" || (c?.via === "request" && item.framework === "BRSR")) && (
          <div className="space-y-2">
            <Eyebrow>Answer in the test report</Eyebrow>
            <DraftEditor id={item.id} ownerRole={item.owner.role} />
            <Button size="sm" variant="ghost" onClick={() => openPlan({ planTab: "report", reportView: "report", reportFocus: item.id })}>
              <FileText size={13} /> Open in the test report
            </Button>
          </div>
        )}
        {c?.via === "request" && item.framework !== "BRSR" && (
          <div className="space-y-2">
            <Eyebrow>Disclosure draft</Eyebrow>
            <DraftEditor id={item.id} ownerRole={item.owner.role} />
          </div>
        )}
        {verify && (
          <div className="space-y-2">
            <Eyebrow>Evidence and verification</Eyebrow>
            <input
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              onBlur={() => st.setClosureEvidence(item.id, evidence)}
              placeholder={route === "decide" ? "e.g. Board minutes, 12 Nov 2025, item 7" : route === "partners" ? "e.g. 18 supplier returns, file on the shared drive" : "Where the evidence is filed"}
              aria-label="Evidence"
              className="h-8 w-full rounded-md border border-line-strong bg-bg px-2.5 text-xs outline-none placeholder:text-faint focus:border-fg/60"
            />
            {entry?.verifiedAt ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-accent">
                  Verified by {entry.verifiedBy} on {fmtDay(entry.verifiedAt)}
                </span>
                <Button size="sm" variant="ghost" onClick={() => st.verifyClosure(item.id, false)}>
                  Reopen
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="primary"
                disabled={!allSteps || !evidence.trim()}
                onClick={() => {
                  st.setClosureEvidence(item.id, evidence)
                  st.verifyClosure(item.id, true)
                }}
              >
                <CircleCheck size={13} /> Verify and close
              </Button>
            )}
            {!allSteps && <p className="text-[11px] text-faint">Tick every step and name the evidence to verify.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
