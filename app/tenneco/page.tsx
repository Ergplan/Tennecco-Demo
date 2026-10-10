"use client"

import { motion } from "framer-motion"
import { Flame, Leaf, LineChart, Zap } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { IndiaMap } from "@/components/map/IndiaMap"
import { SiteCard } from "@/components/SiteCard"
import { Card, Eyebrow, Pill, SourceLinks, fmt, pct } from "@/components/ui/kit"
import { BRSR, renewableShare } from "@/lib/brsr"
import { ENTITIES, type Entity } from "@/lib/entities"
import { SITES } from "@/lib/sites"

const plants = SITES.filter((s) => s.type === "plant")
const states = new Set(plants.map((s) => s.state))

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

export default function Overview() {
  const [selected, setSelected] = useState<string | null>("fmgil-blr")
  const site = SITES.find((s) => s.id === selected)
  const t = BRSR.tcail
  const g = BRSR.fmgil
  const byId = (id: string) => ENTITIES.find((e) => e.id === id)!

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="min-w-0 lg:col-span-7">
        <Card className="relative overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
            <div>
              <Eyebrow>Tenneco in India</Eyebrow>
              <p className="mt-0.5 text-[13px] text-muted">
                {plants.length} plants in {states.size - 1} states and 1 UT · 1 under construction · R&D centres and offices
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-muted">
              <span className="flex items-center gap-1">
                <svg width="12" height="12">
                  <circle cx="6" cy="6" r="5" fill="var(--accent)" />
                </svg>
                Plant
              </span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12">
                  <path d="M6,0L12,6L6,12L0,6Z" fill="var(--accent)" />
                </svg>
                R&D
              </span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12">
                  <rect x="1" y="1" width="10" height="10" rx="2" fill="var(--accent)" />
                </svg>
                Office
              </span>
              <span className="flex items-center gap-1">
                <svg width="12" height="12">
                  <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="2 2" />
                </svg>
                Building
              </span>
            </div>
          </div>
          <div className="relative h-[52vh] min-h-[380px] bg-gradient-to-b from-surface to-surface-2 sm:h-[62vh] sm:min-h-[460px]">
            <IndiaMap sites={SITES} selectedId={selected} onSelect={setSelected} />
            {site && (
              <motion.div key={site.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="absolute right-4 top-4 hidden w-[340px] sm:block">
                <SiteCard site={site} compact />
              </motion.div>
            )}
          </div>
          {site && <SiteCard site={site} compact className="m-3 sm:hidden" />}
        </Card>
      </section>

      <section className="min-w-0 space-y-5 lg:col-span-5">
        <div>
          <Eyebrow>Company overview</Eyebrow>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[38px] sm:leading-[1.08]">
            Two listed companies, twelve entities, one ESG picture to build.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Tenneco&apos;s Indian business runs through Tenneco Clean Air India (listed November 2025) and its subsidiaries, and Federal-Mogul
            Goetze (listed since 1995). Each files its own BRSR; together they make clean-air systems, ride control, pistons, rings, bearings,
            sealings and ignition parts.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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
          sources={[
            { label: "TCAIL BRSR FY2025-26", url: t.pdfUrl },
            { label: "FMGIL BRSR FY2025-26", url: g.pdfUrl },
          ]}
        />

        <Card className="p-4">
          <p className="text-[13px] font-semibold">Group structure in India</p>
          <ul className="mt-2 divide-y divide-line">
            <EntityRow e={byId("tcail")} />
            {["taipl", "fmipl", "fmbil", "fmsil"].map((id) => (
              <EntityRow key={id} e={byId(id)} depth={1} />
            ))}
            <EntityRow e={byId("fmgil")} />
            <EntityRow e={byId("fmtpr")} depth={1} />
            {["fmmp", "motocare", "fmps", "tgs", "tio"].map((id) => (
              <EntityRow key={id} e={byId(id)} />
            ))}
          </ul>
        </Card>
      </section>

      <section className="lg:col-span-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Zap, tone: "text-green bg-green-soft", title: "Electricity", text: "Every plant to verified renewable power at or below today's cost: rooftop solar, group captive, open access, and the paperwork that makes it count.", href: "/tenneco/bengaluru/power" },
            { icon: Flame, tone: "text-heat bg-heat-soft", title: "Heat", text: "Industrial heat pumps for phosphating, plating, washing and degreasing baths, on a capex or Heat-as-a-Service model.", href: "/tenneco/bengaluru/heat" },
            { icon: LineChart, tone: "text-accent bg-accent-soft", title: "ESG", text: "esgOS: one platform for all twelve entities. Bills in once, baselines built automatically, BRSR Core ready.", href: "/tenneco/platform" },
          ].map((c) => (
            <Link key={c.title} href={c.href} className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${c.tone}`}>
                <c.icon size={19} />
              </span>
              <p className="mt-3 text-lg font-semibold tracking-tight">{c.title}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{c.text}</p>
            </Link>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-[12px] text-faint">
          <Leaf size={13} className="text-green" /> Pilot first: one plant, agreed assumptions and success criteria, then a decision on scale.
        </p>
      </section>
    </div>
  )
}
