"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, FileText, Inbox, Loader2, Lock, ScanText, Upload } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, Eyebrow, PageHead, Pill, fmt, pct } from "@/components/ui/kit"
import { cn } from "@/components/ui/cn"
import { BRSR, GJ_PER_MWH } from "@/lib/brsr"
import { ENTITIES, entityById } from "@/lib/entities"
import { BLR_MONTHLY, MONTHS, SAMPLE_BILLS, type SampleBill } from "@/lib/platform"
import { GRID_EF, PLANT } from "@/lib/power"
import { SITES } from "@/lib/sites"

type Stage = 0 | 1 | 2 | 3 | 4
const STAGES = ["Reading the document", "Fields found", "Mapped to site and indicator", "Checked against history"]

type Uploaded = { id: string; file: string; size: number; siteId: string | null }

const GUESS: [RegExp, string][] = [
  [/bescom|yelahanka|bengaluru|bangalore|blr|fmgil/i, "fmgil-blr"],
  [/chennai|oragadam|tangedco|tnpdcl/i, "tcail-chennai"],
  [/chakan|msedcl|pune/i, "tcail-chakan1"],
  [/hosur/i, "taipl-hosur"],
  [/patiala|pspcl/i, "fmgil-patiala"],
  [/bhiwadi|jvvnl|avvnl/i, "fmgil-bhiwadi"],
  [/parwanoo|hpsebl/i, "fmbil-parwanoo"],
  [/sanand|ugvcl|mgvcl/i, "taipl-sanand"],
  [/pithampur|mpwz/i, "tcail-pithampur"],
  [/bawal|dhbvn/i, "taipl-bawal"],
  [/puducherry|pondicherry/i, "taipl-puducherry"],
]

const plants = SITES.filter((s) => s.type === "plant")

