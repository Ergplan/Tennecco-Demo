"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Check, ChevronDown, Pause, Play, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useDemo } from "@/components/shell/DemoState"
import { Card, Chips, Count, Eyebrow, PageHead, Pill, Slider, SourceLinks, Stat, fmt, pct } from "@/components/ui/kit"
import { cn } from "@/components/ui/cn"
import { GRID_EF, PLANT, baseShare, lakh, plantPlan, scenario, unitsLakh, type RouteId } from "@/lib/power"
import { SRC } from "@/lib/sites"
import { GreenPowerKnowledge } from "@/components/power/GreenPowerKnowledge"

const ROUTE_OPTIONS: { id: RouteId; label: string }[] = [
  { id: "joulewise", label: "jouleWise route" },
  { id: "offered", label: "As offered to the plant" },
]

function CostCurve({ min, target }: { min: number; target: number }) {
  const { assumptions } = useDemo()
  const W = 560
  const H = 200
  const P = { l: 52, r: 14, t: 14, b: 30 }
  const xs = useMemo(() => Array.from({ length: 41 }, (_, i) => min + ((1 - min) * i) / 40), [min])
  const curves = useMemo(
    () =>
      (["offered", "joulewise"] as RouteId[]).map((r) => ({
        r,
        pts: xs.map((x) => ({ x, y: scenario(r, x, assumptions).annualCost })),
      })),
    [xs, assumptions],
  )
  const plan = plantPlan(assumptions)
  const all = curves.flatMap((c) => c.pts.map((p) => p.y)).concat(plan.annualCost)
  const lo = Math.min(...all) * 0.985
  const hi = Math.max(...all) * 1.01
  const sx = (x: number) => P.l + ((x - min) / Math.max(1e-6, 1 - min)) * (W - P.l - P.r)
  const sy = (y: number) => P.t + (1 - (y - lo) / (hi - lo)) * (H - P.t - P.b)
  const ticks = 4
  const color = { offered: "#c98a06", joulewise: "#14995a" }
  const cur = curves.map((c) => ({ r: c.r, y: scenario(c.r, target, assumptions).annualCost }))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Annual power cost against renewable share for both routes">
      {Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks).map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={sy(v)} y2={sy(v)} stroke="var(--line)" />
          <text x={P.l - 6} y={sy(v) + 3} textAnchor="end" fontSize="10" fill="var(--faint)" fontFamily="var(--font-mono)">
            ₹{(v / 1e7).toFixed(1)} Cr
          </text>
        </g>
      ))}
      {xs.filter((_, i) => i % 8 === 0).map((x) => (
        <text key={x} x={sx(x)} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--faint)" fontFamily="var(--font-mono)">
          {Math.round(x * 100)}%
        </text>
      ))}
      {curves.map((c) => (
        <polyline key={c.r} fill="none" stroke={color[c.r]} strokeWidth="2.5" strokeLinejoin="round" points={c.pts.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ")} />
      ))}
      <g>
        <circle cx={sx(plan.greenShare)} cy={sy(plan.annualCost)} r="6" fill="#fff" stroke="var(--danger)" strokeWidth="2.5" />
        <text x={sx(plan.greenShare) - 8} y={sy(plan.annualCost) - 10} textAnchor="end" fontSize="10.5" fill="var(--danger)" fontWeight="600">
          Plant&apos;s current plan
        </text>
      </g>
      <line x1={sx(target)} x2={sx(target)} y1={P.t} y2={H - P.b} stroke="var(--fg)" strokeDasharray="3 3" opacity="0.4" />
      {cur.map((c) => (
        <circle key={c.r} cx={sx(target)} cy={sy(c.y)} r="5" fill={color[c.r]} stroke="#fff" strokeWidth="2" />
      ))}
    </svg>
  )
}

