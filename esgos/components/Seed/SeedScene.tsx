"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Building2, Check, ClipboardList, Factory, FileText, Landmark, MapPin, Pencil, Radio, Undo2, Warehouse, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { runPaste, runSeed, skipMapsCheck, skipPaste } from "@/esgos/lib/pipelines"
import { goTo } from "@/esgos/lib/navigation"
import { CITIES } from "@/esgos/lib/geo"
import { getClient } from "@/esgos/lib/clients"
import { mapsConfigured } from "@/esgos/providers/maps"
import type { Site, SiteType } from "@/esgos/lib/types"
import { SiteMap } from "../Map/SiteMap"
import { AgentLine } from "../common/AgentLine"
import { Button, Count, Eyebrow, SceneLayout, StatusDot } from "../common/ui"
import { Value } from "../common/Value"
import { countValue } from "@/esgos/lib/derived"
import { cn } from "../common/cn"

export const TYPE_ICON: Record<SiteType, typeof Factory> = { factory: Factory, office: Building2, warehouse: Warehouse }

function SourceRow({
  icon,
  title,
  status,
  done,
  running,
  children,
}: {
  icon: React.ReactNode
  title: string
  status: React.ReactNode
  done: boolean
  running: boolean
  children?: React.ReactNode
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border-b border-line py-4 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border", done ? "border-accent/40 text-accent" : running ? "border-teal/40 text-teal" : "border-line-strong text-faint")}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-[13px] text-muted">{status}</div>
        </div>
        {done ? <Check size={16} className="text-accent" /> : running ? <StatusDot tone="teal" pulse /> : null}
      </div>
      {children}
    </motion.div>
  )
}

