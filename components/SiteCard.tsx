"use client"

import { Factory, FlaskConical, Building, HardHat, Leaf } from "lucide-react"
import { entityById } from "@/lib/entities"
import { TYPE_LABEL, type Site } from "@/lib/sites"
import { Pill, SourceLinks } from "./ui/kit"
import { cn } from "./ui/cn"

const ICON = { plant: Factory, rnd: FlaskConical, office: Building, planned: HardHat }

export function SiteCard({ site, compact, className }: { site: Site; compact?: boolean; className?: string }) {
  const e = entityById(site.entityId)
  const Icon = ICON[site.type]
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-4", site.featured && "border-green/40 ring-1 ring-green/20", className)}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: e.color }}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-faint">{e.short}</p>
          <p className="text-[15px] font-semibold leading-tight tracking-tight text-fg">{site.name}</p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {site.area}, {site.city}, {site.state}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Pill tone={site.type === "planned" ? "amber" : site.type === "plant" ? "blue" : "grey"}>{TYPE_LABEL[site.type]}</Pill>
          {site.confidence === "low" && <Pill tone="amber">location to confirm</Pill>}
        </div>
      </div>
      {site.product && <p className="mt-3 text-[13px] text-fg">{site.product}</p>}
      {!compact && site.esg && site.esg.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {site.esg.map((x) => (
            <li key={x} className="flex gap-2 text-[12.5px] leading-snug text-muted">
              <Leaf size={13} className="mt-0.5 shrink-0 text-green" />
              {x}
            </li>
          ))}
        </ul>
      )}
      {!compact && <SourceLinks sources={site.sources} className="mt-3" />}
    </div>
  )
}