export default function BengaluruPower() {
  const { route, setRoute, target, setTarget, assumptions: a, setAssumptions } = useDemo()
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const min = Math.floor(baseShare(a) * 1000) / 1000
  const t = Math.max(min, Math.min(1, target))
  const s = scenario(route, t, a)
  const other = scenario(route === "joulewise" ? "offered" : "joulewise", t, a)
  const plan = plantPlan(a)
  const today = scenario(route, min, a)
  const raf = useRef<number>(0)

  useEffect(() => {
    if (target < min) setTarget(min)
  }, [min, target, setTarget])

  function play() {
    if (playing) {
      cancelAnimationFrame(raf.current)
      setPlaying(false)
      return
    }
    setPlaying(true)
    const start = performance.now()
    const from = min
    const dur = 4200
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur)
      const e = 1 - Math.pow(1 - k, 3)
      setTarget(from + (1 - from) * e)
      if (k < 1) raf.current = requestAnimationFrame(step)
      else setPlaying(false)
    }
    raf.current = requestAnimationFrame(step)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const vsPlan = plan.annualCost - s.annualCost
  const steps =
    route === "joulewise"
      ? [
          { at: min, title: a.ppaVerified ? "Evidence the existing PPA as renewable" : "Secure the PPA's renewable certificates", text: "Get the generator's RECs (2,750 a month) transferred to and retired for Tenneco, so the 27.5 lakh units count in market-based Scope 2." },
          { at: (a.ppaVerified ? PLANT.ppaKWh : 0) / s.total + 0.0001, title: `Rooftop solar, ${a.rooftopMWp.toFixed(1)} MWp on RESCO`, text: `About ${unitsLakh((a.rooftopMWp * 1000 * a.rooftopYield) / 12)} units a month at ₹${a.rooftopPrice.toFixed(2)}, below the ₹5.00 grid rate. No capex.` },
          { at: (PLANT.ppaKWh + (a.rooftopMWp * 1000 * a.rooftopYield) / 12) / s.total + 0.0001, title: "Group-captive solar–wind top-up", text: `The rest at about ₹${a.captivePrice.toFixed(2)} landed, through the group-captive route FMGIL already uses. Exempt from cross-subsidy and additional surcharge.` },
        ]
      : [
          { at: min, title: "Evidence the existing PPA as renewable", text: "As above: certificates transferred and retired." },
          { at: PLANT.ppaKWh / s.total + 0.0001, title: "Buy the offered green power", text: `2.8 lakh units a month at ₹${PLANT.offerGreenPrice.toFixed(2)}, ₹1.96 above the DISCOM rate.` },
          { at: (PLANT.ppaKWh + PLANT.offerGreenKWh) / s.total + 0.0001, title: "BESCOM green tariff for the rest", text: `2.7 lakh units at ₹${(PLANT.discomPrice + a.greenTariffPremium).toFixed(2)}: the normal rate plus KERC's green premium.` },
        ]

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Bengaluru · electricity track"
        title={
          <>
            100% green power, for <span className="text-green">less</span> than the plan on the table.
          </>
        }
        lede={
          <>
            The plant uses 33 lakh units a month. The existing PPA covers 27.5 lakh; the plant has been offered 2.8 lakh green units at ₹6.96 and
            2.7 lakh grid units at ₹5.00. Move the slider to see how the last {pct(1 - PLANT.ppaKWh / PLANT.monthlyKWh)} turns green, and what it costs.
          </>
        }
      />

      <Card className="p-0">
        <div className="grid gap-6 p-5 lg:grid-cols-12 lg:p-6">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Chips options={ROUTE_OPTIONS} value={route} onChange={setRoute} />
              <button type="button" onClick={play} className="flex items-center gap-1.5 rounded-full bg-green px-4 py-1.5 text-[13px] font-medium text-white">
                {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "Pause" : "Take it to 100%"}
              </button>
            </div>
            <div className="mt-6">
              <Slider
                big
                label="Renewable share of the plant's electricity"
                value={Math.round(t * 1000) / 10}
                min={Math.round(min * 1000) / 10}
                max={100}
                step={0.1}
                display={`${(t * 100).toFixed(1)}%`}
                color="var(--green)"
                onChange={(v) => setTarget(v / 100)}
              />
            </div>

            <div className="mt-6">
              <div className="flex h-16 overflow-hidden rounded-xl border border-line">
                <AnimatePresence initial={false}>
                  {s.blocks.map((b) => (
                    <motion.div
                      key={b.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, width: `${(b.kWh / s.total) * 100}%` }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ type: "spring", stiffness: 220, damping: 30 }}
                      className="relative flex min-w-0 items-center justify-center overflow-hidden border-r border-white/60 text-[11px] font-semibold text-white last:border-r-0"
                      style={{ background: b.color }}
                      title={`${b.name}: ${unitsLakh(b.kWh)} units at ₹${b.price.toFixed(2)}`}
                    >
                      {b.kWh / s.total > 0.07 && <span className="truncate px-2">{unitsLakh(b.kWh)}</span>}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {s.blocks.map((b) => (
                  <li key={b.id} className="flex items-start gap-2 text-[12.5px]">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded" style={{ background: b.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{b.name}</span>
                      <span className="tnum block text-muted">
                        {unitsLakh(b.kWh)} units · ₹{b.price.toFixed(2)}/kWh · {b.green ? <span className="text-green">green</span> : <span>not green</span>}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-line pt-5 lg:col-span-4 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <Stat label="Renewable share" value={<Count value={s.greenShare * 100} format={(n) => `${n.toFixed(1)}%`} />} tone="good" sub={`from ${pct(min, 1)} today`} />
            <Stat
              label="Power bill, a year"
              value={<Count value={s.annualCost / 1e7} format={(n) => `₹${n.toFixed(2)} Cr`} />}
              sub={<span className="tnum">blended ₹{s.blended.toFixed(2)}/kWh</span>}
            />
            <Stat
              label="Against the plant's current plan"
              value={<Count value={Math.abs(vsPlan) / 1e5} format={(n) => `₹${n.toFixed(0)} lakh ${vsPlan >= 0 ? "less" : "more"}`} />}
              tone={vsPlan >= 0 ? "good" : "warn"}
              sub={`a year · that plan is ${pct(plan.greenShare, 1)} green at ₹${(plan.annualCost / 1e7).toFixed(2)} Cr`}
            />
            <Stat
              label="Scope 2, market-based"
              value={<Count value={s.scope2Market} format={(n) => `${fmt(n)} t`} />}
              sub={`from ${fmt(today.scope2Market)} tCO₂/yr · location-based ${fmt(s.scope2Location)} t`}
              tone={s.scope2Market < 1 ? "good" : undefined}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <Eyebrow>Annual power cost against renewable share</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-4 text-[12px]">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-green" /> jouleWise route
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 bg-amber" /> As offered to the plant
            </span>
            <span className="flex items-center gap-1.5 text-danger">○ Plant&apos;s current plan</span>
          </div>
          <div className="mt-3">
            <CostCurve min={min} target={t} />
          </div>
          <p className="mt-3 text-[13px] text-muted">
            At {pct(t, 0)} green the {route === "joulewise" ? "jouleWise route" : "offered route"} costs{" "}
            <b className="tnum text-fg">{lakh(Math.abs(s.annualCost - other.annualCost))}</b> a year {s.annualCost <= other.annualCost ? "less" : "more"} than the{" "}
            {route === "joulewise" ? "offered" : "jouleWise"} route. Cheaper green units come first, so on this route greener is cheaper.
          </p>
        </Card>

        <Card className="xl:col-span-5">
          <Eyebrow>How it&apos;s done</Eyebrow>
          <ol className="mt-3 space-y-3">
            {steps.map((st, i) => {
              const on = i === 0 || t > st.at + 0.001
              return (
                <li key={st.title} className={cn("flex gap-3 rounded-xl border p-3 transition-colors", on ? "border-green/40 bg-green-soft/60" : "border-line")}>
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold", on ? "bg-green text-white" : "bg-surface-2 text-faint")}>
                    {on ? <Check size={13} /> : i + 1}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-semibold">{st.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{st.text}</p>
                  </div>
                </li>
              )
            })}
          </ol>
          <div className="mt-4 rounded-xl bg-surface-2 p-3 text-[12px] leading-snug text-muted">
            Avoids <b className="tnum text-fg">{fmt(today.scope2Market - s.scope2Market)} tCO₂</b> a year against today ({GRID_EF} tCO₂/MWh, CEA v21).
            Pair with heat pumps and the plant buys fewer units in the first place.{" "}
            <Link href="/tenneco/bengaluru/heat" className="font-medium text-heat underline underline-offset-2">
              See process heat →
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-4 text-left">
          <span className="flex items-center gap-2 text-[14px] font-semibold">
            <SlidersHorizontal size={16} className="text-accent" /> Assumptions to agree in the pilot
            <Pill tone="amber">7 inputs</Pill>
          </span>
          <ChevronDown size={18} className={cn("text-muted transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="grid gap-x-8 gap-y-5 border-t border-line p-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <p className="text-[13px] font-medium">Existing PPA&apos;s renewable attributes</p>
              <Chips
                options={[
                  { id: "yes", label: "Evidenced (RECs retired)" },
                  { id: "no", label: "Not yet evidenced" },
                ]}
                value={a.ppaVerified ? "yes" : "no"}
                onChange={(v) => setAssumptions({ ...a, ppaVerified: v === "yes" })}
              />
              <p className="text-[11.5px] text-faint">Filings say Bengaluru runs on ~95% wheeled renewables; the plant note asks whether the PPA is green.</p>
            </div>
            <Slider label="PPA tariff" value={a.ppaPrice} min={3.5} max={7} step={0.05} display={`₹${a.ppaPrice.toFixed(2)}/kWh`} onChange={(v) => setAssumptions({ ...a, ppaPrice: v })} note="Not in the plant note; read from the PPA invoice. Same on both routes." />
            <Slider label="Rooftop solar size" value={a.rooftopMWp} min={0} max={3} step={0.1} display={`${a.rooftopMWp.toFixed(1)} MWp`} onChange={(v) => setAssumptions({ ...a, rooftopMWp: v })} note={`Roof survey in the pilot · ${fmt(a.rooftopYield)} kWh/kWp/yr in Bengaluru`} />
            <Slider label="Rooftop RESCO tariff" value={a.rooftopPrice} min={3} max={5} step={0.05} display={`₹${a.rooftopPrice.toFixed(2)}/kWh`} onChange={(v) => setAssumptions({ ...a, rooftopPrice: v })} note="Public range ₹3.50–3.75 (Mercom, 2025)" />
            <Slider label="Group-captive landed price" value={a.captivePrice} min={3.5} max={6.5} step={0.05} display={`₹${a.captivePrice.toFixed(2)}/kWh`} onChange={(v) => setAssumptions({ ...a, captivePrice: v })} note="₹3.5–4.5 before charges (public); set higher for wheeling and 8% banking" />
            <Slider label="BESCOM green tariff premium" value={a.greenTariffPremium} min={0} max={1.5} step={0.05} display={`₹${a.greenTariffPremium.toFixed(2)}/kWh`} onChange={(v) => setAssumptions({ ...a, greenTariffPremium: v })} note="KERC: 50 paise over the normal tariff" />
            <Slider label="Efficiency first (energy audit, ISO 50001)" value={a.efficiencyPct} min={0} max={12} step={0.5} display={`${a.efficiencyPct.toFixed(1)}% fewer units`} onChange={(v) => setAssumptions({ ...a, efficiencyPct: v })} note="US DOE: 12% average energy-cost cut within 15 months of ISO 50001" />
          </div>
        )}
        <SourceLinks sources={[SRC.plantNote, SRC.care, { label: "CEA CO₂ Baseline Database v21", url: "https://cea.nic.in/wp-content/uploads/baseline/2025/12/User_Guide_V_21.0.pdf" }]} className="border-t border-line px-5 py-3" />
      </Card>
      <div className="pt-6">
        <GreenPowerKnowledge />
      </div>
    </div>
  )
}