function ConflictCard({ site }: { site: Site }) {
  const resolve = useStore((s) => s.resolveConflict)
  const c = site.conflict!
  const [city, setCity] = useState("")
  return (
    <motion.div id={`conflict-${site.id}`} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="scroll-mt-4 rounded-2xl border border-amber/30 bg-amber/[0.06] p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <StatusDot tone="amber" pulse /> {c.title}
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{c.detail}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {c.kind === "not-metered" && (
          <>
            <Button size="sm" variant="primary" onClick={() => resolve(site.id, "operating")}>
              Yes, it&apos;s operating
            </Button>
            <Button size="sm" onClick={() => resolve(site.id, "closed")}>
              No, exclude it
            </Button>
          </>
        )}
        {c.kind === "ergos-candidates" && (
          <>
            <Button size="sm" variant="primary" onClick={() => resolve(site.id, "one")}>
              One plant
            </Button>
            <Button size="sm" onClick={() => resolve(site.id, "two")}>
              Two separate plants
            </Button>
          </>
        )}
        {c.kind === "entity-mismatch" && (
          <>
            <Button size="sm" variant="primary" onClick={() => resolve(site.id, "keep")}>
              Keep it, fix the entity next
            </Button>
            <Button size="sm" onClick={() => resolve(site.id, "exclude")}>
              Exclude
            </Button>
          </>
        )}
        {c.kind === "commissioning" && (
          <>
            <Button size="sm" variant="primary" onClick={() => resolve(site.id, "include")}>
              Include this year
            </Button>
            <Button size="sm" onClick={() => resolve(site.id, "exclude")}>
              Leave it out for now
            </Button>
          </>
        )}
        {c.kind === "location" && (
          <>
            <Button size="sm" variant="primary" onClick={() => resolve(site.id, "ok")}>
              The pin is right
            </Button>
            <Button size="sm" onClick={() => resolve(site.id, "fix")}>
              Fix it later
            </Button>
          </>
        )}
        {c.kind === "gst-only" && (
          <>
            <Button size="sm" variant="primary" onClick={() => resolve(site.id, "include")}>
              It's an operating site
            </Button>
            <Button size="sm" onClick={() => resolve(site.id, "exclude")}>
              Not an operating site
            </Button>
          </>
        )}
        {c.kind === "unplaced" && (
          <div className="flex w-full gap-2">
            <label className="sr-only" htmlFor={`place-${site.id}`}>
              City for {site.name}
            </label>
            <select id={`place-${site.id}`} value={city} onChange={(e) => setCity(e.target.value)} className="h-8 flex-1 rounded-full border border-line-strong bg-surface px-3 text-xs">
              <option value="">Choose a city…</option>
              {CITIES.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city}, {c.state}
                </option>
              ))}
            </select>
            <Button size="sm" variant="primary" disabled={!city} onClick={() => resolve(site.id, "place", { city: CITIES.find((c) => c.city === city) })}>
              Place
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function SiteRow({ site, focused, onFocus }: { site: Site; focused: boolean; onFocus: () => void }) {
  const { renameSite, setSiteType, setSiteCity, excludeSite, includeSite, confirmSite } = useStore.getState()
  const dp = useStore((s) => s.dataPoints.find((d) => d.id === `dp:${site.id}:location`))
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(site.name)
  const Icon = TYPE_ICON[site.type]
  const excluded = site.status === "excluded"
  return (
    <li className={cn("group rounded-xl px-3 py-2.5 transition-colors", focused ? "bg-surface-2" : "hover:bg-surface-2/60")} onMouseEnter={onFocus}>
      <div className="flex items-center gap-3">
        <Icon size={15} className={cn("shrink-0", excluded ? "text-faint" : "text-muted")} aria-hidden />
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                renameSite(site.id, name)
                setEditing(false)
              }}
            >
              <label className="sr-only" htmlFor={`rename-${site.id}`}>
                Rename {site.name}
              </label>
              <input
                id={`rename-${site.id}`}
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  renameSite(site.id, name)
                  setEditing(false)
                }}
                className="w-full rounded-md border border-line-strong bg-surface px-2 py-0.5 text-sm"
              />
            </form>
          ) : (
            <button type="button" onClick={onFocus} className={cn("text-left text-sm font-medium", excluded && "text-faint line-through")}>
              {site.name}
            </button>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">{dp && <Value dp={dp} size="sm" detail={false} className="text-xs text-muted" />}</div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button type="button" onClick={() => (setName(site.name), setEditing(true))} className="rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-fg" aria-label={`Rename ${site.name}`}>
            <Pencil size={13} />
          </button>
          {site.status === "candidate" && !site.conflict && (
            <button type="button" onClick={() => confirmSite(site.id)} className="rounded-md p-1.5 text-accent hover:bg-surface-3" aria-label={`Confirm ${site.name}`}>
              <Check size={14} />
            </button>
          )}
          {site.status === "candidate" && site.conflict && !site.conflict.resolved && (
            <button
              type="button"
              onClick={() => document.getElementById(`conflict-${site.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="rounded-md px-2 py-1 text-xs text-amber hover:bg-surface-3"
              aria-label={`Answer the question about ${site.name}`}
            >
              Answer
            </button>
          )}
          {excluded ? (
            <button type="button" onClick={() => includeSite(site.id)} className="rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-fg" aria-label={`Include ${site.name}`}>
              <Undo2 size={13} />
            </button>
          ) : (
            <button type="button" onClick={() => excludeSite(site.id)} className="rounded-md p-1.5 text-muted hover:bg-surface-3 hover:text-fg" aria-label={`Exclude ${site.name}`}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      {focused && !excluded && (
        <div className="mt-2 flex flex-wrap gap-2 pl-7">
          <label className="sr-only" htmlFor={`type-${site.id}`}>
            Type of {site.name}
          </label>
          <select id={`type-${site.id}`} value={site.type} onChange={(e) => setSiteType(site.id, e.target.value as SiteType)} className="h-7 rounded-full border border-line-strong bg-surface px-2.5 text-xs">
            <option value="factory">Factory</option>
            <option value="office">Office</option>
            <option value="warehouse">Warehouse</option>
          </select>
          <label className="sr-only" htmlFor={`city-${site.id}`}>
            City of {site.name}
          </label>
          <select
            id={`city-${site.id}`}
            value={CITIES.some((c) => c.city === site.city) ? site.city : ""}
            onChange={(e) => {
              const c = CITIES.find((x) => x.city === e.target.value)
              if (c) setSiteCity(site.id, c)
            }}
            className="h-7 max-w-[180px] rounded-full border border-line-strong bg-surface px-2.5 text-xs"
          >
            {!CITIES.some((c) => c.city === site.city) && <option value="">{site.city || "Choose city"}</option>}
            {CITIES.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city}, {c.state}
              </option>
            ))}
          </select>
        </div>
      )}
    </li>
  )
}

const FILTERS: { label: string; value: SiteType | null }[] = [
  { label: "All", value: null },
  { label: "Factories", value: "factory" },
  { label: "Offices", value: "office" },
  { label: "Warehouses", value: "warehouse" },
]

export function SeedScene() {
  const seed = useStore((s) => s.seed)
  const seedMode = useStore((s) => s.seedMode)
  const sites = useStore((s) => s.sites)
  const say = useStore((s) => s.say)
  const filter = useStore((s) => s.ui.siteFilter)
  const focusSiteId = useStore((s) => s.ui.focusSiteId)
  const setUi = useStore((s) => s.setUi)
  const client = getClient()
  const isPublic = client.kind === "public"
  const [paste, setPaste] = useState(seed.pasteText || (seedMode === "paste" ? "" : client.defaultPaste))

  useEffect(() => {
    if (seedMode === "paste" && !seed.reconciled && seed.paste === "idle") say("Paste your site list. I'll place every site.")
    void runSeed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const conflicts = sites.filter((s) => s.conflict && !s.conflict.resolved && s.status !== "excluded")
  const allResolved = seed.reconciled && conflicts.length === 0
  const wasConflicts = useMemo(() => sites.some((s) => s.conflict), [sites])

  useEffect(() => {
    if (allResolved && wasConflicts && sites.some((s) => s.conflict?.resolved)) say("Your footprint is mapped.")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allResolved])

  const ergosDone = seed.ergos === "done"
  const gstDone = seed.gst === "done"
  const scanning = [seed.ergos, seed.gst, seed.paste, seed.registry, seed.brsr, seed.maps].includes("running")
  const publicSourcesDone = seed.brsr === "done" && (!client.publicGst.length || gstDone)
  const showPaste = seedMode === "paste" || (isPublic ? publicSourcesDone : gstDone)
  const ergosSites = sites.filter((s) => s.foundVia.includes("ergos")).length
  const gstOnly = sites.filter((s) => s.foundVia[0] === "gst").length

  const visible = sites.filter((s) => !filter || s.type === filter)
  const groups = [
    { key: "confirmed", label: "Confirmed", list: visible.filter((s) => s.status === "confirmed") },
    { key: "candidate", label: "Needs confirmation", list: visible.filter((s) => s.status === "candidate") },
    { key: "excluded", label: "Excluded", list: visible.filter((s) => s.status === "excluded") },
  ]

  // Name only the sources that were actually read.
  const readSources = [
    seed.registry === "done" && (isPublic ? "company filings" : "the company registry"),
    seed.brsr === "done" && (client.preIpo ? client.preIpo.plantSources.title.toLowerCase() : `the filed ${client.lastBrsr?.fy ?? ""} BRSR`.replace("  ", " ")),
    seed.ergos === "done" && "ergOS",
    seed.gst === "done" && (isPublic ? "public GST records" : "GST"),
    seed.pasteRecords > 0 && "your pasted list",
    seed.maps === "done" && "Google Maps",
  ].filter(Boolean) as string[]
  const locationsValue = countValue(
    "seed:locations",
    "Locations",
    sites.length,
    `Reconciled from ${readSources.length > 1 ? readSources.slice(0, -1).join(", ") + " and " + readSources[readSources.length - 1] : readSources[0] ?? "no sources yet"}`,
    sites.map((s) => `dp:${s.id}:location`),
  )

  return (
    <SceneLayout
      visual={
        <div className="absolute inset-0 p-4 sm:p-8">
          <SiteMap sites={sites} scanning={scanning} filter={filter} focusId={focusSiteId} onSelect={(id) => setUi({ focusSiteId: id })} />
          {filter && (
            <button type="button" onClick={() => setUi({ siteFilter: null })} className="absolute left-6 top-6 rounded-full border border-line-strong bg-elev px-3 py-1 text-xs text-muted hover:text-fg">
              Showing {filter === "factory" ? "factories" : filter + "s"} · clear
            </button>
          )}
        </div>
      }
      panel={
        <div className="flex flex-col gap-6 p-6">
          <AgentLine />
          <div className="rounded-2xl border border-line bg-surface/60 px-4">
            {seedMode !== "paste" && isPublic && (
              <SourceRow
                icon={<Landmark size={14} />}
                title="Company filings"
                running={seed.registry === "running"}
                done={seed.registry === "done"}
                status={seed.registry === "idle" ? "Waiting" : <>Registered and corporate offices of {client.legalName}… <span className="text-fg">{seed.registryRecords} office{seed.registryRecords === 1 ? "" : "s"}</span></>}
              />
            )}
            {seedMode !== "paste" && isPublic && seed.registry === "done" && (
              <SourceRow
                icon={<FileText size={14} />}
                title={client.preIpo ? client.preIpo.plantSources.title : `Filed BRSR ${client.lastBrsr?.fy ?? ""}`}
                running={seed.brsr === "running"}
                done={seed.brsr === "done"}
                status={<>{client.preIpo ? client.preIpo.plantSources.reading : "Reading plant locations from the filed report…"} <span className="text-fg">{seed.brsrRecords} site{seed.brsrRecords === 1 ? "" : "s"}</span></>}
              />
            )}
            {seedMode !== "paste" && isPublic && seed.brsr === "done" && client.publicGst.length > 0 && (
              <SourceRow
                icon={<ClipboardList size={14} />}
                title="GST registrations"
                running={seed.gst === "running"}
                done={gstDone}
                status={
                  <>
                    Reading public GST records… <span className="text-fg">{seed.gstRecords} registration{seed.gstRecords === 1 ? "" : "s"}</span>
                    {gstOnly > 0 && <span>, {gstOnly} more office{gstOnly === 1 ? "" : "s"}</span>}
                  </>
                }
              />
            )}
            {seedMode !== "paste" && !isPublic && (
              <SourceRow
                icon={<Radio size={14} />}
                title="ergOS"
                running={seed.ergos === "running"}
                done={ergosDone}
                status={
                  seed.ergos === "idle" ? (
                    "Waiting"
                  ) : (
                    <>
                      Reading ergOS sites…{" "}
                      {seed.ergosRecords > 0 && (
                        <span className="text-fg">
                          <Count value={ergosSites} /> metered sites
                        </span>
                      )}
                      {ergosDone && <span className="text-faint"> · {seed.ergosRecords} records (demo)</span>}
                    </>
                  )
                }
              />
            )}
            {seedMode !== "paste" && !isPublic && ergosDone && (
              <SourceRow
                icon={<ClipboardList size={14} />}
                title="GST registrations"
                running={seed.gst === "running"}
                done={gstDone}
                status={
                  <>
                    Reading seeded GST records (demo) for {client.name} PANs…{" "}
                    {seed.gstRecords > 0 && (
                      <span className="text-fg">
                        <Count value={seed.gstRecords} /> premises
                      </span>
                    )}
                  </>
                }
              />
            )}
            {showPaste && (
              <SourceRow
                icon={<Pencil size={14} />}
                title={seedMode === "paste" ? "Your site list" : "Anything else?"}
                running={seed.paste === "running"}
                done={seed.paste === "done"}
                status={
                  seed.paste === "idle" ? (
                    "Paste a site list — one site per line, or CSV with name, city, type, entity."
                  ) : (
                    <>
                      Parsing your pasted list… <span className="text-fg">{seed.pasteRecords} lines</span>
                      {seed.paste === "done" && <span>, {seed.pasteNew} new location{seed.pasteNew === 1 ? "" : "s"}</span>}
                    </>
                  )
                }
              >
                {seed.paste === "idle" && (
                  <div className="mt-3 space-y-2">
                    <label htmlFor="paste" className="sr-only">
                      Paste a site list
                    </label>
                    <textarea
                      id="paste"
                      value={paste}
                      onChange={(e) => setPaste(e.target.value)}
                      rows={seedMode === "paste" ? 6 : 3}
                      placeholder={isPublic ? "Paste your full site list here, one per line or CSV (name, city, type, entity), or import a file." : "Corporate office — Connaught Place, New Delhi\nNoida plant — Sector 63, Noida"}
                      className="w-full resize-none rounded-xl border border-line-strong bg-bg/50 p-3 font-mono text-xs leading-relaxed text-fg outline-none placeholder:text-faint focus:border-teal/50"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" disabled={!paste.trim()} onClick={() => runPaste(paste)}>
                        Add these sites
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setUi({ importOpen: true, importKind: "sites" })}>
                        Import a file
                      </Button>
                      {seedMode !== "paste" && (
                        <Button size="sm" variant="ghost" onClick={() => void skipPaste()}>
                          Nothing else
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </SourceRow>
            )}
            {seed.paste === "done" && (
              <SourceRow
                icon={<MapPin size={14} />}
                title="Google Maps"
                running={seed.maps === "running"}
                done={seed.maps === "done"}
                status={
                  mapsConfigured() ? (
                    seed.maps === "idle" ? (
                      "Waiting"
                    ) : (
                      <>
                        Locating each site on Google Maps… <span className="text-fg">{seed.mapsRecords} placed</span>
                      </>
                    )
                  ) : (
                    "Not configured — add a Maps API key to place each site on its real premises. Pins use the city for now."
                  )
                }
              />
            )}
          </div>

          <AnimatePresence>
            {seed.reconciled && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between gap-4">
                <div>
                  <Eyebrow>Reconciled footprint</Eyebrow>
                  <div className="mt-1 flex items-baseline gap-2">
                    <Value dp={locationsValue} size="xl" badge="below" format={(d) => ({ text: String(d.value), unit: "locations" })} />
                  </div>
                </div>
                {conflicts.length > 0 && (
                  <div className="whitespace-nowrap pb-8 text-right text-sm text-amber">
                    <Count value={conflicts.length} /> need{conflicts.length === 1 ? "s" : ""} your confirmation
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {conflicts.length > 0 && (
              <div className="space-y-3">
                {conflicts.map((s) => (
                  <ConflictCard key={s.id} site={s} />
                ))}
              </div>
            )}
          </AnimatePresence>

          {sites.length > 0 && (
            <div>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Filter sites">
                {FILTERS.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => setUi({ siteFilter: f.value })}
                    aria-pressed={filter === f.value}
                    className={cn("rounded-full px-3 py-1 text-xs", filter === f.value ? "bg-surface-3 text-fg" : "text-muted hover:text-fg")}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {groups.map(
                (g) =>
                  g.list.length > 0 && (
                    <section key={g.key} className="mt-4" aria-label={g.label}>
                      <Eyebrow className="px-3">
                        {g.label} · {g.list.length}
                      </Eyebrow>
                      <ul className="mt-1">
                        {g.list.map((s) => (
                          <SiteRow key={s.id} site={s} focused={focusSiteId === s.id} onFocus={() => setUi({ focusSiteId: s.id })} />
                        ))}
                      </ul>
                    </section>
                  ),
              )}
            </div>
          )}

          {!seed.reconciled && seedMode !== "paste" && showPaste && seed.paste === "idle" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-0 -mx-6 border-t border-line bg-bg/90 px-6 py-4 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted">Any sites missing? Paste or import them above. Otherwise, continue.</span>
                <Button variant="primary" onClick={() => void skipPaste()}>
                  Nothing else, continue <ArrowRight size={15} />
                </Button>
              </div>
            </motion.div>
          )}
          {!seed.reconciled && seed.maps === "running" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-0 -mx-6 border-t border-line bg-bg/90 px-6 py-4 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted">Placing each site on Google Maps…</span>
                <Button variant="ghost" onClick={skipMapsCheck}>
                  Skip the map check
                </Button>
              </div>
            </motion.div>
          )}
          {allResolved && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-0 -mx-6 border-t border-line bg-bg/90 px-6 py-4 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted">Your footprint is mapped.</span>
                <Button variant="primary" onClick={() => goTo("boundary")}>
                  Set reporting boundary <ArrowRight size={15} />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      }
    />
  )
}
