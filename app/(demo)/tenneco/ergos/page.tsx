"use client"

// ergOS, jouleWise's energy management platform, with Tenneco's factories on it: the live
// day by source (as on the ergOS "Today" screen), every plant connected in one place, and a
// baselining run that gives the current renewable share plant by plant.

import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeftRight,
  BarChart3,
  Battery,
  Calculator,
  Check,
  ChevronRight,
  Cog,
  Database,
  FileText,
  Gauge,
  Home,
  IndianRupee,
  LayoutDashboard,
  Leaf,
  Loader2,
  Lock,
  Plug,
  Receipt,
  Sun,
  TrendingUp,
  Zap,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { BillsTab } from "@/components/BillsTab"
import { Eyebrow, PageHead, Pill, fmt, pct } from "@/components/ui/kit"
import { cn } from "@/components/ui/cn"
import { entityById } from "@/lib/entities"
import { DAYS, PLANT_ENERGY, baselineOf, dayBlocks, energyOf, iexPrice, sumBlocks, type Basis, type Block } from "@/lib/ergos"
import { SITES } from "@/lib/sites"

type Tab = "today" | "baseline" | "bills"
const GOLD = "#c9a227"
const COLORS = { ppa: "#22a861", rooftop: "#f2b632", grid: "#f5a524", iex: "#8b5cf6", surplus: "#60a5fa" }
const siteName = (id: string) => SITES.find((s) => s.id === id)!
const ALL = "all"

function Sidebar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items = [
    { icon: TrendingUp, label: "Trading" },
    { icon: Cog, label: "Configuration" },
    { icon: Battery, label: "Storage management" },
    { icon: FileText, label: "SOP default" },
    { icon: Database, label: "IEX data" },
    { icon: Calculator, label: "Landing cost calculator" },
    { icon: Receipt, label: "Billing and costing" },
    { icon: IndianRupee, label: "Savings" },
  ]
  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <div className="border-b border-line px-5 py-4">
        <p className="text-[22px] tracking-tight" style={{ color: GOLD }}>
          <span className="font-light">joule</span>
          <span className="font-semibold">Wise</span>
        </p>
        <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "#fbf3d6", color: "#8a6d12" }}>
          Tenneco India · admin
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 p-3 text-[13px]">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-white" style={{ background: GOLD }}>
          <LayoutDashboard size={15} /> Dashboard
        </div>
        {[
          { id: "today" as Tab, icon: Home, label: "Today (T)" },
          { id: "baseline" as Tab, icon: BarChart3, label: "Baselines" },
          { id: "bills" as Tab, icon: Plug, label: "Bills and meters" },
        ].map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={cn("flex w-full items-center gap-2 rounded-lg py-1.5 pl-8 pr-3 text-left", tab === x.id ? "font-medium" : "text-muted hover:text-fg")}
            style={tab === x.id ? { background: "#fbf3d6", color: "#8a6d12" } : undefined}
          >
            <ChevronRight size={13} /> {x.label}
          </button>
        ))}
        <div className="pt-2" />
        {items.map((x) => (
          <div key={x.label} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-muted">
            <x.icon size={15} /> {x.label}
          </div>
        ))}
      </nav>
      <p className="border-t border-line px-5 py-3 text-[11px] text-faint">© 2026 jouleWise · Energy Management Platform</p>
    </aside>
  )
}

function Kpi({ label, value, unit, sub, color, icon: Icon }: { label: string; value: string; unit: string; sub: string; color: string; icon: typeof Zap }) {
  return (
    <div className="relative min-w-0 rounded-xl border border-line bg-surface p-3 pl-4">
      <span className="absolute inset-y-3 left-0 w-1 rounded-r" style={{ background: color }} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-medium">{label}</p>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md" style={{ background: `${color}22`, color }}>
          <Icon size={13} />
        </span>
      </div>
      <p className="tnum mt-1 text-xl font-semibold tracking-tight">
        {value} <span className="text-[12px] font-medium text-muted">{unit}</span>
      </p>
      <p className="text-[11.5px] text-muted">{sub}</p>
    </div>
  )
}

