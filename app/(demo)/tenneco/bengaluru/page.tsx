"use client"

import { ArrowRight, CircleHelp, Factory, Flame, Leaf, Zap } from "lucide-react"
import Link from "next/link"
import { Card, Eyebrow, PageHead, Pill, SourceLinks, fmt, pct } from "@/components/ui/kit"
import { BRSR, GJ_PER_MWH, renewableShare } from "@/lib/brsr"
import { PROCESSES } from "@/lib/heat"
import { GRID_EF, PLANT } from "@/lib/power"
import { SITES, SRC } from "@/lib/sites"

const site = SITES.find((s) => s.id === "fmgil-blr")!

const MIX = [
  { label: "Existing PPA", kWh: PLANT.ppaKWh, color: "#0f7a47", note: "wind and solar wheeling, per filings" },
  { label: "Green offer at ₹6.96", kWh: PLANT.offerGreenKWh, color: "#5bbf8a", note: "offered, not yet bought" },
  { label: "BESCOM at ₹5.00", kWh: PLANT.discomKWh, color: "#b7c1ce", note: "not green" },
]

const OPEN = [
  "Do the PPA's renewable certificates reach Tenneco? Until they do, its units don't count as zero in market-based Scope 2.",
  "The PPA tariff, to price every option against it.",
  "Heat duty, bath temperatures and current heating for each phosphating and plating line.",
  "Roof area for rooftop solar.",
]

