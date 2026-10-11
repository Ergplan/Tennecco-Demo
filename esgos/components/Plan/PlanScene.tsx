"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, CalendarCheck2, CalendarRange, FileDown, FileText, Check, ClipboardCheck, History, ShieldCheck, Landmark, MapPinned, RefreshCcw, RotateCcw, Send, TriangleAlert, Zap, type LucideIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { buildCollectionTasks, issuePlan } from "@/esgos/lib/pipelines"
import { goTo } from "@/esgos/lib/navigation"
import { entitiesInBoundary, inBoundary, profileOrder } from "@/esgos/lib/selectors"
import { countValue, derived } from "@/esgos/lib/derived"
import { GAP_RULES_VERSION } from "@/esgos/lib/gapEngine"
import { fmtDate } from "@/esgos/lib/format"
import { PERIOD } from "@/esgos/lib/demoData"
import type { DataPoint, Site } from "@/esgos/lib/types"
import { getClient } from "@/esgos/lib/clients"
import { filedDp, filedMetric, filedMetrics } from "@/esgos/lib/filed"
import { AgentLine } from "../common/AgentLine"
import { Button, Eyebrow, SceneLayout } from "../common/ui"
import { Value } from "../common/Value"
import { SiteVisual } from "../Factory/SiteVisual"
import { cn } from "../common/cn"
import { RoadmapView } from "./RoadmapView"
import { CollectionView } from "./CollectionView"
import { DeliverablesView } from "./DeliverablesView"
import { ReviewView } from "./ReviewView"
import { ClosureView, useBaseline } from "./ClosureView"
import { ReportView } from "./ReportView"
import { PlanSteps } from "./PlanSteps"
import { PeerBenchmark } from "./PeerBenchmark"
import { peerClient, peerDp, peerMetric } from "@/esgos/lib/peer"

const GJ_PER_MWH = 3.6
const SUMMARY_ICON: Record<string, LucideIcon> = {
  "sites in boundary": MapPinned,
  entities: Landmark,
  "ergOS connections": Zap,
  "plants from your energy file": Zap,
  "sites profiled": ClipboardCheck,
  gaps: TriangleAlert,
  "tasks sent to site owners": Send,
}
const BASELINE = ["p6.e7.scope1", "p6.e7.scope2", "p6.l2.scope3", "p6.e3.withdrawal", "p6.e9.total", "p3.e11.ltifr.workers", "p5.e3b.femaleWages", "p8.e4.msme"]
const GJ_PER_KL_DIESEL = 35.9 // NCV 43 GJ/t at 0.835 t/kL

// Public clients: a plant's share of the filed company electricity, by its share
// of disclosed capacity in the same unit. Context only; counted as open.
function capacityEstimate(site: Site, sites: Site[]): DataPoint | undefined {
  const a = filedMetric("p6.e1.A")
  const d = filedMetric("p6.e1.D")
  if (!a || !d || typeof a.value !== "number" || typeof d.value !== "number" || !site.capacityValue) return undefined
  const unit = site.capacity?.match(/KL|MT/)?.[0]
  const peers = sites.filter((x) => x.capacityValue && x.capacity?.includes(unit ?? "?"))
  const total = peers.reduce((n, x) => n + (x.capacityValue ?? 0), 0)
  if (!total) return undefined
  const share = site.capacityValue / total
  const gj = Math.round((a.value + d.value) * share)
  return {
    id: `est:${site.id}:elec`,
    indicator: "P6.E1.elec",
    label: `${site.name} electricity (estimate)`,
    scope: { siteId: site.id },
    value: gj,
    unit: "GJ",
    period: a.fy,
    source: "estimate",
    sourceRef: `${a.fy} filed electricity (A+D) × ${Math.round(share * 1000) / 10}% of disclosed ${unit} capacity`,
    evidenceState: "none",
    note: `Not plant data. Filed company electricity ${a.value + d.value} GJ × ${site.capacityValue} ÷ ${total} ${unit} capacity across ${peers.length} plants. Shown for context; counts as open.`,
    mode: "public",
  }
}

