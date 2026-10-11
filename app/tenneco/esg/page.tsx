"use client"

import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, CircleDashed, Flame, Leaf, Minus, Zap } from "lucide-react"
import Link from "next/link"
import { Card, Eyebrow, PageHead, Pill, SourceLinks, fmt, pct } from "@/components/ui/kit"
import { cn } from "@/components/ui/cn"
import { BRSR, GJ_PER_MWH, change, renewableShare, type BrsrMetric, type BrsrRecord } from "@/lib/brsr"
import { entityById, type EntityId } from "@/lib/entities"
import { COVERAGE, COVERAGE_COLS, ENTITY_ESG } from "@/lib/esg"
import { GRID_EF, PLANT } from "@/lib/power"
import { PROCESSES } from "@/lib/heat"
import { SITES, SRC, sitesOf } from "@/lib/sites"

function Delta({ m, goodWhenDown = true }: { m: BrsrMetric; goodWhenDown?: boolean }) {
  const c = change(m)
  if (c === null) return null
  const down = c < 0
  const good = goodWhenDown ? down : !down
  const Icon = Math.abs(c) < 0.005 ? Minus : down ? ArrowDownRight : ArrowUpRight
  return (
    <span className={cn("tnum inline-flex items-center gap-0.5 text-[11.5px] font-medium", good ? "text-green" : "text-amber")}>
      <Icon size={12} />
      {Math.abs(c * 100).toFixed(0)}% vs FY25
    </span>
  )
}

function MetricGrid({ r }: { r: BrsrRecord }) {
  const re = renewableShare(r)
  const rePy = renewableShare(r, "py")
  const items: { label: string; value: string; unit?: string; delta?: React.ReactNode }[] = [
    { label: "Total energy", value: fmt(r.energyTotal.value), unit: "GJ", delta: <Delta m={r.energyTotal} /> },
    {
      label: "Renewable share",
      value: pct(re),
      delta: (
        <span className="text-[11.5px] font-medium text-green">
          from {pct(rePy)} in FY25
        </span>
      ),
    },
    { label: "Scope 1", value: fmt(r.scope1.value), unit: "tCO₂e", delta: <Delta m={r.scope1} /> },
    { label: "Scope 2", value: fmt(r.scope2.value), unit: "tCO₂e", delta: <Delta m={r.scope2} /> },
    { label: "Water withdrawn", value: fmt(r.waterWithdrawal.value), unit: "kL", delta: <Delta m={r.waterWithdrawal} /> },
    {
      label: "Waste recovered",
      value: pct(r.wasteRecovered.value / r.wasteTotal.value, r.wasteRecovered.value / r.wasteTotal.value > 0.99 ? 1 : 0),
      delta: <span className="text-[11.5px] text-muted">of {fmt(r.wasteTotal.value)} t</span>,
    },
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((i) => (
        <div key={i.label}>
          <dt className="text-[12px] text-faint">{i.label}</dt>
          <dd className="tnum mt-0.5 text-xl font-semibold tracking-tight">
            {i.value}
            {i.unit && <span className="ml-1 text-[12px] font-medium text-muted">{i.unit}</span>}
          </dd>
          <dd>{i.delta}</dd>
        </div>
      ))}
    </dl>
  )
}

