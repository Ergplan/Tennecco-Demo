"use client"

import { motion } from "framer-motion"
import { ArrowRight, Flame, Gauge, LineChart, Zap } from "lucide-react"
import Link from "next/link"
import { Card, Eyebrow, Pill, SourceLinks, fmt, pct } from "@/components/ui/kit"
import { BRSR, renewableShare } from "@/lib/brsr"
import { ENTITIES, type Entity } from "@/lib/entities"
import { SITES } from "@/lib/sites"

const factories = SITES.filter((s) => s.type === "plant")
const states = new Set(factories.map((s) => s.state))

const BUSINESSES = [
  { name: "Clean Air & Powertrain", who: "TCAIL", what: "Catalytic converters, mufflers, BS6 exhaust" },
  { name: "Advanced Ride Technology", who: "Tenneco Automotive India", what: "Monroe shock absorbers and struts" },
  { name: "Powertrain components", who: "Federal-Mogul Goetze", what: "Pistons, rings, pins, liners, valve seats" },
  { name: "Bearings and sealings", who: "FM Bearings · FM Sealings", what: "Engine bearings, gaskets, heat shields" },
]

function EntityRow({ e, depth = 0 }: { e: Entity; depth?: number }) {
  return (
    <li className="flex items-center gap-2 py-1.5" style={{ paddingLeft: depth * 18 }}>
      {depth > 0 && <span className="h-px w-3 bg-line-strong" />}
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
      <span className="min-w-0 flex-1 truncate text-[13px] text-fg" title={e.name}>
        {e.name}
      </span>
      <span className="hidden shrink-0 text-[11.5px] text-muted sm:block">{e.relationship.replace(" subsidiary of ", " of ")}</span>
      <Pill tone={e.balanceSheet === "Included" ? "green" : "grey"} className="shrink-0">
        {e.balanceSheet === "Included" ? "Balance sheet ✓" : "Not public"}
      </Pill>
    </li>
  )
}

export default function Company() {
  const t = BRSR.tcail
  const g = BRSR.fmgil
  const byId = (id: string) => ENTITIES.find((e) => e.id === id)!
  const turnoverCr = (t.turnoverInr + g.turnoverInr) / 1e7

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="min-w-0 lg:col-span-7">
          <Eyebrow>Company</Eyebrow>
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.04]">
            Tenneco India
          </motion.h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">
            Tenneco&apos;s Indian business runs through two listed companies: Tenneco Clean Air India (listed November 2025) with its subsidiaries, and Federal-Mogul
            Goetze (listed since 1995). Together they make clean-air systems, ride control, pistons, rings, bearings and sealings for India&apos;s vehicle makers.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: "Indian entities", v: "12" },
              { k: "Listed", v: "2" },
              { k: "Factories", v: String(factories.length) },
              { k: "States + UT", v: `${states.size - 1} + 1` },
            ].map((x) => (
              <Card key={x.k} className="p-4">
                <p className="text-[12px] text-faint">{x.k}</p>
                <p className="tnum mt-1 text-3xl font-semibold tracking-tight">{x.v}</p>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {BUSINESSES.map((b) => (
              <div key={b.name} className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-[14px] font-semibold">{b.name}</p>
                <p className="text-[12px] text-faint">{b.who}</p>
                <p className="mt-1 text-[13px] text-muted">{b.what}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[t, g].map((r) => (
              <Card key={r.entityId} className="p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-faint">{r.symbol}</p>
                <p className="text-[14px] font-semibold leading-tight">{r.company.replace(" Limited", "")}</p>
                <dl className="mt-3 space-y-2 text-[12.5px]">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Turnover {r.fy}</dt>
                    <dd className="tnum font-medium">₹{fmt(r.turnoverInr / 1e7)} Cr</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Energy used</dt>
                    <dd className="tnum font-medium">{fmt(r.energyTotal.value)} GJ</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Renewable share</dt>
                    <dd className="tnum font-medium text-green">{pct(renewableShare(r))}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Scope 1 + 2</dt>
                    <dd className="tnum font-medium">{fmt(r.scope1.value + r.scope2.value)} tCO₂e</dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
          <SourceLinks
            className="mt-2"
            sources={[
              { label: "TCAIL BRSR FY2025-26", url: t.pdfUrl },
              { label: "FMGIL BRSR FY2025-26", url: g.pdfUrl },
            ]}
          />
          <p className="mt-1 text-[12px] text-faint">Combined standalone turnover ₹{fmt(turnoverCr)} Cr in FY2025-26.</p>
        </section>

        <section className="min-w-0 space-y-5 lg:col-span-5">
          <Card className="p-4">
            <p className="text-[13px] font-semibold">Group structure in India</p>
            <ul className="mt-2 divide-y divide-line">
              <EntityRow e={byId("tcail")} />
              {["taipl", "fmipl", "fmbil", "fmsil"].map((id) => (
                <EntityRow key={id} e={byId(id)} depth={1} />
              ))}
              <EntityRow e={byId("fmgil")} />
              <EntityRow e={byId("fmtpr")} depth={1} />
              {["fmps", "fmmp", "motocare", "tgs", "tio"].map((id) => (
                <EntityRow key={id} e={byId(id)} />
              ))}
            </ul>
          </Card>

          <Link href="/tenneco/map" className="group flex items-center justify-between rounded-2xl bg-brand-deep p-5 text-white">
            <span>
              <span className="block font-mono text-[11px] uppercase tracking-[0.14em] text-white/60">Next</span>
              <span className="mt-1 block text-lg font-semibold">Map the footprint and the shareholding</span>
              <span className="block text-[13px] text-white/70">From the filings, the way esgOS does it</span>
            </span>
            <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </section>
      </div>

      <section>
        <Eyebrow>What jouleWise brings</Eyebrow>
        <div className="mt-3 grid gap-4 md:grid-cols-4">
          {[
            { icon: Zap, tone: "text-green bg-green-soft", title: "Electricity", text: "Every plant to verified renewable power, with the cost of each route against today's supply." },
            { icon: Flame, tone: "text-heat bg-heat-soft", title: "Heat", text: "Industrial heat pumps for baths, washers and paint shops, on capex or Heat-as-a-Service." },
            { icon: Gauge, tone: "text-accent bg-accent-soft", title: "ergOS", text: "Every plant's meters and bills on one energy platform: live demand, sources, prices and baselines." },
            { icon: LineChart, tone: "text-accent bg-accent-soft", title: "esgOS", text: "One ESG system for all twelve entities: footprint, boundary, gaps and BRSR Core." },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-line bg-surface p-5">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${c.tone}`}>
                <c.icon size={19} />
              </span>
              <p className="mt-3 text-lg font-semibold tracking-tight">{c.title}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{c.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