// Benchmark electricity estimates for sites without meters (demo). Counted as open.
function estimateFor(site: Site): DataPoint {
  const mwh = site.type === "office" ? (site.name === "Delhi" ? 420 : 160) : site.type === "warehouse" ? 900 : 4800
  return {
    id: `est:${site.id}:elec`,
    indicator: "P6.E1.elec",
    label: `${site.name} electricity (estimate)`,
    scope: { siteId: site.id },
    value: mwh,
    unit: "MWh",
    period: PERIOD,
    source: "estimate",
    sourceRef: site.type === "factory" ? "Benchmark: sector intensity × typical output (demo)" : "Benchmark: floor area × CEA office intensity (demo)",
    evidenceState: "none",
    note: "Estimates are shown for context only and count as open in coverage.",
  }
}

type Row = { key: string; label: string; sub?: string; dp?: DataPoint; status?: { tone: "sync" | "open"; text: string }; strong?: boolean }

// Row in the P6 E1 draft → the same line in the client's filed BRSR.
const FILED_ROW: Record<string, string> = { A: "p6.e1.A", B: "p6.e1.B", D: "p6.e1.D", EF: "p6.e1.E", TE: "p6.e1.total", I: "p6.e1.intensity" }

export function PlanScene() {
  const state = useStore()
  useBaseline()
  const { say, gaps, tasks, plan, dataPoints, connect, energy, profiles, reset, setUi } = state
  const [revealed, setRevealed] = useState(0)
  const sites = inBoundary(state)
  const ordered = profileOrder(state)
  const connected = sites.filter((s) => connect.siteStatus[s.id] === "connected" && energy[s.id])
  const notMetered = sites.filter((s) => connect.siteStatus[s.id] !== "connected")

  const client = getClient()
  const isPublic = client.kind === "public"
  const fy = client.lastBrsr?.fy ?? ""
  // Before listing there is no filed baseline: the listed peer's filing stands beside the draft.
  const peer = peerClient()
  const fileEnergy = connected.some((x) => energy[x.id]?.sourceLabel)

  useEffect(() => {
    say(getClient().preIpo ? "Your BRSR foundation and listing roadmap are ready." : "Your BRSR foundation is ready.")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows: Row[] = useMemo(() => {
    const reMWh = connected.reduce((s, x) => s + energy[x.id].annualMWh * energy[x.id].renewableShare, 0)
    const nonReMWh = connected.reduce((s, x) => s + energy[x.id].annualMWh * (1 - energy[x.id].renewableShare), 0)
    const dgKL = connected.reduce((s, x) => s + (energy[x.id].dgDieselKL || 0), 0)
    const elecIds = connected.map((x) => `dp:${x.id}:elec.annual`)
    const fuelGaps = gaps.filter((g) => g.missingInput === "fuel.boiler")
    const fuelSync = Object.keys(state.records.erpFuel).filter((id) => sites.some((s) => s.id === id)).length
    // A client's own energy file: consumption per plant, no renewable split, no DG meters.
    const fileLabel = connected.map((x) => energy[x.id].sourceLabel).find(Boolean)
    const src = fileLabel ? ("file" as const) : ("ergos" as const)
    const reRow = derived("p6:A", "Electricity from renewable sources (A)", Math.round(reMWh * GJ_PER_MWH), { unit: "GJ", source: src, mode: isPublic ? "live" : "mock", sourceRef: `Open access, wind and rooftop meters at ${connected.length} sites`, components: connected.map((x) => `dp:${x.id}:elec.re`), period: PERIOD, indicator: "P6.E1.elec" })
    const nonReRow = derived("p6:D", "Electricity from non-renewable sources (D)", Math.round(nonReMWh * GJ_PER_MWH), { unit: "GJ", source: src, mode: isPublic ? "live" : "mock", sourceRef: fileLabel ? `${fileLabel}: ${connected.length} plants, kVAh × assumed power factor` : `Grid incomers and exchange purchases at ${connected.length} sites`, components: connected.map((x) => `dp:${x.id}:elec.grid`), period: PERIOD, indicator: "P6.E1.elec" })
    const dgRow = derived("p6:E-dg", "DG diesel", Math.round(dgKL * GJ_PER_KL_DIESEL), { unit: "GJ", source: src, mode: isPublic ? "live" : "mock", sourceRef: `DG fuel sensors; ${dgKL} kL × ${GJ_PER_KL_DIESEL} GJ/kL`, components: connected.map((x) => `dp:${x.id}:dg`), period: PERIOD, indicator: "P6.E1.fuel" })
    const totalElec = derived("p6:elec", "Total electricity, metered sites", Math.round((reMWh + nonReMWh) * GJ_PER_MWH), { unit: "GJ", source: src, mode: isPublic ? "live" : "mock", sourceRef: fileLabel ? `${connected.length} plants in the ${fileLabel}` : `${connected.length} metered sites`, components: elecIds, period: PERIOD, indicator: "P6.E1.elec" })
    const none = connected.length === 0
    const noMeters = { tone: "open" as const, text: "Open · no metered sites yet" }
    const out: Row[] = [
      { key: "h1", label: "From renewable sources" },
      { key: "A", label: "Total electricity consumption (A)", sub: "Open-access solar, wind and rooftop", ...(none ? { status: noMeters } : fileLabel ? { status: { tone: "open" as const, text: "Open · group solar not allocated to plants" } } : { dp: reRow }) },
      { key: "B", label: "Total fuel consumption (B)", sub: "Biomass boilers", status: { tone: "open", text: "Open · biomass quantities not sourced" } },
      { key: "h2", label: "From non-renewable sources" },
      { key: "D", label: "Total electricity consumption (D)", sub: "Grid and power exchange", ...(none ? { status: noMeters } : { dp: nonReRow }) },
      { key: "E1", label: "Total fuel consumption (E) — DG", sub: "Diesel generator sets", ...(none ? { status: noMeters } : fileLabel ? { status: { tone: "open" as const, text: "Open · not in the energy file" } } : { dp: dgRow }) },
      {
        key: "E2",
        label: "Total fuel consumption (E) — boilers",
        sub: "PNG, LPG, diesel",
        status: fuelGaps.length ? { tone: "open", text: `After ERP sync at ${fuelSync} site${fuelSync === 1 ? "" : "s"} · open at ${fuelGaps.length}` } : { tone: "sync", text: `After ERP sync at ${fuelSync} sites` },
      },
      { key: "T", label: fileLabel ? "Electricity, plants in the energy file" : "Electricity, all metered sites", sub: `${connected.length} of ${sites.length} sites`, ...(none ? { status: noMeters } : { dp: totalElec }), strong: true },
      ...(isPublic
        ? [
            { key: "EF", label: "Total fuel consumption (E), all fuels", sub: "As filed: DG, boilers and process fuels", status: { tone: "open" as const, text: "Open until fuel rows close" } },
            { key: "TE", label: "Total energy consumed (A to F)", sub: "Electricity and fuels", status: { tone: "open" as const, text: "Open until fuel rows close" }, strong: true },
          ]
        : []),
      { key: "I", label: "Energy intensity per rupee of turnover", sub: "Needs total energy", status: { tone: "open", text: "Open until fuel rows close" } },
    ]
    for (const s of connected) {
      const dp = dataPoints.find((d) => d.id === `dp:${s.id}:elec.annual`)
      if (dp)
        out.push({
          key: `site-${s.id}`,
          label: s.name,
          sub: energy[s.id].sourceLabel ? `${Math.round(energy[s.id].completeness * 100)}% of months from readings` : `Renewable ${Math.round(energy[s.id].renewableShare * 100)}%`,
          dp: { ...dp, value: Math.round(energy[s.id].annualMWh * GJ_PER_MWH), unit: "GJ", note: [`${energy[s.id].annualMWh} MWh × 3.6 GJ/MWh.`, dp.note].filter(Boolean).join(" ") },
        })
    }
    if (isPublic) {
      for (const s of notMetered) {
        const est = capacityEstimate(s, sites)
        if (est) out.push({ key: `est-${s.id}`, label: s.name, sub: `Not metered · ${s.capacity}`, dp: est })
        else if (s.type === "factory") out.push({ key: `est-${s.id}`, label: s.name, sub: "Not metered", status: { tone: "open", text: "No public plant data" } })
      }
      return out
    }
    for (const s of notMetered) out.push({ key: `est-${s.id}`, label: s.name, sub: "Not on ergOS", dp: { ...estimateFor(s), value: Math.round((estimateFor(s).value as number) * GJ_PER_MWH), unit: "GJ" } })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected.length, gaps.length, dataPoints.length])

  // Rows materialise one by one as each ergOS-backed value is read.
  useEffect(() => {
    setRevealed(0)
    let i = 0
    const t = setInterval(() => {
      i++
      setRevealed(i)
      if (i >= rows.length) clearInterval(t)
    }, 260)
    return () => clearInterval(t)
  }, [rows.length])

  const entities = entitiesInBoundary(state)
  const profiled = sites.filter((s) => profiles[s.id]?.status === "done")
  const siteTasks = tasks.filter((t) => t.status === "open" && t.siteId)
  const pendingPlan = plan.issued ? [] : buildCollectionTasks()
  const summary = [
    { label: "sites in boundary", dp: countValue("plan:sites", "Sites in boundary", sites.length, "Confirmed against ergOS, GST and your list", sites.map((s) => `dp:${s.id}:location`), "owner") },
    {
      label: "entities",
      dp: isPublic
        ? { ...countValue("plan:entities", "Entities in boundary", entities.length, peer ? "Group companies from MCA and court records, and your boundary decision" : `Group companies in the filed ${fy} BRSR and your boundary decision`, entities.map((e) => `dp:${e.id}:cin`), peer ? "filing" : "brsr"), mode: "public" as const }
        : countValue("plan:entities", "Entities in boundary", entities.length, "MCA master data and your boundary decision", entities.map((e) => `dp:${e.id}:cin`), "mca"),
    },
    {
      label: fileEnergy ? "plants from your energy file" : "ergOS connections",
      dp: fileEnergy
        ? { ...countValue("plan:ergos", "Plants from the energy file", connected.length, "Plant rows matched in the client energy file", connected.map((s) => `dp:${s.id}:elec.annual`), "file"), mode: "live" as const }
        : { ...countValue("plan:ergos", "ergOS connections", connected.length, "Validated meters and energy summaries", connected.map((s) => `dp:${s.id}:elec.annual`), "ergos"), ...(isPublic ? { mode: "public" as const } : {}) },
    },
    { label: "sites profiled", dp: countValue("plan:profiled", "Sites profiled", profiled.length, "Owner answers and copied profiles", undefined, "owner") },
    { label: "gaps", dp: countValue("plan:gaps", "Gaps", gaps.length, GAP_RULES_VERSION) },
    { label: "tasks sent to site owners", dp: countValue("plan:tasks", "Tasks with site owners", siteTasks.length, "Not-sure answers, skipped sites and the collection plan") },
  ]
  const assured = (s: Site) => !gaps.some((g) => g.scope.siteId === s.id) && dataPoints.some((d) => d.scope.siteId === s.id && d.source === "vault" && d.evidenceState === "linked")
  const ownerGroups = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of tasks.filter((x) => x.origin === "plan")) m.set(t.ownerRole, (m.get(t.ownerRole) ?? 0) + 1)
    return [...m.entries()]
  }, [tasks])

  return (
    <SceneLayout
      visual={
        <div className="scrollbar-thin absolute inset-0 overflow-y-auto p-4 sm:p-8">
          <PlanSteps />
          {state.ui.planTab === "roadmap" ? (
            <RoadmapView />
          ) : state.ui.planTab === "closure" ? (
            <ClosureView />
          ) : state.ui.planTab === "collection" ? (
            <CollectionView />
          ) : state.ui.planTab === "report" ? (
            <ReportView />
          ) : state.ui.planTab === "review" ? (
            <ReviewView />
          ) : state.ui.planTab === "deliverables" ? (
            <DeliverablesView />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-6">
                {summary.map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <Value dp={s.dp} size="xl" badge="below" detail={false} />
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      {(() => {
                        const I = SUMMARY_ICON[s.label]
                        return I ? <I size={12} aria-hidden /> : null
                      })()}
                      {s.label}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-10">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <Eyebrow>Draft · Principle 6, Essential Indicator 1</Eyebrow>
                    <h2 className="mt-1 text-xl font-medium tracking-tight">Energy consumption · {state.group.fiscalYear}</h2>
                  </div>
                  <span className="text-xs text-faint">Every value opens its provenance</span>
                </div>
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-faint">
                      <th className="py-2 font-medium">Parameter</th>
                      <th className="py-2 text-right font-medium">{state.group.fiscalYear}</th>
                      {isPublic && <th className="py-2 pl-4 text-right font-medium">{peer ? `${peer.shortName} ${peer.lastBrsr?.fy} (peer)` : `${fy} filed`}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, revealed).map((r) =>
                      r.key.startsWith("h") ? (
                        <motion.tr key={r.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <td colSpan={isPublic ? 3 : 2} className="pb-1 pt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                            {r.label}
                          </td>
                        </motion.tr>
                      ) : r.key === "site-first" ? null : (
                        <motion.tr key={r.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }} className={cn("border-b border-line", r.key.startsWith("site-") || r.key.startsWith("est-") ? "text-muted" : "")}>
                          <td className={cn("py-2.5 pr-3", r.key.startsWith("site-") || r.key.startsWith("est-") ? "pl-4" : "")}>
                            <div className={cn(r.strong && "font-semibold")}>{r.label}</div>
                            {r.sub && <div className="text-xs text-faint">{r.sub}</div>}
                          </td>
                          <td className="py-2.5 text-right">
                            {r.dp ? (
                              <Value dp={r.dp} size={r.strong ? "md" : "sm"} className="justify-end" />
                            ) : r.status ? (
                              <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs", r.status.tone === "sync" ? "border-amber/30 bg-amber/10 text-amber" : "border-dashed border-grey text-muted")}>{r.status.text}</span>
                            ) : null}
                          </td>
                          {isPublic && (
                            <td className="py-2.5 pl-4 text-right">
                              {peer
                            ? FILED_ROW[r.key] && peerMetric(FILED_ROW[r.key]) && <Value dp={peerDp(peerMetric(FILED_ROW[r.key])!)} size="sm" className="justify-end" detail={false} />
                            : FILED_ROW[r.key] && filedMetric(FILED_ROW[r.key]) && <Value dp={filedDp(filedMetric(FILED_ROW[r.key])!)} size="sm" className="justify-end" detail={false} />}
                            </td>
                          )}
                        </motion.tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {peer && <PeerBenchmark />}

              {isPublic && !peer && (
                <div className="mt-10">
                  <Eyebrow>Last filed · {fy} BRSR</Eyebrow>
                  <p className="mt-1 text-sm text-muted">The baseline this year is compared with. Each value opens its page in the filing.</p>
                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-4">
                    {BASELINE.map((key) => filedMetric(key))
                      .filter((m): m is NonNullable<typeof m> => !!m)
                      .map((m) => (
                        <div key={m.key}>
                          <div className="text-xs text-muted">{m.label}</div>
                          <Value dp={filedDp(m)} size="md" badge="below" detail={false} className="mt-0.5 -ml-1 px-1" />
                        </div>
                      ))}
                  </div>
                  <p className="mt-4 text-xs text-faint">
                    {filedMetrics().length} filed values captured · {client.lastBrsr?.assurance?.provider ? `assured by ${client.lastBrsr.assurance.provider}` : client.lastBrsr?.assurance?.type}
                  </p>
                </div>
              )}

              <div className="mt-10">
                <Eyebrow>Sites</Eyebrow>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                  {ordered.filter((s) => !state.ui.siteFilter || s.type === state.ui.siteFilter).map((s) => {
                    const n = gaps.filter((g) => g.scope.siteId === s.id).length
                    return (
                      <div key={s.id} className="rounded-xl border border-line p-2">
                        <SiteVisual type={s.type} phase="building" meters={connect.validated[s.id] ?? []} muted={connect.siteStatus[s.id] !== "connected"} gaps={n} assured={assured(s)} documents={dataPoints.some((d) => d.scope.siteId === s.id && d.source === "vault")} title={`${s.name}${assured(s) ? ", evidence linked" : ""}`} />
                        <div className="truncate text-xs font-medium">{s.name}</div>
                        <div className="text-[11px] text-faint">{assured(s) ? "Evidence linked" : n ? `${n} gap${n === 1 ? "" : "s"}` : "No site gaps"}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      }
      panel={
        <div className="flex flex-col gap-6 p-6">
          <AgentLine />
          {state.analysis.stale && (
            <div className="rounded-2xl border border-amber/30 bg-amber/[0.05] p-4 text-sm">
              Inputs changed since the gap check.{" "}
              <button type="button" className="text-teal hover:underline" onClick={() => goTo("gaps")}>
                Re-check coverage
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            {!plan.issued ? (
              <motion.div key="pre" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <p className="text-sm leading-relaxed text-muted">
                  The collection plan sends {pendingPlan.length} request{pendingPlan.length === 1 ? "" : "s"} for data, documents and decisions to their owners, due in 21 to 45 days. Automatic fixes are queued with the ergOS, ERP and HR systems teams.
                </p>
                <div className="flex flex-col gap-2">
                  <Button variant="primary" size="lg" onClick={issuePlan}>
                    <Send size={15} /> Issue collection plan
                  </Button>
                  <Button
                    onClick={() => {
                      setUi({ showAllGaps: true, gapSiteFilter: null })
                      goTo("gaps")
                    }}
                  >
                    <ArrowLeft size={14} /> Fix gaps first
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="post" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <div className="rounded-2xl border border-accent/30 bg-accent/[0.05] p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-accent">
                    <Check size={15} /> Collection plan issued {plan.issuedAt ? `· ${fmtDate(plan.issuedAt)}` : ""}
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {ownerGroups.map(([owner, n]) => (
                      <li key={owner} className="flex justify-between gap-3">
                        <span className="text-muted">{owner}</span>
                        <span className="tnum">
                          {n} request{n === 1 ? "" : "s"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Eyebrow>What happens next</Eyebrow>
                  <ol className="mt-2 space-y-1">
                    {(
                      [
                        ["roadmap", "Agree the roadmap and owners", CalendarRange],
                        ["closure", "Close the gaps: each one loops back to collection, documents or the Board", RefreshCcw],
                        ["collection", "Collect 3–6 months of data", CalendarCheck2],
                        ["report", "Read the BRSR test report and its data workbook", FileText],
                        ["review", "Review the test report with data owners", ShieldCheck],
                        ["deliverables", "Download the deliverables", FileDown],
                      ] as const
                    ).map(([key, label, Icon], i) => (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => setUi({ planTab: key })}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                        >
                          <span className="tnum w-4 text-xs">{i + 1}</span>
                          <Icon size={14} className="text-hue-plan" />
                          {label}
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setUi({ auditOpen: true })}>
                    <History size={14} /> Audit trail
                  </Button>
                  <Button variant="ghost" onClick={() => reset()}>
                    <RotateCcw size={14} /> Restart demo
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      }
    />
  )
}
