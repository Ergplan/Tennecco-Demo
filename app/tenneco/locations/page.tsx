"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useMemo, useState } from "react"
import { IndiaMap } from "@/components/map/IndiaMap"
import { SiteCard } from "@/components/SiteCard"
import { Card, PageHead, Pill } from "@/components/ui/kit"
import { cn } from "@/components/ui/cn"
import { ENTITIES, entityById, type EntityId } from "@/lib/entities"
import { SITES, TYPE_LABEL } from "@/lib/sites"

const order = (id: string) => (id === "fmgil-blr" ? -1 : 0)

export default function Locations() {
  const [entity, setEntity] = useState<EntityId | null>(null)
  const [selected, setSelected] = useState<string>("fmgil-blr")
  const [offices, setOffices] = useState(false)

  const shown = useMemo(() => SITES.filter((s) => offices || s.type !== "office"), [offices])
  const list = useMemo(
    () => shown.filter((s) => !entity || s.entityId === entity).sort((a, b) => order(a.id) - order(b.id)),
    [shown, entity],
  )
  const site = SITES.find((s) => s.id === selected)
  const withSites = ENTITIES.filter((e) => SITES.some((s) => s.entityId === e.id && s.type !== "office"))
  const plantCount = SITES.filter((s) => s.type === "plant").length

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Locations"
        title={
          <>
            {plantCount} factories, one map. <span className="text-accent">Bengaluru first.</span>
          </>
        }
        lede="Tenneco's 13 factories in India, from Tenneco's own location list, plus the Pune technical centre and the Kharkhoda plant under construction. Pick an entity to see its footprint; pick a site to see what is public about it."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="relative p-0 lg:col-span-7">
          <div className="flex flex-wrap gap-1.5 border-b border-line p-3">
            <button
              type="button"
              onClick={() => setEntity(null)}
              className={cn("rounded-full border px-3 py-1 text-[12px] font-medium", !entity ? "border-fg bg-fg text-white" : "border-line-strong text-muted hover:text-fg")}
            >
              All entities
            </button>
            {withSites.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEntity(entity === e.id ? null : e.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium",
                  entity === e.id ? "border-transparent text-white" : "border-line-strong text-muted hover:text-fg",
                )}
                style={entity === e.id ? { background: e.color } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: entity === e.id ? "#fff" : e.color }} />
                {e.short}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-1.5 text-[12px] text-muted">
              <input type="checkbox" checked={offices} onChange={(e) => setOffices(e.target.checked)} className="accent-[var(--accent)]" />
              Offices
            </label>
          </div>
          <div className="h-[70vh] min-h-[520px] bg-gradient-to-b from-surface to-surface-2">
            <IndiaMap sites={shown} selectedId={selected} onSelect={setSelected} focusEntity={entity} stagger={false} />
          </div>
        </Card>

        <div className="min-w-0 space-y-4 lg:col-span-5">
          <AnimatePresence mode="wait">
            {site && (
              <motion.div key={site.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <SiteCard site={site} />
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-[13px] font-semibold">{entity ? entityById(entity).name : "All sites"}</p>
              <span className="text-[12px] text-faint">{list.length} sites</span>
            </div>
            <ul className="scrollbar-thin max-h-[46vh] divide-y divide-line overflow-y-auto">
              {list.map((s) => {
                const e = entityById(s.entityId)
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(s.id)}
                      className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2", selected === s.id && "bg-accent-soft")}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">
                          {s.name} <span className="font-normal text-muted">· {s.city}</span>
                        </span>
                        <span className="block truncate text-[12px] text-faint">
                          {e.short} · {s.product ?? s.area}
                        </span>
                      </span>
                      {s.featured ? <Pill tone="green">Case study</Pill> : <Pill tone={s.type === "planned" ? "amber" : "grey"}>{TYPE_LABEL[s.type]}</Pill>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
