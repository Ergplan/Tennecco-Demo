"use client"

// ergPLAN: drop the plants' power bills in one place, watch them read, see today's supply
// against the plan, then the same plan across the group.

import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Check, FileText, Loader2, Map as MapIcon, ScanLine, Sparkles, Upload } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, Chips, Count, Eyebrow, PageHead, Pill, fmt, pct } from "@/components/ui/kit"
import { cn } from "@/components/ui/cn"
import { entityById } from "@/lib/entities"
import { declutter, project } from "@/lib/geo"
import { INDIA_PATH } from "@/lib/indiaPath"
import { PLANS, PRICES, planOf, totals, typicalDay, type DayBlock, type Mix, type PlantPlan } from "@/lib/ergplan"
import { SITES } from "@/lib/sites"

type Stage = "bills" | "results" | "group"
type BillStatus = "queued" | "scanning" | "parsed"
type Bill = { id: string; file: string; siteId: string; status: BillStatus }

const FACTORIES = PLANS.map((p) => SITES.find((s) => s.id === p.siteId)!)
const ORDER = ["fmgil-blr", ...FACTORIES.map((s) => s.id).filter((id) => id !== "fmgil-blr")]

const KEYWORDS: [RegExp, string][] = [
  [/bescom|yelahanka|bengaluru|bangalore|blr/i, "fmgil-blr"],
  [/pspcl|patiala/i, "fmgil-patiala"],
  [/hpsebl|parwanoo/i, "fmbil-parwanoo"],
  [/dhbvn|bawal/i, "taipl-bawal"],
  [/jvvnl|avvnl|bhiwadi/i, "fmps-bhiwadi"],
  [/mpwz|mppkvvcl|pithampur/i, "tcail-pithampur"],
  [/ugvcl|mgvcl|sanand/i, "taipl-sanand"],
  [/sealing|mahalunge/i, "fmsil-chakan"],
  [/nighoje|chakan.?ii|chakan-2/i, "tcail-chakan2"],
  [/msedcl|chakan|pune|kuruli/i, "tcail-chakan1"],
  [/oragadam|chennai/i, "tcail-chennai"],
  [/puducherry|pondicherry|ped\b/i, "taipl-puducherry"],
  [/tangedco|tnpdcl|hosur/i, "taipl-hosur"],
]

const SAMPLE_FILES = ["BESCOM_HT_Sep-2026_Yelahanka.pdf", "PSPCL_HT_Sep-2026_Patiala.pdf", "MSEDCL_HT_Sep-2026_Chakan.pdf", "TNPDCL_HT_Sep-2026_Hosur.pdf", "DHBVN_HT_Sep-2026_Bawal.pdf"]

const C = { discom: "#f5a524", solar: "#f2c94c", wind: "#2bb3a3", iex: "#8b5cf6", banked: "#7fd1a8", demand: "var(--fg)" }

