"use client"

import { Link2, Wrench } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { HeatPumpMachine } from "@/components/HeatPumpMachine"
import { useDemo } from "@/components/shell/DemoState"
import { Card, Chips, Count, Eyebrow, PageHead, Pill, Slider, SourceLinks, Stat, fmt, pct } from "@/components/ui/kit"
import { cn } from "@/components/ui/cn"
import { INCUMBENTS, PRACTICAL_CEILING_C, PROCESSES, SOURCES, cop, heatCase } from "@/lib/heat"
import { GRID_EF, scenario } from "@/lib/power"
import { SRC } from "@/lib/sites"

type Model = "capex" | "haas"

function CopCurve({ sourceC, deliverC, value }: { sourceC: number; deliverC: number; value: number }) {
  const W = 320
  const H = 150
  const pts: string[] = []
  for (let t = Math.max(sourceC + 10, 50); t <= 140; t += 2) {
    pts.push(`${(((t - 50) / 90) * 300 + 10).toFixed(1)},${(130 - (Math.min(cop(sourceC, t), 6.2) / 6) * 115).toFixed(1)}`)
  }
  const mx = ((Math.min(140, Math.max(50, deliverC)) - 50) / 90) * 300 + 10
  const my = 130 - (value / 6) * 115
  const ceil = ((PRACTICAL_CEILING_C - 50) / 90) * 300 + 10
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`COP falls as delivery temperature rises; at ${deliverC} °C it is ${value.toFixed(2)}`}>
      {[1, 2, 3, 4, 5].map((c) => (
        <g key={c}>
          <line x1="10" x2="310" y1={130 - (c / 6) * 115} y2={130 - (c / 6) * 115} stroke="var(--line)" />
          <text x="313" y={133 - (c / 6) * 115} fontSize="8" fill="var(--faint)" fontFamily="var(--font-mono)">
            {c}
          </text>
        </g>
      ))}
      <line x1={ceil} x2={ceil} y1="6" y2="130" stroke="var(--heat)" strokeDasharray="3 3" />
      <text x={ceil - 3} y="14" textAnchor="end" fontSize="8" fill="var(--heat)" fontFamily="var(--font-mono)">
        120 °C ceiling
      </text>
      <polyline points={pts.join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2" />
      <circle cx={mx} cy={my} r="4.5" fill="var(--heat)" stroke="#fff" strokeWidth="1.5" />
      {[50, 70, 90, 110, 130].map((t) => (
        <text key={t} x={((t - 50) / 90) * 300 + 10} y="145" textAnchor={t === 50 ? "start" : "middle"} fontSize="8" fill="var(--faint)" fontFamily="var(--font-mono)">
          {t} °C
        </text>
      ))}
    </svg>
  )
}

