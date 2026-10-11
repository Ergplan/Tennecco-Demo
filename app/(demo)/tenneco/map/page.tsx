"use client"

// Footprint discovery in the manner of esgOS's Seed and Boundary steps: public sources are
// read one by one and each site flies onto the map from the source that found it; then the
// group's shareholding is laid out and every site drops under the company that owns it;
// then one factory is picked to start.

import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import { ArrowRight, Building2, Check, ClipboardList, Factory, FileText, FlaskConical, HardHat, Landmark, MapPin, Network, RotateCcw, SkipForward } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { IndiaMap } from "@/components/map/IndiaMap"
import { SiteCard } from "@/components/SiteCard"
import { Card, Eyebrow, Pill } from "@/components/ui/kit"
import { cn } from "@/components/ui/cn"
import { ORIGIN_OF, SOURCES, TREE, type SourceId } from "@/lib/discovery"
import { entityById, type EntityId } from "@/lib/entities"
import { SITES, type Site } from "@/lib/sites"

type SrcState = "idle" | "running" | "done"
type View = "map" | "tree"

const SRC_ICON: Record<SourceId, typeof Landmark> = { filings: Landmark, brsr: FileText, rhp: ClipboardList, tenneco: Factory, maps: MapPin }
const SITE_ICON = { plant: Factory, rnd: FlaskConical, office: Building2, planned: HardHat }
const byId = (id: string) => SITES.find((s) => s.id === id)!
const ALL_FOUND = SOURCES.flatMap((s) => s.finds)
const FACTORIES = SITES.filter((s) => s.type === "plant")
const PLACEABLE = ALL_FOUND.filter((id) => byId(id).type !== "office")

function Narration({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-bold text-white">es</span>
      <AnimatePresence mode="wait">
        <motion.p key={text} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[15px] leading-snug text-fg">
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

function SourceRow({ id, state, count }: { id: SourceId; state: SrcState; count: number }) {
  const src = SOURCES.find((s) => s.id === id)!
  const Icon = SRC_ICON[id]
  const n = src.confirms ?? count
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border-b border-line py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border", state === "done" ? "border-green/40 text-green" : "border-sky/40 text-sky")}>
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-medium">{src.title}</p>
          <p className="text-[12.5px] text-muted">
            {src.reading}{" "}
            <span className="tnum font-medium text-fg">
              {state === "done" || !src.confirms ? n : Math.min(n, count)} {n === 1 ? src.unit : (src.units ?? `${src.unit}s`)}
            </span>
          </p>
        </div>
        {state === "done" ? (
          <Check size={16} className="text-green" />
        ) : (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky" />
          </span>
        )}
      </div>
    </motion.div>
  )
}

const chipName = (s: Site) => (s.type === "planned" ? "Kharkhoda" : s.type === "rnd" ? "Pune tech centre" : s.city === "Pune" ? s.name.replace(" sealings plant", " sealings") : s.city)

const shortEntity = (name: string) => name.replace(" Private Limited", "").replace(" Limited", "").replace("Federal-Mogul ", "FM ")

function Chip({ site }: { site: Site }) {
  const Icon = SITE_ICON[site.type]
  return (
    <motion.li
      layout
      layoutId={`chip-${site.id}`}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border bg-surface px-2 py-1 text-[12px] font-medium",
        site.featured ? "border-green/60 text-green" : site.type === "plant" ? "border-line-strong" : "border-dashed border-line-strong text-muted",
      )}
    >
      <Icon size={12} className="shrink-0" />
      {chipName(site)}
    </motion.li>
  )
}

function EntityCard({ id, pct, placed, delay, compact }: { id: EntityId; pct?: number; placed: Site[]; delay: number; compact?: boolean }) {
  const e = entityById(id)
  const listed = !!e.listed
  return (
    <div className="relative flex min-w-0 flex-col">
      {pct !== undefined && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.3 }}
          className="tnum absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-line-strong bg-surface px-2 py-0.5 font-mono text-[11px] font-semibold text-accent"
        >
          {pct}%
        </motion.span>
      )}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
        className={cn("flex h-full flex-col rounded-2xl border bg-surface p-3", listed ? "border-accent/40 shadow-[0_2px_10px_rgba(0,51,160,0.08)]" : "border-line-strong")}
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white" style={{ background: e.color }}>
            <Landmark size={13} />
          </span>
          <div className="min-w-0">
            <p className={cn("font-semibold leading-tight", compact ? "text-[12.5px]" : "text-[13.5px]")}>{compact ? shortEntity(e.name) : e.name.replace(" Limited", "").replace(" Private", "")}</p>
            {!compact && <p className="text-[11px] text-muted">{listed ? e.listed : e.relationship}</p>}
          </div>
        </div>
        <ul className="mt-2 flex min-h-[28px] flex-wrap content-start gap-1">
          {placed.map((s) => (
            <Chip key={s.id} site={s} />
          ))}
          {!placed.length && <li className="text-[11px] text-faint">{id === "fmipl" || id === "fmtpr" ? "No factory in Tenneco's list" : ""}</li>}
        </ul>
      </motion.div>
    </div>
  )
}