export default function BengaluruToday() {
  const g = BRSR.fmgil
  const annualMWh = (PLANT.monthlyKWh * 12) / 1000
  const reToday = PLANT.ppaKWh / PLANT.monthlyKWh
  const locationT = annualMWh * GRID_EF
  const marketT = ((PLANT.monthlyKWh - PLANT.ppaKWh) * 12 * GRID_EF) / 1000
  const shareOfFmgil = (annualMWh * GJ_PER_MWH) / g.energyTotal.value

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Bengaluru · FMGIL · today"
        title="Bengaluru plant: where it stands today."
        lede={
          <>
            {site.product} on {site.area}. The plant shared one month of power data and a first look at its heat-hungry lines. Here is what that and the public record
            say, and what we still need to know.
          </>
        }
        right={
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-deep text-white">
              <Factory size={18} />
            </span>
            <div>
              <p className="text-[13px] font-semibold">{site.listedAs}</p>
              <p className="text-[12px] text-muted">
                {site.area}, {site.city}
              </p>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-[12px] text-faint">Electricity</p>
          <p className="tnum mt-1 text-3xl font-semibold tracking-tight">
            33 <span className="text-sm font-medium text-muted">lakh kWh / month</span>
          </p>
          <p className="mt-1 text-[12px] text-muted">
            ≈ {fmt(annualMWh / 1000, 1)} GWh a year · {pct(shareOfFmgil)} of FMGIL&apos;s filed energy
          </p>
        </Card>
        <Card>
          <p className="text-[12px] text-faint">Renewable share today</p>
          <p className="tnum mt-1 text-3xl font-semibold tracking-tight text-green">{pct(reToday, 1)}</p>
          <p className="mt-1 text-[12px] text-muted">the PPA, once its certificates are evidenced</p>
        </Card>
        <Card>
          <p className="text-[12px] text-faint">Scope 2 a year</p>
          <p className="tnum mt-1 text-3xl font-semibold tracking-tight">
            {fmt(marketT)} <span className="text-sm font-medium text-muted">t market</span>
          </p>
          <p className="mt-1 text-[12px] text-muted">
            {fmt(locationT)} t location-based · CEA v21, {GRID_EF} t/MWh
          </p>
        </Card>
        <Card>
          <p className="text-[12px] text-faint">Heat pump candidates</p>
          <p className="tnum mt-1 text-3xl font-semibold tracking-tight text-heat">
            3 <span className="text-sm font-medium text-muted">lines</span>
          </p>
          <p className="mt-1 text-[12px] text-muted">2 highly feasible, 1 to check economics</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <Eyebrow className="text-green">Electricity supply · one month (plant note)</Eyebrow>
          <div className="mt-4 flex h-12 overflow-hidden rounded-xl">
            {MIX.map((b) => (
              <div key={b.label} className="flex items-center justify-center text-[12px] font-semibold text-white" style={{ width: `${(b.kWh / PLANT.monthlyKWh) * 100}%`, background: b.color }}>
                {b.kWh >= 1e6 ? `${fmt(b.kWh / 1e5, 1)} lakh` : ""}
              </div>
            ))}
          </div>
          <ul className="mt-3 space-y-1.5">
            {MIX.map((b) => (
              <li key={b.label} className="flex items-center gap-2 text-[13px]">
                <span className="h-3 w-3 rounded" style={{ background: b.color }} />
                <span className="font-medium">{b.label}</span>
                <span className="tnum text-muted">{fmt(b.kWh / 1e5, 1)} lakh units</span>
                <span className="text-faint">· {b.note}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-line pt-4">
            <Eyebrow className="text-heat">Process heat · initial feasibility (plant note)</Eyebrow>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {PROCESSES.map((p, i) => (
                <li key={p.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between">
                    <span className="tnum grid h-6 w-6 place-items-center rounded-full bg-heat-soft font-mono text-[11px] font-semibold text-heat">{i + 1}</span>
                    <Pill tone={p.feasibility === "good" ? "green" : "amber"}>{p.feasibility === "good" ? "Highly feasible" : "Check economics"}</Pill>
                  </div>
                  <p className="mt-2 text-[13.5px] font-medium">{p.name}</p>
                  <p className="text-[12px] text-muted">{p.assessment}</p>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-5">
          <Card>
            <Eyebrow className="flex items-center gap-2 text-green">
              <Leaf size={13} /> Already done, on the public record
            </Eyebrow>
            <ul className="mt-3 space-y-2 text-[13px] leading-snug">
              <li>About 95% of the plant&apos;s electricity is wheeled from wind, hydro and solar (CARE Ratings, Mar 2024)</li>
              <li>23 MW of solar power taken for Bengaluru on top of existing wind (FY24 directors&apos; report)</li>
              <li>FMGIL: renewables at {pct(renewableShare(g))} of total energy in FY2025-26, up from {pct(renewableShare(g, "py"))}</li>
              <li>FMGIL: {pct(g.wasteRecovered.value / g.wasteTotal.value)} of waste recovered; sites run to ISO 14001 and ISO 50001</li>
            </ul>
            <SourceLinks sources={[SRC.care, SRC.fmgilDr, { label: "FMGIL BRSR FY2025-26", url: g.pdfUrl }, { label: "FMGIL BRSR FY2023-24", url: "https://nsearchives.nseindia.com/corporate/Federal_25072024210447_BRSR.pdf" }]} className="mt-3" />
          </Card>
          <Card>
            <Eyebrow className="flex items-center gap-2 text-amber">
              <CircleHelp size={13} /> Still to find out
            </Eyebrow>
            <ul className="mt-3 space-y-2">
              {OPEN.map((o) => (
                <li key={o} className="flex gap-2 text-[13px] leading-snug text-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                  {o}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div>
        <Eyebrow>Two tracks for this plant</Eyebrow>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <Link href="/tenneco/bengaluru/power" className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-green">
            <div className="flex items-center justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-green-soft text-green">
                <Zap size={20} />
              </span>
              <ArrowRight size={18} className="text-faint transition-transform group-hover:translate-x-1 group-hover:text-green" />
            </div>
            <p className="mt-3 text-xl font-semibold tracking-tight">Electricity track</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
              What it takes to move from {pct(reToday)} to a fully renewable supply, route by route, and what each route costs against the plant&apos;s current plan.
            </p>
          </Link>
          <Link href="/tenneco/bengaluru/heat" className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-heat">
            <div className="flex items-center justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-heat-soft text-heat">
                <Flame size={20} />
              </span>
              <ArrowRight size={18} className="text-faint transition-transform group-hover:translate-x-1 group-hover:text-heat" />
            </div>
            <p className="mt-3 text-xl font-semibold tracking-tight">Heat track</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
              Heat pumps for the phosphating and plating baths: COP, cost of heat, saving and payback, on a capex or pay-per-heat model.
            </p>
          </Link>
        </div>
      </div>
      <SourceLinks sources={[SRC.tenneco, SRC.plantNote]} />
    </div>
  )
}