function StackChart({ blocks, height = 300 }: { blocks: Block[]; height?: number }) {
  const W = 960
  const H = height
  const P = { l: 52, r: 12, t: 12, b: 26 }
  const max = Math.max(...blocks.map((b) => Math.max(b.demand, b.ppa + b.rooftop + b.grid + b.iex + b.surplus))) * 1.1 || 1
  const x = (i: number) => P.l + (i / (blocks.length - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b)
  const layers: { key: keyof Block; color: string }[] = [
    { key: "ppa", color: COLORS.ppa },
    { key: "rooftop", color: COLORS.rooftop },
    { key: "grid", color: COLORS.grid },
    { key: "iex", color: COLORS.iex },
    { key: "surplus", color: COLORS.surplus },
  ]
  const base = blocks.map(() => 0)
  const areas = layers.map((l) => {
    const lower = [...base]
    blocks.forEach((b, i) => (base[i] += b[l.key] as number))
    const upper = [...base]
    const d = `M${upper.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("L")}L${lower
      .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .reverse()
      .join("L")}Z`
    return { ...l, d }
  })
  const ticks = 5
  const hours = blocks.length === 96 ? [0, 4, 8, 12, 16, 20] : []
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Demand by source through the day">
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={COLORS.surplus} strokeWidth="2.5" />
        </pattern>
      </defs>
      {Array.from({ length: ticks + 1 }, (_, i) => (max / 1.1 / ticks) * i).map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v).toFixed(1)} y2={y(v).toFixed(1)} stroke="var(--line)" />
          <text x={P.l - 6} y={(y(v) + 3).toFixed(1)} textAnchor="end" fontSize="10" fill="var(--faint)" fontFamily="var(--font-mono)">
            {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}
          </text>
        </g>
      ))}
      {areas.map((a) => (
        <motion.path key={a.key} d={a.d} fill={a.key === "surplus" ? "url(#hatch)" : a.color} opacity={a.key === "surplus" ? 0.7 : 0.92} initial={false} animate={{ d: a.d }} transition={{ duration: 0.6 }} />
      ))}
      <polyline
        points={blocks.map((b, i) => `${x(i).toFixed(1)},${y(b.demand).toFixed(1)}`).join(" ")}
        fill="none"
        stroke="var(--fg)"
        strokeWidth="1.6"
        strokeDasharray="5 4"
        opacity="0.7"
      />
      {hours.map((h) => (
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

function Today({ connected, connecting, onConnectAll }: { connected: string[]; connecting: boolean; onConnectAll: () => void }) {
  const [plant, setPlant] = useState<string>("fmgil-blr")
  const [day, setDay] = useState(4)
  const ids = plant === ALL ? connected : [plant]
  const isOn = plant === ALL || connected.includes(plant)
  const blocks = useMemo(() => (isOn && ids.length ? sumBlocks(ids.map((id) => dayBlocks(energyOf(id), DAYS[day].weekday))) : []), [ids.join(","), day, isOn])
  const week = useMemo(
    () => DAYS.map((d) => (isOn && ids.length ? sumBlocks(ids.map((id) => dayBlocks(energyOf(id), d.weekday))) : [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids.join(","), isOn],
  )
  const sum = (k: keyof Block) => blocks.reduce((a, b) => a + (b[k] as number) / 4, 0) / 1000
  const demand = sum("demand")
  const re = sum("ppa") + sum("rooftop")
  const peakIdx = blocks.reduce((m, b, i, arr) => (b.demand > arr[m].demand ? i : m), 0)
  const avgPrice = blocks.length ? blocks.reduce((a, _, i) => a + iexPrice(i), 0) / blocks.length : 0
  const latest = blocks[69]
  const factories = SITES.filter((s) => s.type === "plant")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={plant}
          onChange={(e) => setPlant(e.target.value)}
          className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[13px] font-medium"
          aria-label="Plant"
        >
          <option value={ALL}>All connected factories ({connected.length})</option>
          {factories.map((s) => (
            <option key={s.id} value={s.id}>
              {connected.includes(s.id) ? "● " : "○ "}
              {entityById(s.entityId).short} · {s.name}
            </option>
          ))}
        </select>
        <span className="text-[12px] text-muted">
          <b className="tnum text-fg">{connected.length}</b> of {factories.length} factories connected
        </span>
        {connected.length < factories.length && (
          <button
            type="button"
            onClick={onConnectAll}
            disabled={connecting}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-70"
            style={{ background: GOLD }}
          >
            {connecting ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />} {connecting ? "Connecting the group…" : "Connect the whole group"}
          </button>
        )}
      </div>

      {!isOn ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <Plug size={26} className="text-faint" />
          <p className="mt-3 text-[15px] font-semibold">{siteName(plant).name} is not connected yet</p>
          <p className="mt-1 max-w-md text-[13px] text-muted">ergOS reads the plant&apos;s ABT or smart meters, the DISCOM bills and the open-access statements. Connect the group to see it here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Total demand" value={fmt(demand, 1)} unit="MWh" sub={DAYS[day].label} color="#64748b" icon={Zap} />
            <Kpi label="Renewable" value={fmt(re, 1)} unit="MWh" sub={`${pct(demand ? re / demand : 0)} of demand`} color={COLORS.ppa} icon={Sun} />
            <Kpi label="Grid" value={fmt(sum("grid"), 1)} unit="MWh" sub="From DISCOM meters" color={COLORS.grid} icon={Gauge} />
            <Kpi label="Exchange (IEX)" value={fmt(sum("iex"), 1)} unit="MWh" sub="Not purchased" color={COLORS.iex} icon={ArrowLeftRight} />
            <Kpi
              label="Peak demand"
              value={fmt(blocks[peakIdx]?.demand ?? 0)}
              unit="kW"
              sub={`at ${String(Math.floor(peakIdx / 4)).padStart(2, "0")}:${String((peakIdx % 4) * 15).padStart(2, "0")}`}
              color="#94a3b8"
              icon={TrendingUp}
            />
            <Kpi label="IEX price" value={`₹${avgPrice.toFixed(2)}`} unit="/kWh" sub="Day-ahead average (illustrative)" color={COLORS.iex} icon={IndianRupee} />
          </div>

          <div className="rounded-xl border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line px-4 py-3 text-[12px]">
              <div>
                <p className="font-semibold">{DAYS[day].label} · 17:15</p>
                <p className="text-faint">Latest in view</p>
              </div>
              {[
                { k: "Total demand", v: latest?.demand, c: "var(--fg)", dashed: true },
                { k: "Renewable (PPA)", v: latest?.ppa, c: COLORS.ppa },
                { k: "Rooftop solar", v: latest?.rooftop, c: COLORS.rooftop },
                { k: "Grid supply", v: latest?.grid, c: COLORS.grid },
                { k: "Energy market (IEX)", v: latest?.iex, c: COLORS.iex },
                { k: "Surplus renewable", v: latest?.surplus, c: COLORS.surplus },
              ].map((l) => (
                <div key={l.k}>
                  <p className="flex items-center gap-1.5 text-muted">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: l.dashed ? "transparent" : l.c, border: l.dashed ? "1.5px dashed var(--fg)" : undefined }} />
                    {l.k}
                  </p>
                  <p className="tnum font-semibold">{fmt(l.v ?? 0)} kW</p>
                </div>
              ))}
            </div>
            <div className="p-3">
              <StackChart blocks={blocks} />
            </div>
            <div className="grid grid-cols-7 gap-1 border-t border-line p-2">
              {week.map((w, i) => {
                const mx = Math.max(...week.flat().map((b) => b.demand)) || 1
                return (
                  <button
                    key={DAYS[i].label}
                    type="button"
                    onClick={() => setDay(i)}
                    className={cn("rounded-md border p-1 text-left", i === day ? "border-accent bg-accent-soft" : "border-transparent hover:bg-surface-2")}
                  >
                    <span className="block font-mono text-[10px] text-faint">{DAYS[i].label}</span>
                    <svg viewBox="0 0 96 24" className="mt-0.5 h-6 w-full" preserveAspectRatio="none" aria-hidden>
                      <polygon points={`0,24 ${w.map((b, j) => `${j},${(24 - ((b.ppa + b.rooftop) / mx) * 22).toFixed(1)}`).join(" ")} 95,24`} fill={COLORS.ppa} opacity="0.7" />
                      <polyline points={w.map((b, j) => `${j},${(24 - (b.demand / mx) * 22).toFixed(1)}`).join(" ")} fill="none" stroke={COLORS.grid} strokeWidth="1.2" />
                    </svg>
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-[11.5px] text-faint">
            Monthly volumes: Bengaluru from the plant note; renewable shares from the filed BRSRs where public; other loads illustrative until meters connect. Intraday shapes are illustrative.
          </p>
        </>
      )}
    </div>
  )
}

const BASIS_TONE: Record<Basis, "green" | "blue" | "amber" | "grey"> = { "plant note": "green", "filed BRSR": "blue", "derived from BRSR": "amber", illustrative: "grey" }

function Baseline({ connected }: { connected: string[] }) {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle")
  const [done, setDone] = useState<string[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const rows = PLANT_ENERGY.filter((p) => connected.includes(p.siteId))

  function run() {
    timers.current.forEach(clearTimeout)
    setDone([])
    setPhase("running")
    rows.forEach((r, i) => timers.current.push(setTimeout(() => setDone((d) => [...d, r.siteId]), 450 + i * 380)))
    timers.current.push(setTimeout(() => setPhase("done"), 650 + rows.length * 380))
  }

  const finished = rows.filter((r) => done.includes(r.siteId))
  const tot = finished.reduce((a, r) => ({ e: a.e + r.annualMWh, re: a.re + r.ppaMWh + r.rooftopMWh }), { e: 0, re: 0 })
  const known = finished.filter((r) => r.loadBasis !== "illustrative")
  const sorted = [...finished].sort((a, b) => baselineOf(b).share - baselineOf(a).share)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
        <div>
          <p className="text-[15px] font-semibold">Baseline FY2025-26 · renewable share of electricity</p>
          <p className="text-[12.5px] text-muted">
            Twelve months per plant from meters, bills and open-access statements · {rows.length} factor{rows.length === 1 ? "y" : "ies"} connected
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={phase === "running"}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white disabled:opacity-70"
          style={{ background: phase === "done" ? "var(--green)" : GOLD }}
        >
          {phase === "running" ? <Loader2 size={14} className="animate-spin" /> : phase === "done" ? <Lock size={14} /> : <BarChart3 size={14} />}
          {phase === "running" ? "Running baselining…" : phase === "done" ? "Baseline locked · run again" : "Run baselining"}
        </button>
      </div>

      {phase !== "idle" && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-3 xl:col-span-4">
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-[12px] text-faint">Group renewable share, current</p>
              <p className="tnum mt-1 text-5xl font-semibold tracking-tight text-green">{pct(tot.e ? tot.re / tot.e : 0)}</p>
              <p className="tnum mt-1 text-[12.5px] text-muted">
                {fmt(tot.re / 1000, 1)} of {fmt(tot.e / 1000, 1)} GWh a year · {finished.length} of {rows.length} plants baselined
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-3">
                <motion.div className="h-full rounded-full bg-green" animate={{ width: `${tot.e ? (tot.re / tot.e) * 100 : 0}%` }} />
              </div>
              <p className="mt-2 text-[11.5px] text-faint">TCAIL&apos;s target: 50% renewable energy by 2030 (FY2025-26 BRSR).</p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-4 text-[12.5px]">
              <p className="font-semibold">Data basis</p>
              <p className="mt-1 text-muted">
                {known.length} plant{known.length === 1 ? "" : "s"} on shared or filed data; {finished.length - known.length} on illustrative loads until their meters connect. Each value
                keeps its source, so the baseline firms up plant by plant.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(Object.keys(BASIS_TONE) as Basis[]).map((b) => (
                  <Pill key={b} tone={BASIS_TONE[b]}>
                    {b}
                  </Pill>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-surface xl:col-span-8">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[12.5px]">
                <thead className="text-left text-[11px] text-faint">
                  <tr>
                    <th className="px-4 py-2 font-medium">Factory</th>
                    <th className="px-3 py-2 text-right font-medium">MWh / yr</th>
                    <th className="w-[34%] px-3 py-2 font-medium">Renewable share</th>
                    <th className="px-4 py-2 font-medium">Basis</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {sorted.map((r) => {
                      const b = baselineOf(r)
                      const s = siteName(r.siteId)
                      return (
                        <motion.tr key={r.siteId} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-line">
                          <td className="px-4 py-2">
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ background: entityById(s.entityId).color }} />
                              <span className="font-medium">{s.name}</span>
                              <span className="text-faint">{entityById(s.entityId).short}</span>
                            </span>
                          </td>
                          <td className="tnum px-3 py-2 text-right">{fmt(b.annual)}</td>
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-2">
                              <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                                <motion.span className="block h-full rounded-full bg-green" initial={{ width: 0 }} animate={{ width: `${b.share * 100}%` }} transition={{ duration: 0.6 }} />
                              </span>
                              <span className="tnum w-10 text-right font-semibold">{pct(b.share)}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <Pill tone={BASIS_TONE[r.reBasis === "illustrative" ? r.loadBasis : r.reBasis]}>{r.reBasis === "illustrative" ? r.loadBasis : r.reBasis}</Pill>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                  {rows
                    .filter((r) => !done.includes(r.siteId))
                    .map((r) => (
                      <tr key={r.siteId} className="border-t border-line text-faint">
                        <td className="px-4 py-2">{siteName(r.siteId).name}</td>
                        <td className="px-3 py-2 text-right">…</td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1.5">
                            <Loader2 size={12} className="animate-spin" /> reading 12 months
                          </span>
                        </td>
                        <td className="px-4 py-2" />
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {phase === "idle" && (
        <div className="grid place-items-center rounded-xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
          <Leaf size={26} className="text-green" />
          <p className="mt-3 text-[15px] font-semibold">Run baselining to see the current renewable share</p>
          <p className="mt-1 max-w-md text-[13px] text-muted">
            ergOS reads twelve months for every connected plant, splits each kWh by source and locks the FY2025-26 baseline that every later month is measured against.
          </p>
        </div>
      )}
    </div>
  )
}

export default function Ergos() {
  const [tab, setTab] = useState<Tab>("today")
  const [connected, setConnected] = useState<string[]>(["fmgil-blr"])
  const [connecting, setConnecting] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function connectAll() {
    setConnecting(true)
    const todo = PLANT_ENERGY.map((p) => p.siteId).filter((id) => !connected.includes(id))
    todo.forEach((id, i) => timers.current.push(setTimeout(() => setConnected((c) => (c.includes(id) ? c : [...c, id])), 250 + i * 220)))
    timers.current.push(setTimeout(() => setConnecting(false), 400 + todo.length * 220))
  }

  return (
    <div className="space-y-5">
      <PageHead
        eyebrow="ergOS · the group on one platform"
        title="Every factory's energy, live, in one place."
        lede="ergOS connects each plant's meters, DISCOM bills and open-access statements, shows the day by source, and runs the baseline that targets and savings are measured against. Bengaluru is connected from the plant note; connect the rest of the group to see it build."
      />
      <div className="flex overflow-hidden rounded-2xl border border-line bg-[#fbfaf7] shadow-[0_1px_3px_rgba(0,29,52,0.06)]">
        <Sidebar tab={tab} setTab={setTab} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 border-b border-line bg-surface px-5 py-3 text-[13px]">
            <span className="text-muted">Dashboard</span>
            <ChevronRight size={13} className="text-faint" />
            <span className="font-medium">{tab === "today" ? "Today" : tab === "baseline" ? "Baselines" : "Bills and meters"}</span>
            <div className="ml-auto flex gap-1 rounded-lg bg-surface-2 p-0.5 lg:hidden">
              {(["today", "baseline", "bills"] as Tab[]).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-md px-2 py-1 text-[12px]", tab === t ? "bg-surface font-medium" : "text-muted")}>
                  {t === "today" ? "Today" : t === "baseline" ? "Baseline" : "Bills"}
                </button>
              ))}
            </div>
            <span className="ml-auto hidden items-center gap-1.5 text-[12px] text-muted lg:flex">
              <span className="h-2 w-2 rounded-full bg-green" /> {connected.length} factor{connected.length === 1 ? "y" : "ies"} live
            </span>
          </div>
          <div className="p-4 sm:p-5">
            {tab === "today" && <Today connected={connected} connecting={connecting} onConnectAll={connectAll} />}
            {tab === "baseline" && <Baseline connected={connected} />}
            {tab === "bills" && <BillsTab />}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <Check size={13} className="text-green" /> One login for all twelve entities · <Eyebrow className="inline text-[10px]">next</Eyebrow> esgOS turns the same records into BRSR Core and a gap assessment.
      </div>
    </div>
  )
}
