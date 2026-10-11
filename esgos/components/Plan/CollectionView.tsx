"use client"

// Monthly data collection: issue each month's requests to named owners, take
// the values (typed, imported or from a client file), review and close the
// cycle. Totals, conversions and checks update as values come in.

import { Building2, CalendarCheck2, Check, Download, FileSpreadsheet, Info, Lock, Plus, Send, Sparkles, TriangleAlert, Upload } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { getClient } from "@/esgos/lib/clients"
import { METRIC_BY_ID, SOURCE_TEXT, activeMetrics, activeTopics, appliesTo, cellKey, monthLabel, type CellSource, type MetricId, type Topic } from "@/esgos/lib/collection/model"
import { completeness, derivedTotals, factorNotes, flags, monthTotal, sitesFor } from "@/esgos/lib/collection/calc"
import { AnnualView } from "./AnnualView"
import { readTable } from "@/esgos/lib/imports"
import { Button, Eyebrow } from "../common/ui"
import { cn } from "../common/cn"

const fmt = (n: number, d = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: d })
const short = (n: number) => (n >= 1e7 ? `${fmt(n / 1e7, 1)}cr` : n >= 1e5 ? `${fmt(n / 1e5, 1)}L` : n >= 1000 ? `${fmt(n / 1000, 1)}k` : fmt(n, 1))

function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