function CostBars({ rows }: { rows: { name: string; value: number; color: string; note?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 0.0001)
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.name} className="grid grid-cols-[150px_1fr_64px] items-center gap-3 sm:grid-cols-[190px_1fr_64px]">
          <span className="text-[12.5px] leading-tight">
            {r.name}
            {r.note && <span className="block text-[11px] text-faint">{r.note}</span>}
          </span>
          <span className="h-3 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.color }} />
          </span>
          <span className="tnum text-right font-mono text-[12px]">₹{r.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

export default function BengaluruHeat() {
  const { route, target, assumptions } = useDemo()
  const power = scenario(route, target, assumptions)
  const [procId, setProcId] = useState(PROCESSES[0].id)
  const proc = PROCESSES.find((p) => p.id === procId)!
  const [srcId, setSrcId] = useState(SOURCES[1].id)
  const src = SOURCES.find((s) => s.id === srcId)!
  const [sourceC, setSourceC] = useState(src.c)
  const [bathC, setBathC] = useState(proc.bathC)
  const [dutyKW, setDutyKW] = useState(proc.dutyKW)
  const [hours, setHours] = useState(6000)
  const [incId, setIncId] = useState(INCUMBENTS[0].id)
  const inc = INCUMBENTS.find((i) => i.id === incId)!
  const [fuelPrice, setFuelPrice] = useState(inc.price)
  const [capexPerKW, setCapexPerKW] = useState(35000)
  const [model, setModel] = useState<Model>("capex")
  const [haasDiscount, setHaasDiscount] = useState(0.2)
  const [useGreen, setUseGreen] = useState(true)

  function pickProcess(id: string) {
    const p = PROCESSES.find((x) => x.id === id)!
    setProcId(id)
    setBathC(p.bathC)
    setDutyKW(p.dutyKW)
  }
  function pickSource(id: string) {
    const s = SOURCES.find((x) => x.id === id)!
    setSrcId(id)
    setSourceC(s.c)
  }
  function pickIncumbent(id: string) {
    const i = INCUMBENTS.find((x) => x.id === id)!
    setIncId(id)
    setFuelPrice(i.price)
  }

  const greenShare = useGreen ? power.greenShare : 0
  const base = { sourceC, hours, incumbent: inc, fuelPrice, powerTariff: power.blended, greenShare, gridEf: GRID_EF, capexPerKW, haasDiscount }
  const r = heatCase({ ...base, bathC, dutyKW, capexFactor: proc.capexFactor })

  // All three lines at their own bath temperature and placeholder duty.
  const all = useMemo(
    () =>
      PROCESSES.map((p) => ({
        p,
        r: heatCase({ ...base, bathC: p.id === procId ? bathC : p.bathC, dutyKW: p.id === procId ? dutyKW : p.dutyKW, capexFactor: p.capexFactor }),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceC, hours, incId, fuelPrice, power.blended, greenShare, capexPerKW, haasDiscount, procId, bathC, dutyKW],
  )
  const tot = all.reduce(
    (a, x) => ({ saving: a.saving + x.r.saving, capex: a.capex + x.r.capex, co2: a.co2 + x.r.co2Avoided, mwh: a.mwh + x.r.powerSavedMWh, haas: a.haas + x.r.haasSaving }),
    { saving: 0, capex: 0, co2: 0, mwh: 0, haas: 0 },
  )

  const isElec = inc.id === "elec"

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Bengaluru plant · process heat"
        title={
          <>
            A phosphating bath at {bathC} °C doesn&apos;t need a heater. <span className="text-heat">It needs a heat pump.</span>
          </>
        }
        lede="The plant's first look found three surface-treatment lines where a heat pump is feasible. A heat pump moves heat that is already there, from cooling water or air, into the bath: one unit of power delivers three to four units of heat. Pick a line and move the sliders."
      />

      <div className="grid gap-3 md:grid-cols-3">
        {PROCESSES.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => pickProcess(p.id)}
            className={cn("rounded-2xl border bg-surface p-4 text-left transition-colors", procId === p.id ? "border-heat ring-2 ring-heat/20" : "border-line hover:border-heat/50")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="tnum grid h-7 w-7 place-items-center rounded-full bg-heat-soft font-mono text-[12px] font-semibold text-heat">{i + 1}</span>
              <Pill tone={p.feasibility === "good" ? "green" : "amber"}>{p.feasibility === "good" ? "Highly feasible" : "Feasible · check economics"}</Pill>
            </div>
            <p className="mt-2 text-[15px] font-semibold tracking-tight">{p.name}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{p.why}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="space-y-5 xl:col-span-4">
          <div>
            <p className="mb-2 text-[13px] font-medium">Heat source</p>
            <Chips options={SOURCES.map((s) => ({ id: s.id, label: s.name }))} value={srcId} onChange={pickSource} />
          </div>
          <Slider label="Source temperature" value={sourceC} min={15} max={60} step={1} display={`${sourceC} °C`} onChange={setSourceC} note={src.note} color="var(--sky)" />
          <Slider label="Bath temperature" value={bathC} min={45} max={110} step={1} display={`${bathC} °C`} onChange={setBathC} note={`Heat pump delivers ${bathC + 5} °C to the bath exchanger`} color="var(--heat)" />
          <Slider label="Heat duty of the line" value={dutyKW} min={20} max={600} step={10} display={`${dutyKW} kW`} onChange={setDutyKW} note="Placeholder until the plant shares line data; sizing is part of the pilot" color="var(--heat)" />
          <Slider label="Operating hours" value={hours} min={2000} max={8400} step={100} display={`${fmt(hours)} h/yr`} onChange={setHours} />
          <div>
            <p className="mb-2 text-[13px] font-medium">Heated today by</p>
            <Chips options={INCUMBENTS.map((x) => ({ id: x.id, label: x.name.replace(" heating", "").replace(" boiler", "") }))} value={incId} onChange={pickIncumbent} />
            <p className="mt-1 text-[11.5px] text-faint">{inc.note}. To confirm: the plant note ties savings to the lines&apos; power use.</p>
          </div>
          {!isElec && (
            <Slider label={`${inc.name} price`} value={fuelPrice} min={inc.price * 0.5} max={inc.price * 1.5} step={0.5} display={`₹${fuelPrice}/${inc.unit}`} onChange={setFuelPrice} />
          )}
          <div className="rounded-xl bg-green-soft/60 p-3 text-[12.5px]">
            <p className="flex items-center gap-1.5 font-medium text-green">
              <Link2 size={13} /> From the power page
            </p>
            <p className="tnum mt-1 text-fg">
              ₹{power.blended.toFixed(2)}/kWh blended · {pct(power.greenShare, 1)} green
            </p>
            <label className="mt-2 flex items-center gap-2 text-muted">
              <input type="checkbox" checked={useGreen} onChange={(e) => setUseGreen(e.target.checked)} className="accent-[var(--green)]" />
              Count the plant&apos;s green share for the heat pump&apos;s power
            </label>
            <Link href="/tenneco/bengaluru/power" className="mt-1 inline-block text-[12px] font-medium text-green underline underline-offset-2">
              Change the power mix →
            </Link>
          </div>
        </Card>

        <div className="min-w-0 space-y-6 xl:col-span-8">
          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
              <div>
                <Eyebrow className="text-heat">{proc.name}</Eyebrow>
                <p className="text-[13px] text-muted">
                  {src.name} at {sourceC} °C in → bath at {bathC} °C · lift {r.lift} K
                </p>
              </div>
              <Pill tone={r.cop >= 3 ? "green" : r.cop >= 2 ? "amber" : "red"}>COP {r.cop.toFixed(2)}</Pill>
            </div>
            <div className="bg-gradient-to-b from-surface to-surface-2 px-2 py-4">
              <HeatPumpMachine
                labels={{
                  sourceName: src.name.replace("Air-compressor cooling water", "Compressor cooling water"),
                  sourceInC: sourceC,
                  sourceOutC: sourceC - 5,
                  sinkName: "Bath water",
                  sinkInC: bathC - 8,
                  sinkOutC: bathC + 5,
                  cop: r.cop,
                }}
              />
            </div>
            {!r.withinCeiling && (
              <p className="border-t border-line bg-amber-soft px-5 py-2 text-[12.5px] text-amber">
                {r.deliverC} °C is above the {PRACTICAL_CEILING_C} °C these machines serve reliably; this duty would stay on its current heating.
              </p>
            )}
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Eyebrow>This line, a year</Eyebrow>
              <Chips
                options={[
                  { id: "capex", label: "Capex: Tenneco owns it" },
                  { id: "haas", label: "Heat-as-a-Service: pay per kWh of heat" },
                ]}
                value={model}
                onChange={(v) => setModel(v as Model)}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-5 md:grid-cols-4">
              <Stat label="Heat delivered" value={fmt(r.heatMWh)} unit="MWh-th" sub={`${dutyKW} kW × ${fmt(hours)} h`} />
              <Stat
                label="Cost of heat"
                value={`₹${r.costPerKWhHp.toFixed(2)}`}
                unit="/kWh-th"
                tone="good"
                sub={`today ₹${r.costPerKWhToday.toFixed(2)} on ${inc.name.toLowerCase()}`}
              />
              {model === "capex" ? (
                <>
                  <Stat label="Saving" value={<Count value={r.saving / 1e5} format={(n) => `₹${n.toFixed(1)} lakh`} />} tone={r.saving > 0 ? "good" : "warn"} sub={`${pct(r.savingPct)} of today's heat bill`} />
                  <Stat
                    label="Simple payback"
                    value={Number.isFinite(r.payback) ? `${r.payback.toFixed(1)} yrs` : "—"}
                    tone={r.payback < 3 ? "good" : "warn"}
                    sub={`capex ₹${(r.capex / 1e5).toFixed(0)} lakh at ₹${fmt(capexPerKW * proc.capexFactor)}/kW`}
                  />
                </>
              ) : (
                <>
                  <Stat label="Saving, no capex" value={<Count value={r.haasSaving / 1e5} format={(n) => `₹${n.toFixed(1)} lakh`} />} tone="good" sub={`heat at ₹${r.haasTariff.toFixed(2)}/kWh-th, ${pct(haasDiscount)} below today`} />
                  <Stat label="Tenneco's capex" value="₹0" tone="good" sub="jouleWise funds, installs, runs and maintains" />
                </>
              )}
              <Stat label="CO₂ avoided" value={<Count value={r.co2Avoided} format={(n) => fmt(n)} />} unit="t/yr" tone="good" sub={useGreen ? `with ${pct(greenShare)} green power` : "on grid power"} />
              {isElec && <Stat label="Electricity saved" value={fmt(r.powerSavedMWh)} unit="MWh/yr" sub={`${fmt(r.powerSavedMWh / 12 / 100, 1)} lakh units a month`} />}
              <Stat label="Heat pump draws" value={fmt(r.hpPowerMWh)} unit="MWh/yr" sub={`${fmt(r.heatMWh / r.cop / hours * 1000, 0)} kW electric`} />
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.1em] text-faint">Cost per kWh of heat in the bath</p>
                <CostBars
                  rows={[
                    { name: inc.name, value: r.costPerKWhToday, color: "#7f8ea3", note: isElec ? "≈ 1 unit of power per unit of heat" : undefined },
                    { name: "Heat pump, plant's power", value: r.costPerKWhHp, color: "var(--heat)", note: `₹${power.blended.toFixed(2)} ÷ COP ${r.cop.toFixed(2)}` },
                    ...(model === "haas" ? [{ name: "Heat-as-a-Service tariff", value: r.haasTariff, color: "var(--accent)", note: "fixed, indexed" }] : []),
                  ]}
                />
                {model === "capex" ? (
                  <div className="mt-4">
                    <Slider label="Installed cost" value={capexPerKW} min={15000} max={70000} step={1000} display={`₹${fmt(capexPerKW)}/kW-th`} onChange={setCapexPerKW} note="Indicative; quoted after sizing" />
                  </div>
                ) : (
                  <div className="mt-4">
                    <Slider label="Discount on today's cost of heat" value={haasDiscount * 100} min={5} max={40} step={1} display={`${Math.round(haasDiscount * 100)}%`} onChange={(v) => setHaasDiscount(v / 100)} />
                  </div>
                )}
              </div>
              <div>
                <p className="mb-1 text-[12px] font-medium uppercase tracking-[0.1em] text-faint">COP against delivery temperature, from {sourceC} °C</p>
                <CopCurve sourceC={sourceC} deliverC={r.deliverC} value={r.cop} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <p className="text-[14px] font-semibold">All three lines together</p>
          <span className="text-[12px] text-faint">Same source, tariff and costs; each line at its own bath temperature and placeholder duty</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead className="text-left text-[11.5px] text-faint">
              <tr>
                <th className="px-5 py-2 font-medium">Line</th>
                <th className="px-3 py-2 font-medium">Bath</th>
                <th className="px-3 py-2 font-medium">Duty</th>
                <th className="px-3 py-2 font-medium">COP</th>
                <th className="px-3 py-2 text-right font-medium">Saving / yr</th>
                <th className="px-3 py-2 text-right font-medium">Capex</th>
                <th className="px-3 py-2 text-right font-medium">Payback</th>
                <th className="px-5 py-2 text-right font-medium">CO₂ avoided</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {all.map(({ p, r: x }) => (
                <tr key={p.id} className={cn("border-t border-line", p.id === procId && "bg-heat-soft/50")}>
                  <td className="px-5 py-2.5 font-medium">{p.name}</td>
                  <td className="px-3 py-2.5">{p.id === procId ? bathC : p.bathC} °C</td>
                  <td className="px-3 py-2.5">{p.id === procId ? dutyKW : p.dutyKW} kW</td>
                  <td className="px-3 py-2.5">{x.cop.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-right text-green">₹{(x.saving / 1e5).toFixed(1)} lakh</td>
                  <td className="px-3 py-2.5 text-right">₹{(x.capex / 1e5).toFixed(0)} lakh</td>
                  <td className="px-3 py-2.5 text-right">{Number.isFinite(x.payback) ? `${x.payback.toFixed(1)} yrs` : "—"}</td>
                  <td className="px-5 py-2.5 text-right">{fmt(x.co2Avoided)} t</td>
                </tr>
              ))}
              <tr className="border-t-2 border-line-strong font-semibold">
                <td className="px-5 py-3">Total</td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3" />
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-right text-green">₹{(tot.saving / 1e5).toFixed(1)} lakh</td>
                <td className="px-3 py-3 text-right">₹{(tot.capex / 1e5).toFixed(0)} lakh</td>
                <td className="px-3 py-3 text-right">{tot.saving > 0 ? `${(tot.capex / tot.saving).toFixed(1)} yrs` : "—"}</td>
                <td className="px-5 py-3 text-right">{fmt(tot.co2)} t</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="grid gap-4 border-t border-line p-5 md:grid-cols-3">
          <div className="flex gap-3">
            <Wrench size={18} className="mt-0.5 shrink-0 text-heat" />
            <p className="text-[12.5px] leading-snug text-muted">
              <b className="text-fg">Capex or opex.</b> Lines 1 and 3 can go in either way. Under Heat-as-a-Service Tenneco pays only for heat delivered, below today&apos;s cost, and keeps the boiler or heaters as standby.
            </p>
          </div>
          <div className="flex gap-3">
            <Wrench size={18} className="mt-0.5 shrink-0 text-heat" />
            <p className="text-[12.5px] leading-snug text-muted">
              <b className="text-fg">Cooling for free.</b> Taking heat out of compressor cooling water also takes load off the cooling tower: less fan power, less make-up water.
            </p>
          </div>
          <div className="flex gap-3">
            <Wrench size={18} className="mt-0.5 shrink-0 text-heat" />
            <p className="text-[12.5px] leading-snug text-muted">
              <b className="text-fg">Done nearby.</b> Bosch India put a heat pump on a wash bath at the Renault-Nissan plant in Chennai and cut its CO₂ by about half.
            </p>
          </div>
        </div>
        <SourceLinks
          sources={[
            SRC.plantNote,
            { label: "jouleWise Heat Pump Studio (COP model)", url: "https://websiterepo-zht9.vercel.app/heat-pump" },
            { label: "Bosch India heat pump, Renault-Nissan Chennai (Autocar Pro)", url: "https://autocarpro.in/news-national/bosch-india-energy-efficient-heat-pump-drives-gains-renault-nissan-india-plant-22362?amp=1" },
            { label: "DLR: heat pumps for pretreatment and e-coat", url: "https://elib.dlr.de/207155/1/SDEWES24_FP_117.pdf" },
          ]}
          className="border-t border-line px-5 py-3"
        />
      </Card>
    </div>
  )
}