function Connector({ delay, className }: { delay: number; className?: string }) {
  return <motion.div aria-hidden className={cn("mx-auto w-px bg-accent", className)} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.35, delay }} style={{ originY: 0 }} />
}

function ShareholdingTree({ placed }: { placed: string[] }) {
  const placedSites = (id: EntityId) => placed.map(byId).filter((s) => s.entityId === id)
  const pool = PLACEABLE.filter((id) => !placed.includes(id)).map(byId)
  const others = TREE.others.flatMap((id) => placedSites(id))
  return (
    <LayoutGroup>
      <div className="mx-auto flex max-w-5xl flex-col px-2">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-sm rounded-2xl border border-line-strong bg-brand-deep p-3 text-center text-white">
          <p className="text-[14px] font-semibold">{TREE.parent.name}</p>
          <p className="text-[11px] text-white/60">{TREE.parent.note}</p>
        </motion.div>
        <Connector delay={0.3} className="h-5" />
        <motion.div aria-hidden className="mx-[16%] h-px bg-accent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.5 }} />
        <div className="grid grid-cols-[2.2fr_1fr_1fr] gap-3">
          {/* TCAIL and its subsidiaries */}
          <div className="flex min-w-0 flex-col">
            <Connector delay={0.7} className="h-4" />
            <EntityCard id="tcail" placed={placedSites("tcail")} delay={0.8} />
            <Connector delay={1.2} className="h-4" />
            <motion.div aria-hidden className="mx-[12%] h-px bg-accent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.45, delay: 1.35 }} />
            <div className="grid grid-cols-2 gap-x-2 gap-y-5 pt-4">
              {TREE.listed[0].children.map((c, i) => (
                <EntityCard key={c.id} id={c.id} pct={c.pct} placed={placedSites(c.id)} delay={1.5 + i * 0.15} compact />
              ))}
            </div>
          </div>
          {/* FMGIL and FM TPR */}
          <div className="flex min-w-0 flex-col">
            <Connector delay={0.7} className="h-4" />
            <EntityCard id="fmgil" placed={placedSites("fmgil")} delay={0.95} />
            <Connector delay={1.3} className="h-8" />
            <EntityCard id="fmtpr" pct={51} placed={placedSites("fmtpr")} delay={1.6} compact />
          </div>
          {/* Wider group */}
          <div className="flex min-w-0 flex-col">
            <Connector delay={0.7} className="h-4" />
            <motion.div
              initial={{ opacity: 0, y: -24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 1.1 }}
              className="flex h-full flex-col rounded-2xl border border-dashed border-line-strong bg-surface/70 p-3"
            >
              <p className="text-[13px] font-semibold leading-tight">Other Tenneco companies in India</p>
              <p className="text-[11px] text-muted">Promoter-group members</p>
              <ul className="mt-2 space-y-0.5 text-[11.5px] text-muted">
                {TREE.others.map((id) => (
                  <li key={id}>{entityById(id).name.replace(" Limited", "").replace(" Private", "")}</li>
                ))}
              </ul>
              <ul className="mt-2 flex flex-wrap gap-1">
                {others.map((s) => (
                  <Chip key={s.id} site={s} />
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-line p-3">
          <Eyebrow className="text-faint">{pool.length ? "Placing sites under their owning company…" : "Every site sits under its owning company"}</Eyebrow>
          <ul className="mt-2 flex min-h-[28px] flex-wrap gap-1">
            {pool.map((s) => (
              <Chip key={s.id} site={s} />
            ))}
          </ul>
        </div>
      </div>
    </LayoutGroup>
  )
}

export default function MapStep() {
  const router = useRouter()
  const [found, setFound] = useState<string[]>([])
  const [src, setSrc] = useState<Record<SourceId, SrcState>>({ filings: "idle", brsr: "idle", rhp: "idle", tenneco: "idle", maps: "idle" })
  const [count, setCount] = useState<Record<SourceId, number>>({ filings: 0, brsr: 0, rhp: 0, tenneco: 0, maps: 0 })
  const [reconciled, setReconciled] = useState(false)
  const [view, setView] = useState<View>("map")
  const [treeOn, setTreeOn] = useState(false)
  const [placed, setPlaced] = useState<string[]>([])
  const [pick, setPick] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [narration, setNarration] = useState("Let me find Tenneco's footprint in India from public records.")
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const finish = useCallback(() => {
    clear()
    setFound(ALL_FOUND)
    setSrc({ filings: "done", brsr: "done", rhp: "done", tenneco: "done", maps: "done" })
    setCount(Object.fromEntries(SOURCES.map((s) => [s.id, s.confirms ?? s.finds.length])) as Record<SourceId, number>)
    setReconciled(true)
    setTreeOn(true)
    setPlaced(PLACEABLE)
    setView("map")
    setPick(true)
    setNarration("Footprint mapped and every site placed under its owner. Pick a factory to start with.")
  }, [])

  const run = useCallback(() => {
    clear()
    setFound([])
    setSrc({ filings: "idle", brsr: "idle", rhp: "idle", tenneco: "idle", maps: "idle" })
    setCount({ filings: 0, brsr: 0, rhp: 0, tenneco: 0, maps: 0 })
    setReconciled(false)
    setTreeOn(false)
    setPlaced([])
    setPick(false)
    setSelected(null)
    setView("map")
    setNarration("Let me find Tenneco's footprint in India from public records.")
    let t = 700
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms))
    for (const s of SOURCES) {
      const start = t
      at(start, () => setSrc((p) => ({ ...p, [s.id]: "running" })))
      if (s.id === "brsr") at(start, () => setNarration("Both listed companies file a BRSR. Reading where their plants are."))
      if (s.id === "rhp") at(start, () => setNarration("TCAIL's prospectus names the subsidiaries' plants."))
      if (s.id === "tenneco") at(start, () => setNarration("Checking against Tenneco's own list of Indian factories."))
      s.finds.forEach((id, i) => {
        at(start + 450 + i * 300, () => {
          setFound((f) => (f.includes(id) ? f : [...f, id]))
          setCount((c) => ({ ...c, [s.id]: c[s.id] + 1 }))
        })
      })
      if (s.confirms) {
        for (let k = 1; k <= s.confirms; k++) at(start + 300 + k * 80, () => setCount((c) => ({ ...c, [s.id]: k })))
      }
      t = start + 450 + Math.max(s.finds.length, s.confirms ? 4 : 1) * 300 + 350
      at(t, () => setSrc((p) => ({ ...p, [s.id]: "done" })))
      t += 250
    }
    at(t, () => {
      setReconciled(true)
      setNarration("13 factories in 9 states and Puducherry. Now: who owns which?")
    })
    t += 1600
    at(t, () => {
      setView("tree")
      setTreeOn(true)
      setNarration("Laying out the group from the filings: two listed companies, their subsidiaries and holdings.")
    })
    t += 2400
    PLACEABLE.forEach((id, i) =>
      at(t + i * 260, () => {
        setPlaced((p) => (p.includes(id) ? p : [...p, id]))
      }),
    )
    t += PLACEABLE.length * 260 + 600
    at(t, () => setNarration("Every site sits under its owning company. Now pick a factory to start with."))
    t += 1800
    at(t, () => {
      setView("map")
      setPick(true)
    })
  }, [])

  useEffect(() => {
    run()
    return clear
  }, [run])

  const mapSites = useMemo(() => found.map(byId), [found])
  const scanning = Object.values(src).includes("running")
  const site = selected ? byId(selected) : null
  const factoriesFound = found.filter((id) => byId(id).type === "plant").length
  const order = [...FACTORIES].sort((a, b) => Number(!!b.featured) - Number(!!a.featured))

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <Card className="relative overflow-hidden p-0 lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <div className="flex gap-1 rounded-full bg-surface-2 p-1">
            {(
              [
                { id: "map", label: "Footprint", icon: MapPin },
                { id: "tree", label: "Shareholding", icon: Network },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.id === "tree" && !treeOn}
                onClick={() => setView(v.id)}
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium disabled:opacity-40", view === v.id ? "bg-surface text-fg shadow-sm" : "text-muted")}
              >
                <v.icon size={13} /> {v.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[12px] text-muted">
            <span className="tnum">
              <b className="text-fg">{factoriesFound}</b> factories found
            </span>
            <button type="button" onClick={run} className="flex items-center gap-1 hover:text-fg">
              <RotateCcw size={13} /> Replay
            </button>
            {!pick && (
              <button type="button" onClick={finish} className="flex items-center gap-1 hover:text-fg">
                <SkipForward size={13} /> Skip
              </button>
            )}
          </div>
        </div>
        <div className="relative h-[70vh] min-h-[520px] bg-gradient-to-b from-surface to-surface-2">
          <AnimatePresence mode="wait">
            {view === "map" ? (
              <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <IndiaMap
                  sites={mapSites}
                  stagger={false}
                  scanning={scanning}
                  originOf={(s) => ORIGIN_OF[s.id] ?? "maps"}
                  selectedId={selected}
                  onSelect={(id) => (byId(id).featured ? router.push("/tenneco/bengaluru") : setSelected(id))}
                  pulseIds={pick ? ["fmgil-blr"] : []}
                />
                {site && (
                  <div className="absolute right-4 top-4 hidden w-[330px] sm:block">
                    <SiteCard site={site} compact />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="tree" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="scrollbar-thin absolute inset-0 overflow-y-auto p-4 sm:p-6">
                <ShareholdingTree placed={placed} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      <div className="flex min-w-0 flex-col gap-4 lg:col-span-4">
        <Card>
          <Narration text={narration} />
        </Card>
        <Card className="px-4 py-1">
          <AnimatePresence>
            {SOURCES.filter((s) => src[s.id] !== "idle").map((s) => (
              <SourceRow key={s.id} id={s.id} state={src[s.id]} count={count[s.id]} />
            ))}
          </AnimatePresence>
          {treeOn && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border-t border-line py-3">
              <div className="flex items-center gap-3">
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border", placed.length === PLACEABLE.length ? "border-green/40 text-green" : "border-sky/40 text-sky")}>
                  <Network size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium">Group companies and holdings</p>
                  <p className="text-[12.5px] text-muted">
                    12 Indian entities · placing sites under their owner{" "}
                    <span className="tnum font-medium text-fg">
                      {placed.length} of {PLACEABLE.length}
                    </span>
                  </p>
                </div>
                {placed.length === PLACEABLE.length && <Check size={16} className="text-green" />}
              </div>
            </motion.div>
          )}
        </Card>

        <AnimatePresence>
          {reconciled && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-4">
                <Eyebrow>Reconciled footprint</Eyebrow>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="tnum text-4xl font-semibold tracking-tight">13</span>
                  <span className="text-[14px] text-muted">factories · 9 states and Puducherry</span>
                </div>
                <p className="mt-1 text-[12px] text-faint">Plus a technical centre in Pune, a plant under construction at Kharkhoda and three offices.</p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pick && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-0">
                <div className="border-b border-line px-4 py-3">
                  <p className="text-[14px] font-semibold">Pick a factory</p>
                  <p className="text-[12px] text-muted">Start where the data is already in hand.</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/tenneco/bengaluru")}
                  className="flex w-full items-center gap-3 border-b border-line bg-green-soft/70 px-4 py-3 text-left hover:bg-green-soft"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-green text-white">
                    <Factory size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">Bengaluru · FMGIL</span>
                    <span className="block text-[12px] text-muted">Power data and heat feasibility shared by the plant</span>
                  </span>
                  <Pill tone="green">Start here</Pill>
                  <ArrowRight size={16} className="text-green" />
                </button>
                <ul className="scrollbar-thin max-h-[220px] divide-y divide-line overflow-y-auto">
                  {order
                    .filter((s) => !s.featured)
                    .map((s) => (
                      <li key={s.id}>
                        <button type="button" onClick={() => setSelected(s.id)} className={cn("flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-surface-2", selected === s.id && "bg-accent-soft")}>
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entityById(s.entityId).color }} />
                          <span className="min-w-0 flex-1 truncate text-[13px]">
                            {s.name} <span className="text-muted">· {entityById(s.entityId).short}</span>
                          </span>
                          <span className="text-[11px] text-faint">{s.city}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