const csvCell = (v: string | number | undefined) => {
  const s = v === undefined ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function CollectionView() {
  const state = useStore()
  const { collection, sites: allSites, setupCollection, issueCycle, setCell, reviewCycle, closeCycle, simulateReturns, importCollection, setUi } = state
  const view = state.ui.collectionView
  const client = getClient()
  const sites = allSites.filter((s) => s.status === "confirmed")
  const months = collection.months
  const METRICS = activeMetrics(collection)
  const TOPICS = activeTopics(collection)
  const [month, setMonth] = useState<string | null>(null)
  const [topic, setTopic] = useState<Topic>(state.ui.collectionMetric ? METRIC_BY_ID[state.ui.collectionMetric].topic : "Energy")
  const [metric, setMetric] = useState<MetricId>(state.ui.collectionMetric ?? "elec.grid")
  // Opened from Close gaps on a metric: show it.
  const focus = state.ui.collectionMetric
  useEffect(() => {
    if (!focus) return
    setTopic(METRIC_BY_ID[focus].topic)
    setMetric(focus)
    setUi({ collectionMetric: null })
  }, [focus, setUi])
  const [selected, setSelected] = useState<{ siteId: string; month: string } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const closed = months.filter((m) => collection.cycles[m]?.closedAt)
  const current = month ?? months.find((m) => !collection.cycles[m]?.closedAt) ?? months[0]
  const yearC = useMemo(() => completeness(collection, sites, months), [collection, sites, months])
  const totals = useMemo(() => derivedTotals(collection, sites, closed.length ? closed : months), [collection, sites, closed, months])
  const totalsEst = useMemo(() => derivedTotals(collection, sites, closed.length ? closed : months, { includeEstimates: true }), [collection, sites, closed, months])
  const allFlags = useMemo(() => flags(collection, sites, months), [collection, sites, months])

  const switcher = (
    <div role="tablist" aria-label="Collection views" className="mb-5 inline-flex rounded-lg border border-line p-0.5 text-sm">
      {(
        [
          ["monthly", "Monthly plant data", CalendarCheck2],
          ["annual", "Company data (annual)", Building2],
        ] as const
      ).map(([k, label, Icon]) => (
        <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setUi({ collectionView: k })} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors", view === k ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}>
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  )
  if (view === "annual")
    return (
      <div>
        {switcher}
        <AnnualView />
      </div>
    )

  if (!collection.setupAt) {
    const plants = sites.filter((s) => s.type === "factory").length
    return (
      <div>
        {switcher}
        <Eyebrow className="flex items-center gap-2">
          <CalendarCheck2 size={13} /> Monthly data collection
        </Eyebrow>
        <h2 className="mt-1 text-xl font-medium tracking-tight">Prove the process before the first report</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Each month, every plant&apos;s data owners submit {METRICS.length} metrics (electricity, fuels, water, waste, production, headcount and safety) with evidence. Values are reviewed and the month is closed. Three to six closed months show the collection works and that the totals add up.
        </p>
        <div className="mt-5 rounded-xl border border-dashed border-line-strong p-5 text-sm">
          <p>
            {sites.length} sites ({plants} plants) × {METRICS.length} metrics × 12 months of {state.group.fiscalYear}.
            {client.energyFile && ` Your energy file fills electricity for the months it covers; its estimates stay marked as estimates.`}
          </p>
          <Button className="mt-4" variant="primary" onClick={setupCollection}>
            <CalendarCheck2 size={14} /> Set up monthly collection
          </Button>
        </div>
      </div>
    )
  }

  const m = METRIC_BY_ID[metric]
  const rows = sitesFor(m, sites)
  const cyc = collection.cycles[current] ?? {}
  const monthC = completeness(collection, sites, [current])
  const sel = selected ? collection.cells[cellKey(selected.siteId, metric, selected.month)] : undefined
  const selSite = selected ? sites.find((s) => s.id === selected.siteId) : undefined

  const template = () => {
    const lines = [["site", "site_id", "metric_id", "metric", "unit", "month", "value", "source", "evidence", "note"].join(",")]
    for (const s of sites) for (const mt of METRICS.filter((x) => appliesTo(x, s.type))) {
      const c = collection.cells[cellKey(s.id, mt.id, current)]
      lines.push([s.name, s.id, mt.id, mt.label, mt.unit, current, c?.value ?? "", c?.source ?? "", c?.evidence ?? "", c?.note ?? ""].map(csvCell).join(","))
    }
    download(`esgos-collection-${current}.csv`, lines.join("\n"))
  }

  const onFile = async (f: File) => {
    try {
      const table = await readTable(f)
      const [head, ...body] = table
      const idx = (n: string) => head.findIndex((h) => h.trim().toLowerCase() === n)
      const [iSite, iMetric, iMonth, iValue, iSource, iEv, iNote] = ["site_id", "metric_id", "month", "value", "source", "evidence", "note"].map(idx)
      if (iSite < 0 || iMetric < 0 || iMonth < 0 || iValue < 0) throw new Error("Needs the columns site_id, metric_id, month and value (download the template).")
      const out = body
        .filter((r) => r[iValue]?.trim() && sites.some((s) => s.id === r[iSite]?.trim()) && METRIC_BY_ID[r[iMetric]?.trim() as MetricId] && /^\d{4}-\d{2}$/.test(r[iMonth]?.trim()))
        .map((r) => ({
          siteId: r[iSite].trim(),
          metric: r[iMetric].trim() as MetricId,
          month: r[iMonth].trim(),
          value: Number(String(r[iValue]).replace(/,/g, "")),
          source: ((iSource >= 0 && (r[iSource]?.trim() as CellSource)) || "bill") as CellSource,
          evidence: iEv >= 0 ? r[iEv]?.trim() : undefined,
          note: iNote >= 0 ? r[iNote]?.trim() : undefined,
        }))
        .filter((r) => Number.isFinite(r.value) && r.source in SOURCE_TEXT)
      const { changed, unchanged } = importCollection(out, f.name)
      setMessage(`${changed} value${changed === 1 ? "" : "s"} imported from ${f.name}${unchanged ? `; ${unchanged} unchanged row${unchanged === 1 ? "" : "s"} skipped` : ""}.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not read the file.")
    }
  }

  return (
    <div>
      {switcher}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Eyebrow className="flex items-center gap-2">
            <CalendarCheck2 size={13} /> Monthly data collection · {state.group.fiscalYear}
          </Eyebrow>
          <p className="mt-1 text-sm text-muted">Issue the month&apos;s requests, take the values with evidence, review, close. Estimates are kept but never count as collected.</p>
        </div>
        <div className="grid grid-cols-4 gap-x-5 text-right">
          {[
            [`${closed.length}`, "months closed", closed.length >= 3 ? "text-accent" : "text-amber", "Pilot target: 3 to 6"],
            [`${Math.round(yearC.share * 100)}%`, "collected", "", `${fmt(yearC.have)} of ${fmt(yearC.expected)} required values`],
            [`${fmt(yearC.est)}`, "estimates", yearC.est ? "text-amber" : "", "Kept, not counted"],
            [`${yearC.have ? Math.round((yearC.approved / yearC.have) * 100) : 0}%`, "reviewed", "", "Of collected values"],
          ].map(([v, l, tone, title]) => (
            <div key={l} title={title}>
              <div className={cn("text-2xl font-medium tracking-tight", tone)}>{v}</div>
              <div className="text-[11px] text-muted">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cycles */}
      <div className="mt-5 grid grid-cols-6 gap-1.5 sm:grid-cols-12" role="tablist" aria-label="Months">
        {months.map((mo) => {
          const c = collection.cycles[mo] ?? {}
          const comp = completeness(collection, sites, [mo])
          const active = mo === current
          return (
            <button
              key={mo}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setMonth(mo)
                setSelected(null)
              }}
              className={cn("rounded-md border px-1.5 py-2 text-left transition-colors", active ? "border-fg bg-surface-2" : "border-line hover:bg-surface-2/60")}
            >
              <div className="flex items-center justify-between text-[11px] font-medium">
                {monthLabel(mo)}
                {c.closedAt ? <Lock size={10} className="text-accent" /> : c.issuedAt ? <Send size={10} className="text-amber" /> : null}
              </div>
              <div className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-surface-3">
                <span className="bg-accent" style={{ width: `${comp.expected ? (comp.have / comp.expected) * 100 : 0}%` }} />
                <span className="bg-amber" style={{ width: `${comp.expected ? (comp.est / comp.expected) * 100 : 0}%` }} />
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface/40 p-3 text-sm">
        <span className="font-medium">{monthLabel(current, true)}</span>
        <span className="text-xs text-muted">
          {Math.round(monthC.share * 100)}% collected · {monthC.est} estimated · {monthC.missing} missing
          {cyc.issuedAt && !cyc.closedAt && ` · ${cyc.requests ?? 0} requests sent, due ${new Date(cyc.due! + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
          {cyc.closedAt && " · closed"}
        </span>
        <span className="ml-auto flex flex-wrap gap-2">
          {!cyc.issuedAt && (
            <Button size="sm" variant="primary" onClick={() => issueCycle(current)}>
              <Send size={13} /> Send requests to owners
            </Button>
          )}
          {cyc.issuedAt && !cyc.closedAt && client.kind === "sample" && (
            <Button size="sm" variant="ghost" onClick={() => simulateReturns(current)}>
              <Sparkles size={13} /> Owners reply (demo)
            </Button>
          )}
          {!cyc.closedAt && (
            <Button size="sm" onClick={() => reviewCycle(current)}>
              <Check size={13} /> Approve submitted
            </Button>
          )}
          {cyc.closedAt ? (
            <Button size="sm" variant="ghost" onClick={() => closeCycle(current, false)}>
              Reopen
            </Button>
          ) : (
            <Button size="sm" onClick={() => closeCycle(current, true)} disabled={!cyc.issuedAt}>
              <Lock size={13} /> Close month
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={template}>
            <Download size={13} /> Template
          </Button>
          <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> Import
          </Button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </span>
      </div>
      {message && <p className="mt-2 text-xs text-muted">{message}</p>}

      {/* Metric picker */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-line">
        {TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTopic(t)
              setMetric(METRICS.find((x) => x.topic === t)!.id)
              setSelected(null)
            }}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm", topic === t ? "border-hue-plan text-fg" : "border-transparent text-muted hover:text-fg")}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {METRICS.filter((x) => x.topic === topic).map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => {
              setMetric(x.id)
              setSelected(null)
            }}
            className={cn("rounded-md border px-2.5 py-1 text-xs", metric === x.id ? "border-fg text-fg" : "border-line text-muted hover:text-fg")}
          >
            {x.label} <span className="text-faint">· {x.unit}</span>
            {x.extra && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-hue-plan/15 px-1 text-[10px] text-hue-plan" title={`Added from the gap analysis: ${x.extra.gap}`}>
                <Plus size={9} /> added
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-faint">
        Owner: {m.owner} · Evidence: {m.evidence} · Feeds {m.brsr.join(", ")}
        {m.optional ? " · Leave blank where a plant has none" : ""}
        {m.help ? ` · ${m.help}` : ""}
      </p>

      {/* Grid */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[820px] border-separate border-spacing-0.5 text-xs">
          <thead>
            <tr className="text-[10px] text-faint">
              <th className="w-48 text-left font-medium">Site</th>
              {months.map((mo) => (
                <th key={mo} className={cn("font-medium", mo === current && "text-fg")}>
                  {monthLabel(mo)}
                </th>
              ))}
              <th className="text-right font-medium">Year</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const year = months.reduce((sum, mo) => {
                const c = collection.cells[cellKey(s.id, metric, mo)]
                return c && c.status !== "estimated" ? (m.stock ? c.value : sum + c.value) : sum
              }, 0)
              return (
                <tr key={s.id}>
                  <td className="truncate pr-2 text-muted" title={s.name}>
                    {s.name}
                  </td>
                  {months.map((mo) => {
                    const c = collection.cells[cellKey(s.id, metric, mo)]
                    const isSel = selected?.siteId === s.id && selected.month === mo
                    return (
                      <td key={mo} className="p-0">
                        <button
                          type="button"
                          onClick={() => setSelected({ siteId: s.id, month: mo })}
                          title={c ? `${fmt(c.value, 2)} ${m.unit} · ${c.status} · ${SOURCE_TEXT[c.source]}${c.note ? ` · ${c.note}` : ""}` : "Missing"}
                          className={cn(
                            "h-8 w-full rounded text-[10px] tabular-nums transition-colors",
                            !c && (m.optional ? "border border-dotted border-line text-faint" : "border border-dashed border-line-strong text-faint"),
                            c?.status === "approved" && "bg-accent/80 text-[#04110c]",
                            c?.status === "submitted" && "bg-accent/25 text-fg",
                            c?.status === "estimated" && "bg-amber/30 text-fg",
                            isSel && "ring-2 ring-fg",
                          )}
                        >
                          {c ? short(c.value) : ""}
                        </button>
                      </td>
                    )
                  })}
                  <td className="pl-2 text-right tabular-nums text-muted">{year ? short(year) : "—"}</td>
                </tr>
              )
            })}
            <tr className="text-[10px] text-muted">
              <td className="pt-1 font-medium">Total (collected)</td>
              {months.map((mo) => (
                <td key={mo} className="pt-1 text-center tabular-nums">
                  {(() => {
                    const t = monthTotal(collection, sites, metric, mo)
                    return t.n ? short(t.total) : ""
                  })()}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent/80" /> Reviewed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent/25" /> Submitted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber/30" /> Estimate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-line-strong" /> Missing
        </span>
      </div>

      {selected && selSite && <CellEditor key={`${selected.siteId}${metric}${selected.month}`} siteId={selected.siteId} siteName={selSite.name} metric={metric} month={selected.month} onSave={setCell} cell={sel} />}

      {/* Totals and checks */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <Eyebrow>{closed.length ? `Totals · ${closed.length} closed month${closed.length === 1 ? "" : "s"}` : "Totals · all months so far"}</Eyebrow>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] text-faint">
                <th className="py-1.5 font-medium">Measure</th>
                <th className="py-1.5 text-right font-medium">Collected</th>
                <th className="py-1.5 text-right font-medium">With estimates</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Electricity", totals.electricityGJ, totalsEst.electricityGJ, "GJ"],
                  ["Fuels", totals.fuelGJ, totalsEst.fuelGJ, "GJ"],
                  ["Total energy (P6 E1)", totals.totalGJ, totalsEst.totalGJ, "GJ"],
                  ["Scope 1 (P6 E7)", totals.scope1, totalsEst.scope1, "tCO2e"],
                  ...(totalsEst.scope1Parts.mobile ? [["  of which company vehicles", totals.scope1Parts.mobile, totalsEst.scope1Parts.mobile, "tCO2e"]] : []),
                  ...(totalsEst.scope1Parts.fugitive ? [["  of which refrigerant leaks", totals.scope1Parts.fugitive, totalsEst.scope1Parts.fugitive, "tCO2e"]] : []),
                  ["Biogenic CO2 (memo, outside Scope 1)", totals.biogenicCO2, totalsEst.biogenicCO2, "tCO2"],
                  ["Scope 2, location-based (P6 E7)", totals.scope2, totalsEst.scope2, "tCO2"],
                  ["Water withdrawal (P6 E3)", totals.waterWithdrawal, totalsEst.waterWithdrawal, "kL"],
                  ["Waste (P6 E9)", totals.waste, totalsEst.waste, "t"],
                  ["Production", totals.production, totalsEst.production, "t"],
                  ["LTIFR (P3 E11)", totals.ltifr, totalsEst.ltifr, "per million h"],
                  ...(totalsEst.ltifrEmployees !== undefined ? [["  employees", totals.ltifrEmployees, totalsEst.ltifrEmployees, "per million h"]] : []),
                  ...(totalsEst.ltifrWorkers !== undefined ? [["  workers", totals.ltifrWorkers, totalsEst.ltifrWorkers, "per million h"]] : []),
                ] as [string, number | undefined, number | undefined, string][]
              ).map(([label, a, b, unit]) => (
                <tr key={label} className="border-b border-line">
                  <td className={cn("py-1.5 text-muted", label.startsWith("  ") && "pl-4 text-xs text-faint")}>{label.trim()}</td>
                  {/* A rate of 0 is a value; a total of 0 means nothing collected yet. */}
                  <td className="py-1.5 text-right tabular-nums">
                    {a !== undefined && (a || unit === "per million h") ? fmt(a, a < 10 ? 2 : 0) : "—"} <span className="text-[10px] text-faint">{unit}</span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted">{b !== undefined && b && b !== a ? fmt(b, b < 10 ? 2 : 0) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <details className="mt-2 text-xs text-muted">
            <summary className="flex cursor-pointer items-center gap-1.5 text-faint">
              <Info size={12} /> Factors used
            </summary>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {factorNotes(collection).map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </details>
        </section>
        <section>
          <Eyebrow className="flex items-center gap-2">
            <TriangleAlert size={12} /> Checks · {allFlags.length}
          </Eyebrow>
          <ul className="mt-2 space-y-1 text-xs">
            {allFlags.slice(0, 10).map((f) => (
              <li key={f.key + f.kind} className="flex items-start gap-2">
                <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", f.kind === "jump" || f.kind === "pf" ? "bg-hue-gaps" : "bg-amber")} />
                <span className="text-muted">
                  {monthLabel(f.month)} · {f.text}
                </span>
              </li>
            ))}
            {!allFlags.length && <li className="text-faint">No checks raised.</li>}
            {allFlags.length > 10 && <li className="text-faint">{allFlags.length - 10} more in the data workbook export.</li>}
          </ul>
          {client.energyFile && (
            <p className="mt-4 flex items-start gap-1.5 text-xs text-faint">
              <FileSpreadsheet size={12} className="mt-0.5 shrink-0" /> Electricity for the months {client.energyFile.file} covers ({client.energyFile.period}) is prefilled from it. kWh is derived from kVAh, so it stays an estimate until the bills are in.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

function CellEditor({
  siteId,
  siteName,
  metric,
  month,
  cell,
  onSave,
}: {
  siteId: string
  siteName: string
  metric: MetricId
  month: string
  cell?: { value: number; source: CellSource; status: string; evidence?: string; note?: string; by: string; at: string }
  onSave: (siteId: string, metric: MetricId, month: string, p: Record<string, unknown> | null) => void
}) {
  const m = METRIC_BY_ID[metric]
  const [value, setValue] = useState(cell ? String(cell.value) : "")
  const [source, setSource] = useState<CellSource>(cell?.source ?? "bill")
  const [evidence, setEvidence] = useState(cell?.evidence ?? "")
  const [note, setNote] = useState(cell?.note ?? "")
  const num = Number(value.replace(/,/g, ""))
  const valid = value.trim() !== "" && Number.isFinite(num)
  return (
    <div className="mt-4 rounded-lg border border-line-strong bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">
          {siteName} · {m.label} · {monthLabel(month, true)}
        </span>
        {cell && (
          <span className="text-xs text-muted">
            {cell.status} · {cell.by} · {new Date(cell.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[10rem_10rem_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="text-[11px] text-muted">
          Value ({m.unit})
          <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.,-]/g, ""))} inputMode="decimal" className="mt-1 h-9 w-full rounded-md border border-line-strong bg-bg px-2.5 text-sm text-fg tabular-nums outline-none focus:border-fg/60" />
        </label>
        <label className="text-[11px] text-muted">
          Source
          <select value={source} onChange={(e) => setSource(e.target.value as CellSource)} className="mt-1 h-9 w-full rounded-md border border-line-strong bg-bg px-2 text-sm text-fg">
            {(Object.keys(SOURCE_TEXT) as CellSource[]).map((k) => (
              <option key={k} value={k}>
                {SOURCE_TEXT[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-muted">
          Evidence
          <input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder={m.evidence} className="mt-1 h-9 w-full rounded-md border border-line-strong bg-bg px-2.5 text-sm text-fg outline-none placeholder:text-faint focus:border-fg/60" />
        </label>
        <label className="text-[11px] text-muted">
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line-strong bg-bg px-2.5 text-sm text-fg outline-none focus:border-fg/60" />
        </label>
      </div>
      {cell?.note && cell.note !== note && <p className="mt-2 text-xs text-faint">{cell.note}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" disabled={!valid} onClick={() => onSave(siteId, metric, month, { value: num, source, evidence, note, status: source === "estimate" ? "estimated" : "submitted" })}>
          Save
        </Button>
        {cell && cell.status === "submitted" && (
          <Button size="sm" onClick={() => onSave(siteId, metric, month, { status: "approved" })}>
            <Check size={13} /> Approve
          </Button>
        )}
        {cell && (
          <Button size="sm" variant="ghost" onClick={() => onSave(siteId, metric, month, null)}>
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