function BengaluruHero() {
  const site = SITES.find((s) => s.id === "fmgil-blr")!
  const annualMWh = (PLANT.monthlyKWh * 12) / 1000
  const shareOfFmgil = (annualMWh * GJ_PER_MWH) / BRSR.fmgil.energyTotal.value
  const blocks = [
    { label: "Existing PPA", kWh: PLANT.ppaKWh, color: "#0f7a47", note: "wind / solar wheeling per filings; to verify" },
    { label: "Green offer at ₹6.96", kWh: PLANT.offerGreenKWh, color: "#5bbf8a", note: "available" },
    { label: "DISCOM at ₹5.00", kWh: PLANT.discomKWh, color: "#b7c1ce", note: "not green" },
  ]
  return (
    <Card className="border-green/40 p-0 ring-1 ring-green/15">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <div className="flex items-center gap-2">
            <Pill tone="green">Case study · top of the list</Pill>
            <Pill tone="blue">FMGIL</Pill>
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Bengaluru plant, Yelahanka</h2>
          <p className="text-[13.5px] text-muted">{site.product}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/tenneco/bengaluru/power" className="flex items-center gap-1.5 rounded-full bg-green px-4 py-2 text-[13px] font-medium text-white">
            <Zap size={14} /> 100% green power
          </Link>
          <Link href="/tenneco/bengaluru/heat" className="flex items-center gap-1.5 rounded-full bg-heat px-4 py-2 text-[13px] font-medium text-white">
            <Flame size={14} /> Process heat
          </Link>
        </div>
      </div>
      <div className="grid gap-6 p-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Eyebrow className="text-green">Electricity · one month (plant note)</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <p className="text-[12px] text-faint">Consumption</p>
              <p className="tnum text-2xl font-semibold">
                33 <span className="text-sm font-medium text-muted">lakh kWh / month</span>
              </p>
              <p className="text-[12px] text-muted">≈ {fmt(annualMWh / 1000, 1)} GWh a year · ≈ {pct(shareOfFmgil)} of FMGIL&apos;s filed energy</p>
            </div>
            <div>
              <p className="text-[12px] text-faint">Scope 2, location-based</p>
              <p className="tnum text-2xl font-semibold">
                {fmt((annualMWh * GRID_EF) / 1000, 1)}k <span className="text-sm font-medium text-muted">tCO₂ / yr</span>
              </p>
              <p className="text-[12px] text-muted">at CEA v21, {GRID_EF} tCO₂/MWh</p>
            </div>
          </div>
          <div className="mt-4 flex h-9 overflow-hidden rounded-lg">
            {blocks.map((b) => (
              <div key={b.label} className="flex items-center justify-center text-[11px] font-medium text-white" style={{ width: `${(b.kWh / PLANT.monthlyKWh) * 100}%`, background: b.color }} title={b.label}>
                {b.kWh >= 1e6 ? `${fmt(b.kWh / 1e5, 1)} lakh` : ""}
              </div>
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
            {blocks.map((b) => (
              <li key={b.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: b.color }} />
                {b.label}: {fmt(b.kWh / 1e5, 1)} lakh <span className="text-faint">({b.note})</span>
              </li>
            ))}
          </ul>
          <ul className="mt-4 space-y-1.5">
            {site.esg!.slice(0, 2).map((x) => (
              <li key={x} className="flex gap-2 text-[13px] text-fg">
                <Leaf size={14} className="mt-0.5 shrink-0 text-green" />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-5">
          <Eyebrow className="text-heat">Process heat · initial feasibility (plant note)</Eyebrow>
          <ul className="mt-3 space-y-2">
            {PROCESSES.map((p, i) => (
              <li key={p.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full bg-heat-soft font-mono text-[11px] font-semibold text-heat">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium">{p.name}</span>
                  <span className="block text-[12px] text-muted">{p.assessment}</span>
                </span>
                <Pill tone={p.feasibility === "good" ? "green" : "amber"}>{p.feasibility === "good" ? "Go" : "Check economics"}</Pill>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-faint">Heat pump sizing is finalised once the plant shares line data; capex or opex model.</p>
        </div>
      </div>
      <SourceLinks sources={[SRC.plantNote, SRC.care, SRC.fmgilDr]} className="border-t border-line px-5 py-3" />
    </Card>
  )
}

function EntitySection({ id }: { id: EntityId }) {
  const e = entityById(id)
  const r = e.brsr ? BRSR[e.brsr] : null
  const esg = ENTITY_ESG.find((x) => x.entityId === id)
  const sites = sitesOf(id).filter((s) => s.type !== "office" && !s.featured)
  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: e.color }} />
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{e.name}</h3>
            <p className="text-[12.5px] text-muted">
              {e.listed ?? e.relationship} · {e.business}
            </p>
          </div>
        </div>
        {r && <Pill tone="blue">BRSR {r.fy} · filed {r.filed}</Pill>}
      </div>
      <div className="space-y-5 p-5">
        {r && <MetricGrid r={r} />}
        {esg && (
          <div className="rounded-xl bg-green-soft/60 p-4">
            <p className="text-[13.5px] font-semibold text-fg">{esg.headline}</p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {esg.facts.map((f) => (
                <li key={f} className="flex gap-2 text-[12.5px] leading-snug text-fg">
                  <Check size={13} className="mt-0.5 shrink-0 text-green" />
                  {f}
                </li>
              ))}
            </ul>
            <SourceLinks sources={esg.sources} className="mt-2" />
          </div>
        )}
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-faint">Plants and what is public about each</p>
          <ul className="mt-2 grid gap-2 md:grid-cols-2">
            {sites.map((s) => (
              <li key={s.id} className="rounded-xl border border-line p-3">
                <p className="text-[13.5px] font-medium">
                  {s.name} <span className="font-normal text-muted">· {s.city}</span>
                  {s.entityId !== id && <span className="ml-1 text-[11px] text-faint">({entityById(s.entityId).short})</span>}
                </p>
                {s.esg?.length ? (
                  s.esg.map((x) => (
                    <p key={x} className="mt-1 flex gap-1.5 text-[12px] leading-snug text-muted">
                      <Leaf size={12} className="mt-0.5 shrink-0 text-green" /> {x}
                    </p>
                  ))
                ) : (
                  <p className="mt-1 flex gap-1.5 text-[12px] text-faint">
                    <CircleDashed size={12} className="mt-0.5 shrink-0" /> Plant-level energy, water and waste not public: collected from bills in esgOS
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}

function SubsidiaryRow({ id }: { id: EntityId }) {
  const e = entityById(id)
  const sites = sitesOf(id).filter((s) => s.type !== "office")
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium">{e.name}</span>
        <span className="block text-[12px] text-muted">
          {e.relationship} · {sites.map((s) => s.city).join(", ")}
        </span>
      </span>
      <span className="text-[12px] text-faint">
        {e.group === "TCAIL group" ? "Inside TCAIL’s consolidated accounts; no BRSR of its own" : "Promoter-group company; no public ESG data"}
      </span>
    </li>
  )
}

const CELL = {
  filed: { icon: Check, cls: "bg-green-soft text-green", label: "Filed" },
  partial: { icon: CircleDashed, cls: "bg-amber-soft text-amber", label: "Partial" },
  none: { icon: Minus, cls: "bg-surface-2 text-faint", label: "Not public" },
}

export default function EsgPage() {
  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="ESG by entity and site"
        title="What each company and plant has already done."
        lede="Everything public, against the entity that filed it and the plant it belongs to. Two companies file BRSR; their subsidiaries and most plant-level figures are not public yet. That gap is what a single platform closes."
      />

      <BengaluruHero />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 space-y-6 xl:col-span-8">
          <EntitySection id="fmgil" />
          <EntitySection id="tcail" />
          <Card className="p-0">
            <div className="border-b border-line px-5 py-3">
              <p className="text-[13px] font-semibold">Other entities with factories</p>
            </div>
            <ul className="divide-y divide-line">
              {(["taipl", "fmbil", "fmsil", "fmps"] as EntityId[]).map((id) => (
                <SubsidiaryRow key={id} id={id} />
              ))}
            </ul>
          </Card>
        </div>

        <aside className="min-w-0 xl:col-span-4">
          <Card className="sticky top-32">
            <p className="text-[13px] font-semibold">Data coverage today</p>
            <p className="text-[12px] text-muted">What can be reported from public filings alone</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="text-faint">
                    <th className="pb-2 text-left font-medium">Entity</th>
                    {COVERAGE_COLS.map((c) => (
                      <th key={c} className="px-0.5 pb-2 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COVERAGE.map((row) => (
                    <tr key={row.entityId} className="border-t border-line" title={row.note}>
                      <td className="py-2 pr-2 font-medium">{entityById(row.entityId).short}</td>
                      {row.cells.map((c, i) => {
                        const C = CELL[c]
                        return (
                          <td key={i} className="px-0.5 py-2 text-center">
                            <span className={cn("inline-grid h-6 w-6 place-items-center rounded-md", C.cls)} aria-label={C.label}>
                              <C.icon size={12} />
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-3 text-[11px] text-muted">
              {Object.values(CELL).map((c) => (
                <span key={c.label} className="flex items-center gap-1">
                  <span className={cn("inline-grid h-4 w-4 place-items-center rounded", c.cls)}>
                    <c.icon size={9} />
                  </span>
                  {c.label}
                </span>
              ))}
            </div>
            <Link href="/tenneco/platform" className="mt-4 flex items-center justify-between rounded-xl bg-accent-soft px-4 py-3 text-[13px] font-medium text-accent">
              Close the gap with one platform <ArrowRight size={15} />
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  )
}