export default function Platform() {
  const [posted, setPosted] = useState<Set<string>>(new Set())
  const [active, setActive] = useState<SampleBill | null>(null)
  const [stage, setStage] = useState<Stage>(0)
  const [queue, setQueue] = useState<SampleBill[]>([])
  const [uploads, setUploads] = useState<Uploaded[]>([])
  const [locked, setLocked] = useState(false)
  const [drag, setDrag] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function run(bill: SampleBill) {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setActive(bill)
    setStage(0)
    ;[1, 2, 3, 4].forEach((s, i) => {
      timers.current.push(
        setTimeout(() => {
          setStage(s as Stage)
          if (s === 4) setPosted((p) => new Set(p).add(bill.id))
        }, 650 * (i + 1)),
      )
    })
  }

  useEffect(() => {
    if (stage === 4 && queue.length) {
      const [next, ...rest] = queue
      const t = setTimeout(() => {
        setQueue(rest)
        run(next)
      }, 500)
      return () => clearTimeout(t)
    }
  }, [stage, queue])

  function readAll() {
    const todo = SAMPLE_BILLS.filter((b) => !posted.has(b.id))
    if (!todo.length) return
    setQueue(todo.slice(1))
    run(todo[0])
  }

  function onFiles(files: FileList | null) {
    if (!files) return
    const next = Array.from(files).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      file: f.name,
      size: f.size,
      siteId: GUESS.find(([re]) => re.test(f.name))?.[1] ?? null,
    }))
    setUploads((u) => [...next, ...u])
  }

  const reportingSites = useMemo(() => new Set(SAMPLE_BILLS.filter((b) => posted.has(b.id)).map((b) => b.siteId).concat(uploads.filter((u) => u.siteId).map((u) => u.siteId!))), [posted, uploads])
  const blrReady = posted.has("bescom-blr") && posted.has("ppa-blr")

  const maxMonth = Math.max(...BLR_MONTHLY)
  const avg = BLR_MONTHLY.reduce((a, b) => a + b, 0) / 12
  const annual = BLR_MONTHLY.reduce((a, b) => a + b, 0)
  const reAnnual = PLANT.ppaKWh * 12
  const locationT = (annual * GRID_EF) / 1e6
  const marketT = ((annual - reAnnual) * GRID_EF) / 1e6

  const filedEnergy = BRSR.tcail.energyTotal.value + BRSR.fmgil.energyTotal.value
  const filedRe = BRSR.tcail.energyRenewable.value + BRSR.fmgil.energyRenewable.value

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="esgOS · one ESG platform for Tenneco India"
        title="Every bill in one place. Baselines and BRSR Core out of it."
        lede="Plants send their electricity, fuel and water bills to one inbox, by upload or email. esgOS reads each one, maps it to the right entity, plant and indicator, checks it against history, and builds the baseline the pilot will be measured against."
        right={
          <div className="flex flex-wrap gap-2">
            {["Collect", "Validate", "Baseline", "Report"].map((s, i) => (
              <span key={s} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] text-muted">
                <span className="tnum grid h-4 w-4 place-items-center rounded-full bg-accent font-mono text-[9px] text-white">{i + 1}</span>
                {s}
              </span>
            ))}
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="p-0 xl:col-span-3">
          <div className="border-b border-line px-4 py-3">
            <p className="text-[13px] font-semibold">Tenneco India in esgOS</p>
            <p className="text-[12px] text-muted">
              <span className="tnum font-medium text-fg">{[...reportingSites].filter((id) => plants.some((p) => p.id === id)).length}</span> of {plants.length} plants reporting
            </p>
          </div>
          <ul className="scrollbar-thin max-h-[520px] divide-y divide-line overflow-y-auto">
            {ENTITIES.filter((e) => SITES.some((s) => s.entityId === e.id && s.type === "plant"))
              .sort((a, b) => Number(b.group === "Federal-Mogul Goetze group") - Number(a.group === "Federal-Mogul Goetze group"))
              .map((e) => {
              const sites = plants.filter((s) => s.entityId === e.id)
              const on = sites.filter((s) => reportingSites.has(s.id)).length
              return (
                <li key={e.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
                    <span className="flex-1 truncate text-[13px] font-medium">{e.short}</span>
                    <span className="tnum text-[11px] text-faint">
                      {on}/{sites.length}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-1 pl-4">
                    {sites.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 text-[12px]">
                        <span className={cn("h-1.5 w-1.5 rounded-full", reportingSites.has(s.id) ? "bg-green" : "bg-line-strong")} />
                        <span className={cn("truncate", reportingSites.has(s.id) ? "text-fg" : "text-muted")}>{s.name}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card className="p-0 xl:col-span-4">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <Inbox size={15} className="text-accent" /> Bill inbox
            </p>
            <button type="button" onClick={readAll} className="rounded-full bg-accent px-3 py-1 text-[12px] font-medium text-white disabled:opacity-40" disabled={posted.size === SAMPLE_BILLS.length || queue.length > 0}>
              Read all
            </button>
          </div>
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              onFiles(e.dataTransfer.files)
            }}
            className={cn("m-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors", drag ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent")}
          >
            <Upload size={20} className="text-accent" />
            <span className="mt-1.5 text-[13px] font-medium">Drop bills here, or click to choose</span>
            <span className="text-[11.5px] text-faint">PDF, scans, Excel or CSV · or forward to bills@ inbox</span>
            <input type="file" multiple className="sr-only" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv" onChange={(e) => onFiles(e.target.files)} />
          </label>
          {uploads.length > 0 && (
            <ul className="mx-4 mb-3 space-y-1.5">
              {uploads.map((u) => (
                <li key={u.id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-[12px]">
                  <FileText size={14} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate">{u.file}</span>
                  <select
                    value={u.siteId ?? ""}
                    onChange={(e) => setUploads((all) => all.map((x) => (x.id === u.id ? { ...x, siteId: e.target.value || null } : x)))}
                    className="max-w-[150px] rounded border border-line bg-surface px-1 py-0.5 text-[11.5px]"
                    aria-label={`Site for ${u.file}`}
                  >
                    <option value="">Pick a plant…</option>
                    {plants.map((s) => (
                      <option key={s.id} value={s.id}>
                        {entityById(s.entityId).short} · {s.city}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
          <ul className="divide-y divide-line border-t border-line">
            {SAMPLE_BILLS.map((b) => {
              const site = SITES.find((s) => s.id === b.siteId)!
              const done = posted.has(b.id)
              const busy = active?.id === b.id && stage < 4
              return (
                <li key={b.id}>
                  <button type="button" onClick={() => run(b)} className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2", active?.id === b.id && "bg-accent-soft")}>
                    <FileText size={16} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium">{b.file}</span>
                      <span className="block truncate text-[11.5px] text-faint">
                        {b.kind} · {entityById(site.entityId).short} {site.city}
                      </span>
                    </span>
                    {busy ? <Loader2 size={15} className="animate-spin text-accent" /> : done ? <CheckCircle2 size={15} className="text-green" /> : <span className="text-[11px] text-accent">Read</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card className="xl:col-span-5">
          <Eyebrow className="flex items-center gap-2">
            <ScanText size={13} /> What esgOS reads
          </Eyebrow>
          <AnimatePresence mode="wait">
            {!active ? (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10 text-center text-[13px] text-faint">
                Pick a bill from the inbox, or press “Read all”.
              </motion.p>
            ) : (
              <motion.div key={active.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 space-y-4">
                <div>
                  <p className="text-[14px] font-semibold">{active.file}</p>
                  <p className="text-[12px] text-muted">
                    {active.issuer} · {active.period} {active.illustrative && <Pill tone="amber">sample values</Pill>}
                  </p>
                </div>
                <ol className="flex gap-1">
                  {STAGES.map((s, i) => (
                    <li key={s} className="flex-1">
                      <span className={cn("block h-1.5 rounded-full transition-colors", stage > i ? "bg-accent" : "bg-surface-3")} />
                      <span className={cn("mt-1 block text-[10.5px] leading-tight", stage > i ? "text-fg" : "text-faint")}>{s}</span>
                    </li>
                  ))}
                </ol>
                {stage >= 2 && (
                  <motion.dl initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="divide-y divide-line rounded-xl border border-line">
                    {active.fields.map((f) => (
                      <div key={f.label} className="flex items-center gap-3 px-3 py-2 text-[12.5px]">
                        <dt className="w-40 shrink-0 text-muted">{f.label}</dt>
                        <dd className="tnum min-w-0 flex-1 font-medium">{f.value}</dd>
                        <span className={cn("font-mono text-[10.5px]", f.confidence >= 0.95 ? "text-green" : "text-amber")}>{Math.round(f.confidence * 100)}%</span>
                      </div>
                    ))}
                  </motion.dl>
                )}
                {stage >= 3 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-1.5">
                    {active.maps.map((m) => (
                      <Pill key={m} tone="blue">
                        {m}
                      </Pill>
                    ))}
                  </motion.div>
                )}
                {stage >= 4 && active.check && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn("flex gap-2 rounded-xl p-3 text-[12.5px]", active.check.ok ? "bg-green-soft text-green" : "bg-amber-soft text-amber")}
                  >
                    {active.check.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
                    <span className="text-fg">{active.check.text}</span>
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Eyebrow>Baseline · FMGIL Bengaluru · FY2025-26</Eyebrow>
              <p className="mt-1 text-[13px] text-muted">Twelve months of bills, split by source. Months are illustrative around the plant note&apos;s 33 lakh units.</p>
            </div>
            <button
              type="button"
              onClick={() => setLocked(true)}
              disabled={!blrReady || locked}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium",
                locked ? "bg-green-soft text-green" : blrReady ? "bg-accent text-white" : "bg-surface-2 text-faint",
              )}
            >
              <Lock size={14} /> {locked ? "Baseline locked" : blrReady ? "Lock baseline" : "Read the Bengaluru bills first"}
            </button>
          </div>
          <div className="relative mt-5 h-[220px]">
            <div className="absolute inset-0 flex items-end gap-2">
              {BLR_MONTHLY.map((v, i) => {
                const h = (v / (maxMonth * 1.2)) * 100
                const reH = (PLANT.ppaKWh / v) * 100
                return (
                  <div key={MONTHS[i]} className="flex h-full flex-1 flex-col justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: blrReady ? `${h}%` : "6%" }}
                      transition={{ delay: i * 0.04, type: "spring", stiffness: 160, damping: 22 }}
                      className="relative flex flex-col-reverse overflow-hidden rounded-t-md"
                    >
                      <div className="bg-green" style={{ height: `${reH}%` }} />
                      <div className="flex-1 bg-grey" />
                    </motion.div>
                    <span className="mt-1 h-4 text-center font-mono text-[10px] leading-4 text-faint">{MONTHS[i]}</span>
                  </div>
                )
              })}
            </div>
            {!blrReady && (
              <div className="absolute inset-0 grid place-items-center">
                <p className="rounded-xl border border-dashed border-line-strong bg-surface px-4 py-3 text-center text-[13px] text-muted">
                  Read the BESCOM bill and the PPA statement for Bengaluru
                  <span className="block text-[12px] text-faint">and twelve months of history fill in here</span>
                </p>
              </div>
            )}
            {blrReady && (
              <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-accent" style={{ bottom: (avg / (maxMonth * 1.2)) * 220 + 20 }}>
                <span className="absolute -top-5 right-0 rounded bg-surface px-1 font-mono text-[10.5px] text-accent">baseline {fmt(avg / 1e5, 1)} lakh kWh/month</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-4 text-[11.5px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-green" /> Renewable (PPA)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-grey" /> Grid (BESCOM)
            </span>
          </div>
          <AnimatePresence>
            {locked && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-green-soft/60 p-4 md:grid-cols-4">
                <div>
                  <p className="text-[11.5px] text-faint">Electricity</p>
                  <p className="tnum text-lg font-semibold">{fmt(annual / 1e6, 1)} GWh</p>
                  <p className="tnum text-[11.5px] text-muted">{fmt((annual / 1000) * GJ_PER_MWH)} GJ</p>
                </div>
                <div>
                  <p className="text-[11.5px] text-faint">Renewable share</p>
                  <p className="tnum text-lg font-semibold text-green">{pct(reAnnual / annual, 1)}</p>
                  <p className="text-[11.5px] text-muted">pending certificates</p>
                </div>
                <div>
                  <p className="text-[11.5px] text-faint">Scope 2, location-based</p>
                  <p className="tnum text-lg font-semibold">{fmt(locationT * 1000)} t</p>
                  <p className="text-[11.5px] text-muted">CEA v21</p>
                </div>
                <div>
                  <p className="text-[11.5px] text-faint">Scope 2, market-based</p>
                  <p className="tnum text-lg font-semibold">{fmt(marketT * 1000)} t</p>
                  <p className="text-[11.5px] text-muted">if PPA evidenced</p>
                </div>
                <p className="col-span-full text-[12px] text-muted">
                  Locked as the pilot&apos;s reference. Every later bill is measured against it, normalised for production once the plant shares output data.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <Card className="xl:col-span-4">
          <Eyebrow>Group roll-up · BRSR Core</Eyebrow>
          <p className="mt-1 text-[12.5px] text-muted">One consolidated view; each figure keeps its trail back to the bill or filing.</p>
          <dl className="mt-4 divide-y divide-line">
            {[
              { k: "Total energy", v: `${fmt(filedEnergy)} GJ`, s: "TCAIL + FMGIL, filed" },
              { k: "From renewables", v: pct(filedRe / filedEnergy, 1), s: "filed" },
              { k: "Scope 1", v: `${fmt(BRSR.tcail.scope1.value + BRSR.fmgil.scope1.value)} t`, s: "filed" },
              { k: "Scope 2", v: `${fmt(BRSR.tcail.scope2.value + BRSR.fmgil.scope2.value)} t`, s: "filed" },
              { k: "TAIPL, FM Ignition, Bearings, Sealings", v: "8 plants", s: "from bills in esgOS", pending: true },
              { k: "Scope 3", v: "not reported", s: "both BRSRs", pending: true },
            ].map((r) => (
              <div key={r.k} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[12.5px]">
                  {r.k}
                  <span className="block text-[11px] text-faint">{r.s}</span>
                </dt>
                <dd className={cn("tnum text-right text-[14px] font-semibold", r.pending && "text-amber")}>{r.v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 rounded-xl bg-accent-soft p-3 text-[12px] leading-snug text-fg">
            The same records produce BRSR Core, the GHG inventory, CDP answers and the pilot&apos;s measurement report: one source, many outputs.
          </div>
        </Card>
      </div>
    </div>
  )
}