function lerpColor(a: string, b: string, t: number) {
  const pa = a.match(/\w\w/g)!.map((h) => parseInt(h, 16))
  const pb = b.match(/\w\w/g)!.map((h) => parseInt(h, 16))
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`
}

/* ------------------------------------------------------------------ stage 1: bills */

function BillDrop({ bills, onFiles, onSample }: { bills: Bill[]; onFiles: (names: string[]) => void; onSample: () => void }) {
  const [drag, setDrag] = useState(false)
  const reduced = useReducedMotion()
  const scanning = bills.find((b) => b.status === "scanning")
  const parsedSites = new Set(bills.filter((b) => b.status === "parsed").map((b) => b.siteId))
  const pendingSites = new Set(bills.filter((b) => b.status !== "parsed").map((b) => b.siteId))
  const n = FACTORIES.length
  const pos = FACTORIES.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return { x: 50 + 41 * Math.cos(a), y: 50 + 41 * Math.sin(a) }
  })
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDrag(false)
        onFiles(Array.from(e.dataTransfer.files).map((f) => f.name))
      }}
      className="relative h-[calc(100dvh-330px)] max-h-[640px] min-h-[540px] w-full"
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {pos.map((p, i) => {
          const id = FACTORIES[i].id
          const on = parsedSites.has(id)
          const active = scanning?.siteId === id
          return (
            <line
              key={id}
              x1={50}
              y1={50}
              x2={p.x}
              y2={p.y}
              stroke={on ? "var(--green)" : active ? "var(--sky)" : "var(--line-strong)"}
              strokeWidth={on || active ? 0.35 : 0.2}
              strokeDasharray="1 1.2"
              vectorEffect="non-scaling-stroke"
              className={active || on ? "motion-flow" : undefined}
              style={{ strokeWidth: on || active ? 2 : 1 }}
            />
          )
        })}
      </svg>

      {FACTORIES.map((s, i) => {
        const e = entityById(s.entityId)
        const on = parsedSites.has(s.id)
        const waiting = pendingSites.has(s.id)
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: on ? 1.04 : 1 }}
            transition={{ delay: reduced ? 0 : 0.05 * i }}
            className={cn(
              "absolute w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-surface px-3 py-2 shadow-sm",
              on ? "border-green ring-2 ring-green/20" : waiting ? "border-sky" : "border-line",
            )}
            style={{ left: `${pos[i].x}%`, top: `${pos[i].y}%` }}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color }} />
              <span className="truncate text-[12px] font-semibold">{s.city === "Pune" ? s.name : s.city}</span>
              {on && <Check size={13} className="ml-auto shrink-0 text-green" />}
              {waiting && !on && <Loader2 size={12} className="ml-auto shrink-0 animate-spin text-sky" />}
            </div>
            <p className="truncate text-[10.5px] text-faint">{e.short}</p>
          </motion.div>
        )
      })}

      <label
        className={cn(
          "absolute left-1/2 top-1/2 flex h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed bg-surface text-center shadow-[0_8px_30px_rgba(0,29,52,0.08)] transition-colors",
          drag ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent",
        )}
      >
        <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv" className="sr-only" onChange={(e) => onFiles(Array.from(e.target.files ?? []).map((f) => f.name))} />
        <AnimatePresence mode="wait">
          {scanning ? (
            <motion.div key={scanning.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
              <div className="relative h-[120px] w-[92px] overflow-hidden rounded-md border border-line-strong bg-white shadow-sm">
                {Array.from({ length: 9 }, (_, k) => (
                  <span key={k} className="absolute left-2 h-1 rounded bg-surface-3" style={{ top: 12 + k * 11, width: k % 3 === 0 ? 52 : 72 }} />
                ))}
                {!reduced && (
                  <motion.span
                    className="absolute inset-x-0 h-6 bg-gradient-to-b from-transparent via-sky/40 to-transparent"
                    initial={{ top: -24 }}
                    animate={{ top: 120 }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </div>
              <p className="mt-2 flex items-center gap-1 text-[12px] font-medium text-sky">
                <ScanLine size={13} /> Reading the bill
              </p>
              <p className="max-w-[190px] truncate text-[11px] text-faint">{scanning.file}</p>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center px-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
                <Upload size={24} />
              </span>
              <p className="mt-3 text-[15px] font-semibold">Drop power bills here</p>
              <p className="mt-1 text-[11.5px] leading-snug text-muted">DISCOM HT bills, PPA and open-access statements: PDF or scans</p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  onSample()
                }}
                className="mt-3 text-[11.5px] font-medium text-accent underline underline-offset-2"
              >
                or use sample bills
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </label>
    </div>
  )
}

function BillList({ bills, onNext }: { bills: Bill[]; onNext: () => void }) {
  const done = bills.length > 0 && bills.every((b) => b.status === "parsed")
  return (
    <Card className="flex h-full flex-col p-0">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-[14px] font-semibold">Bills received</p>
        <span className="tnum text-[12px] text-muted">
          {bills.filter((b) => b.status === "parsed").length} / {bills.length} read
        </span>
      </div>
      {!bills.length ? (
        <p className="flex-1 px-4 py-10 text-center text-[13px] text-faint">Nothing yet. Drop a few bills on the box in the middle.</p>
      ) : (
        <ul className="scrollbar-thin flex-1 divide-y divide-line overflow-y-auto">
          <AnimatePresence initial={false}>
            {bills.map((b) => {
              const p = planOf(b.siteId)
              const monthKWh = (p.annualMWh * 1000) / 12
              const site = SITES.find((s) => s.id === b.siteId)!
              return (
                <motion.li key={b.id} layout initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <FileText size={15} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium">{b.file}</span>
                      <span className="block truncate text-[11.5px] text-faint">
                        {entityById(site.entityId).short} · {site.name}
                      </span>
                    </span>
                    {b.status === "parsed" ? (
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-green text-white">
                        <Check size={12} />
                      </span>
                    ) : b.status === "scanning" ? (
                      <Loader2 size={15} className="animate-spin text-sky" />
                    ) : (
                      <span className="text-[11px] text-faint">queued</span>
                    )}
                  </div>
                  {b.status === "parsed" && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tnum mt-1 pl-6 text-[11.5px] text-muted">
                      12-month history · {fmt(monthKWh / 1e5, 1)} lakh kWh a month · {pct(p.greenToday)} green · ₹{(p.costToday / (p.annualMWh * 1000)).toFixed(2)}/kWh
                    </motion.p>
                  )}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={onNext}
          disabled={!done}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[14px] font-medium text-white disabled:bg-surface-3 disabled:text-faint"
        >
          See ergPLAN results <ArrowRight size={16} />
        </button>
        <p className="mt-2 text-[11px] text-faint">HT bills carry a 12-month consumption history, so one bill per plant is enough to start. Values shown are sample values for the demo.</p>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ stage 2: results */

function niceStep(max: number) {
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(raw || 1))
  const n = raw / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
}

function DayChart({ blocks }: { blocks: DayBlock[] }) {
  const W = 960
  const H = 300
  const P = { l: 56, r: 12, t: 12, b: 26 }
  const peak = Math.max(...blocks.map((b) => Math.max(b.demand, b.wind + b.solar + b.iex + b.banked + b.discom + b.surplus))) || 1
  const step = niceStep(peak)
  const max = Math.ceil(peak / step) * step
  const x = (i: number) => P.l + (i / (blocks.length - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b)
  const keys: (keyof DayBlock)[] = ["wind", "solar", "iex", "banked", "discom", "surplus"]
  const base = blocks.map(() => 0)
  const areas = keys.map((k) => {
    const lower = [...base]
    blocks.forEach((b, i) => (base[i] += b[k]))
    const upper = [...base]
    const d = `M${upper.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("L")}L${lower
      .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .reverse()
      .join("L")}Z`
    return { k, d }
  })
  const fill = (k: keyof DayBlock) => (k === "banked" ? "url(#banked)" : k === "surplus" ? "url(#surplus)" : C[k as keyof typeof C])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="A typical day by source">
      <defs>
        <pattern id="banked" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#c9eedb" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#14995a" strokeWidth="2" />
        </pattern>
        <pattern id="surplus" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#60a5fa" strokeWidth="2" />
        </pattern>
      </defs>
      {Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step).map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v).toFixed(1)} y2={y(v).toFixed(1)} stroke="var(--line)" />
          <text x={P.l - 6} y={(y(v) + 3).toFixed(1)} textAnchor="end" fontSize="10" fill="var(--faint)" fontFamily="var(--font-mono)">
            {v >= 1000 ? `${fmt(v / 1000, v % 1000 ? 1 : 0)}k` : fmt(v)}
          </text>
        </g>
      ))}
      {areas.map((a) => (
        <motion.path key={a.k} d={a.d} fill={fill(a.k)} opacity={a.k === "surplus" ? 0.7 : 0.88} initial={false} animate={{ d: a.d }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      ))}
      <polyline points={blocks.map((b, i) => `${x(i).toFixed(1)},${y(b.demand).toFixed(1)}`).join(" ")} fill="none" stroke="var(--fg)" strokeWidth="1.6" strokeDasharray="5 4" opacity="0.7" />
      {[0, 4, 8, 12, 16, 20].map((h) => (
        <text key={h} x={x(h * 4).toFixed(1)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--faint)" fontFamily="var(--font-mono)">
          {String(h).padStart(2, "0")}:00
        </text>
      ))}
      <text x={P.l} y={10} fontSize="10" fill="var(--faint)" fontFamily="var(--font-mono)">
        kW
      </text>
    </svg>
  )
}

function sumMix(list: PlantPlan[], which: "today" | "plan"): Mix {
  return list.reduce<Mix>(
    (a, p) => ({
      discom: a.discom + p[which].discom + (which === "plan" ? p.plan.greenTariff : 0),
      solar: a.solar + p[which].solar,
      wind: a.wind + p[which].wind,
      iex: a.iex + p[which].iex,
      greenTariff: a.greenTariff + p[which].greenTariff,
    }),
    { discom: 0, solar: 0, wind: 0, iex: 0, greenTariff: 0 },
  )
}

function Results({ siteIds, onGroup }: { siteIds: string[]; onGroup: () => void }) {
  const [view, setView] = useState<"today" | "plan">("today")
  const [picked, setPicked] = useState<string[]>(siteIds)
  const list = PLANS.filter((p) => picked.includes(p.siteId))
  const t = totals(list)
  const E = list.reduce((a, p) => a + p.annualMWh, 0)
  const mix = sumMix(list, view)
  const blocks = useMemo(() => typicalDay(mix, E), [mix.discom, mix.solar, mix.wind, mix.iex, E])
  const green = view === "today" ? t.greenToday : 1
  const avg = view === "today" ? t.avgToday : t.avgPlan
  const cost = view === "today" ? t.costToday : t.costPlan
  const share = (k: keyof Mix) => (E ? mix[k] / E : 0)

  useEffect(() => {
    const id = setTimeout(() => setView("plan"), 2600)
    return () => clearTimeout(id)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {siteIds.map((id) => {
            const s = SITES.find((x) => x.id === id)!
            const on = picked.includes(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPicked((p) => (on ? (p.length > 1 ? p.filter((x) => x !== id) : p) : [...p, id]))}
                className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium", on ? "border-accent bg-accent-soft text-accent" : "border-line-strong text-muted")}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: entityById(s.entityId).color }} />
                {s.city === "Pune" ? s.name : s.city}
              </button>
            )
          })}
        </div>
        <Chips
          options={[
            { id: "today", label: "Today, from the bills" },
            { id: "plan", label: "ergPLAN" },
          ]}
          value={view}
          onChange={(v) => setView(v as "today" | "plan")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[12px] text-faint">Green share</p>
          <p className={cn("tnum mt-1 text-4xl font-semibold tracking-tight", view === "plan" ? "text-green" : "")}>
            <Count value={green * 100} format={(n) => `${n.toFixed(0)}%`} />
          </p>
          <p className="text-[12px] text-muted">of {fmt(E / 1000, 1)} GWh a year</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] text-faint">Average power purchase cost</p>
          <p className="tnum mt-1 text-4xl font-semibold tracking-tight">
            <Count value={avg} format={(n) => `₹${n.toFixed(2)}`} />
            <span className="ml-1 text-sm font-medium text-muted">/kWh</span>
          </p>
          <p className="text-[12px] text-muted">{view === "plan" ? `from ₹${t.avgToday.toFixed(2)} today` : "blended across sources"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] text-faint">Power bill a year</p>
          <p className="tnum mt-1 text-4xl font-semibold tracking-tight">
            <Count value={cost / 1e7} format={(n) => `₹${n.toFixed(1)} Cr`} />
          </p>
          <p className="text-[12px] text-muted">{list.length} plant{list.length === 1 ? "" : "s"}</p>
        </Card>
        <Card className={cn("p-4", view === "plan" && "border-green/40 bg-green-soft/50")}>
          <p className="text-[12px] text-faint">Saving with ergPLAN</p>
          <p className="tnum mt-1 text-4xl font-semibold tracking-tight text-green">
            <Count value={view === "plan" ? t.saving / 1e7 : 0} format={(n) => `₹${n.toFixed(1)} Cr`} />
          </p>
          <p className="text-[12px] text-muted">a year · {pct(t.costToday ? t.saving / t.costToday : 0)} of today&apos;s bill</p>
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-line px-4 py-3 text-[12px]">
          <p className="font-semibold">A typical weekday · {view === "today" ? "today" : "ergPLAN"}</p>
          {[
            { k: "DISCOM", c: C.discom, v: share("discom"), note: view === "plan" ? " (green tariff)" : "" },
            { k: "Solar", c: C.solar, v: share("solar") },
            { k: "Wind", c: C.wind, v: share("wind") },
            { k: "Power exchange (IEX)", c: C.iex, v: share("iex") },
          ].map((l) => (
            <span key={l.k} className="flex items-center gap-1.5 text-muted">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.c }} />
              {l.k}
              {l.note}
              <b className="tnum text-fg">{pct(l.v)}</b>
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "repeating-linear-gradient(45deg,#14995a 0 2px,#c9eedb 2px 5px)" }} /> Banked green, drawn back
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "repeating-linear-gradient(-45deg,#60a5fa 0 2px,transparent 2px 5px)" }} /> Surplus, banked
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-0 w-4 border-t-2 border-dashed border-fg/70" /> Demand
          </span>
        </div>
        <div className="p-3">
          <DayChart blocks={blocks} />
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-faint">
          Plan levers: rooftop solar on RESCO (₹{PRICES.rooftop}), a wind–solar group-captive block, green day-ahead power in the solar hours (≈₹{PRICES.gdamLanded} landed) and the DISCOM green tariff for the
          rest. Indicative prices by state; firmed up with quotes in the pilot.
        </p>
        <button type="button" onClick={onGroup} className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-[14px] font-medium text-white">
          <MapIcon size={16} /> Group level <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ stage 3: group */

// Which side each factory's name sits on, so clusters (Pune, Tamil Nadu, NCR) stay readable.
const LABEL_SIDE: Record<string, "l" | "r" | "b"> = {
  "fmgil-blr": "l",
  "fmgil-patiala": "l",
  "taipl-bawal": "l",
  "taipl-sanand": "l",
  "tcail-chakan2": "l",
  "taipl-hosur": "b",
  "fmsil-chakan": "b",
}

function GroupMap() {
  const [applied, setApplied] = useState<string[]>([])
  const [t, setT] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const all = totals(PLANS)
  const order = [...PLANS].sort((a, b) => b.costToday - b.costPlan - (a.costToday - a.costPlan))

  function run() {
    timers.current.forEach(clearTimeout)
    setApplied([])
    setT(0)
    order.forEach((p, i) => timers.current.push(setTimeout(() => setApplied((a) => [...a, p.siteId]), 700 + i * 330)))
    const c = animate(0, 1, { duration: (order.length * 330 + 700) / 1000, ease: "easeInOut", onUpdate: setT })
    return () => c.stop()
  }
  useEffect(() => {
    const stop = run()
    return () => {
      stop()
      timers.current.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const layout = useMemo(() => declutter(PLANS.map((p) => ({ id: p.siteId, ...project(SITES.find((s) => s.id === p.siteId)!.lat, SITES.find((s) => s.id === p.siteId)!.lng) })), 78, 120), [])
  const greenNow = all.greenToday + (1 - all.greenToday) * t
  const costNow = all.costToday - all.saving * t

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <Card className="relative overflow-hidden p-0 lg:col-span-7">
        <svg viewBox="50 10 900 1060" className="h-[68vh] min-h-[520px] w-full bg-gradient-to-b from-surface to-surface-2" role="img" aria-label="Tenneco factories, green share today and with ergPLAN">
          <path d={INDIA_PATH} fill="var(--land)" stroke="var(--land-stroke)" strokeWidth="1.6" />
          {PLANS.map((p) => {
            const s = SITES.find((x) => x.id === p.siteId)!
            const tr = project(s.lat, s.lng)
            const l = layout[p.siteId]
            const on = applied.includes(p.siteId)
            const g = on ? 1 : p.greenToday
            const r = 9 + Math.sqrt(p.annualMWh) / 12
            const side = LABEL_SIDE[p.siteId] ?? "r"
            return (
              <g key={p.siteId}>
                {Math.hypot(l.dx, l.dy) > 6 && <line x1={tr.x} y1={tr.y} x2={l.x} y2={l.y} stroke="var(--line-strong)" strokeWidth="1.5" />}
                {on && <motion.circle cx={l.x} cy={l.y} r={r} fill="none" stroke="var(--green)" strokeWidth="3" initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 2, opacity: 0 }} transition={{ duration: 1.2 }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />}
                <motion.circle cx={l.x} cy={l.y} r={r} animate={{ fill: lerpColor("b7c1ce", "14995a", g) }} transition={{ duration: 0.6 }} stroke="#fff" strokeWidth="3" />
                <text x={l.x} y={l.y + Math.min(15, r * 0.62) / 3} textAnchor="middle" fontSize={Math.min(15, r * 0.62)} fontWeight="700" fill="#fff">
                  {Math.round(g * 100)}%
                </text>
                <text
                  x={side === "l" ? l.x - r - 6 : side === "b" ? l.x : l.x + r + 6}
                  y={side === "b" ? l.y + r + 18 : l.y + 6}
                  textAnchor={side === "l" ? "end" : side === "b" ? "middle" : "start"}
                  fontSize="16"
                  fontWeight="600"
                  fill="var(--fg)"
                  stroke="var(--surface)"
                  strokeWidth="5"
                  paintOrder="stroke"
                >
                  {s.city === "Pune" ? s.name.replace(" sealings plant", " sealings") : s.city}
                </text>
              </g>
            )
          })}
        </svg>
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-[11.5px] text-muted backdrop-blur">
          <span className="h-3 w-3 rounded-full" style={{ background: "#b7c1ce" }} /> grid
          <span className="h-3 w-3 rounded-full" style={{ background: "#14995a" }} /> green · circle size = consumption
        </div>
      </Card>

      <div className="space-y-4 lg:col-span-5">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-[12px] text-faint">Group green share</p>
            <p className="tnum mt-1 text-4xl font-semibold tracking-tight text-green">{pct(greenNow)}</p>
            <p className="text-[12px] text-muted">from {pct(all.greenToday)} today</p>
          </Card>
          <Card className="p-4">
            <p className="text-[12px] text-faint">Group power bill a year</p>
            <p className="tnum mt-1 text-4xl font-semibold tracking-tight">₹{(costNow / 1e7).toFixed(1)} Cr</p>
            <p className="text-[12px] text-muted">from ₹{(all.costToday / 1e7).toFixed(1)} Cr</p>
          </Card>
          <Card className="col-span-2 border-green/40 bg-green-soft/50 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[12px] text-faint">More that can be done, every year</p>
                <p className="tnum mt-1 text-4xl font-semibold tracking-tight text-green">₹{((all.saving * t) / 1e7).toFixed(1)} Cr</p>
                <p className="text-[12px] text-muted">
                  lower power cost · ₹{all.avgToday.toFixed(2)} → ₹{all.avgPlan.toFixed(2)}/kWh · {fmt((all.co2Avoided * t) / 1000, 1)}k tCO₂ avoided
                </p>
              </div>
              <button type="button" onClick={run} className="flex items-center gap-1.5 rounded-full bg-green px-3 py-1.5 text-[12.5px] font-medium text-white">
                <Sparkles size={13} /> Replay
              </button>
            </div>
          </Card>
        </div>
        <Card className="p-0">
          <div className="border-b border-line px-4 py-2.5 text-[13px] font-semibold">Plant by plant</div>
          <ul className="scrollbar-thin max-h-[330px] divide-y divide-line overflow-y-auto">
            {order.map((p) => {
              const s = SITES.find((x) => x.id === p.siteId)!
              const on = applied.includes(p.siteId)
              return (
                <li key={p.siteId} className={cn("px-4 py-2 transition-colors", on && "bg-green-soft/40")}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: entityById(s.entityId).color }} />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                      {s.name} <span className="font-normal text-faint">· {entityById(s.entityId).short}</span>
                    </span>
                    <span className="tnum text-[12px] text-muted">
                      {pct(p.greenToday)} → <b className={on ? "text-green" : ""}>100%</b>
                    </span>
                    <span className="tnum w-[84px] text-right text-[12px] font-semibold text-green">−₹{((p.costToday - p.costPlan) / 1e5).toFixed(0)} lakh</span>
                  </div>
                  <p className="truncate pl-4 text-[11px] text-faint">{p.levers.join(" · ")}</p>
                </li>
              )
            })}
          </ul>
        </Card>
        <p className="text-[11px] leading-snug text-faint">
          Bengaluru from the plant note; renewable shares from the filed BRSRs where public; other loads and all tariffs indicative by state until each plant&apos;s bills are read.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ page */

export default function ErgPlan() {
  const [stage, setStage] = useState<Stage>("bills")
  const [bills, setBills] = useState<Bill[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function addFiles(names: string[]) {
    if (!names.length) return
    setBills((prev) => {
      const used = new Set(prev.map((b) => b.siteId))
      const next = [...prev]
      for (const file of names) {
        const hit = KEYWORDS.find(([re]) => re.test(file))?.[1]
        const siteId = hit && !used.has(hit) ? hit : (ORDER.find((id) => !used.has(id)) ?? hit ?? ORDER[0])
        used.add(siteId)
        next.push({ id: `${Date.now()}-${file}-${next.length}`, file, siteId, status: "queued" })
      }
      return next
    })
  }

  // Read the queue one bill at a time; the timer lives in a ref so state updates don't cancel it.
  useEffect(() => {
    if (timer.current) return
    const q = bills.find((b) => b.status === "queued")
    if (!q) return
    setBills((bs) => bs.map((b) => (b.id === q.id ? { ...b, status: "scanning" } : b)))
    timer.current = setTimeout(() => {
      timer.current = null
      setBills((bs) => bs.map((b) => (b.id === q.id ? { ...b, status: "parsed" } : b)))
    }, 1700)
  }, [bills])
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [stage])

  const parsedIds = [...new Set(bills.filter((b) => b.status === "parsed").map((b) => b.siteId))]

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="ergPLAN · power purchase plan"
        title={stage === "bills" ? "Drop the bills. ergPLAN reads them." : stage === "results" ? "Today's supply, and the plan." : "The same plan, across the group."}
        lede={
          stage === "bills"
            ? "Every factory sends its power bills to one place. ergPLAN reads each one, with the twelve-month history on it, and builds the supply picture plant by plant."
            : stage === "results"
              ? "What the bills say the plants buy today, and the mix ergPLAN recommends: rooftop solar, wind–solar captive, green power from the exchange, and the DISCOM only where it is the cheapest green option left."
              : "Every Tenneco factory on one map: how green it is today, and how much more can be done to cut the power bill and reach 100% green."
        }
        right={
          <div className="flex gap-1 rounded-full bg-surface-2 p-1">
            {(
              [
                { id: "bills", label: "1 Bills" },
                { id: "results", label: "2 Results" },
                { id: "group", label: "3 Group" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStage(s.id)}
                disabled={s.id !== "bills" && !parsedIds.length}
                className={cn("rounded-full px-3 py-1 text-[12.5px] font-medium disabled:opacity-40", stage === s.id ? "bg-surface text-fg shadow-sm" : "text-muted")}
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      />

      <AnimatePresence mode="wait">
        {stage === "bills" && (
          <motion.div key="bills" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-5 lg:grid-cols-12">
            <Card className="p-2 lg:col-span-8">
              <BillDrop bills={bills} onFiles={addFiles} onSample={() => addFiles(SAMPLE_FILES)} />
            </Card>
            <div className="min-w-0 lg:col-span-4">
              <BillList bills={bills} onNext={() => setStage("results")} />
            </div>
          </motion.div>
        )}
        {stage === "results" && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Results siteIds={parsedIds} onGroup={() => setStage("group")} />
          </motion.div>
        )}
        {stage === "group" && (
          <motion.div key="group" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GroupMap />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-2 text-[12px] text-faint">
        <Pill tone="blue">ergPLAN</Pill> plans the purchase · <Pill tone="green">ergOS</Pill> runs it day to day, next.
      </div>
    </div>
  )
}
