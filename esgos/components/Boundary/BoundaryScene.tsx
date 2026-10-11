"use client"

import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import { ArrowRight, Building2, Check, Factory, GripVertical, Landmark, Warehouse } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { boundaryStatement, maybeConfirmBoundary, runBoundary } from "@/esgos/lib/pipelines"
import { goTo } from "@/esgos/lib/navigation"
import { inBoundary } from "@/esgos/lib/selectors"
import type { LegalEntity, Site, SiteType } from "@/esgos/lib/types"
import { getClient } from "@/esgos/lib/clients"
import { consolidatedUnder, isBoundaryExcluded, isPublicClient } from "@/esgos/lib/boundary"
import { AgentLine } from "../common/AgentLine"
import { Button, Eyebrow, SceneLayout, StatusDot, Typewriter } from "../common/ui"
import { SourceBadge, Value } from "../common/Value"
import { cn } from "../common/cn"

const TYPE_ICON: Record<SiteType, typeof Factory> = { factory: Factory, office: Building2, warehouse: Warehouse }
const REVIEW = "__review__"

type DragState = { siteId: string; x: number; y: number; over: string | null } | null

function laneAt(x: number, y: number): string | null {
  const els = document.elementsFromPoint(x, y)
  for (const el of els) {
    const lane = (el as HTMLElement).closest?.("[data-lane]") as HTMLElement | null
    if (lane) return lane.dataset.lane ?? null
  }
  return null
}

function SiteChip({ site, entities, onDragStart, dragging }: { site: Site; entities: LegalEntity[]; onDragStart: (e: React.PointerEvent, id: string) => void; dragging: boolean }) {
  const assign = useStore((s) => s.assignSiteEntity)
  const setUi = useStore((s) => s.setUi)
  const dp = useStore((s) => s.dataPoints.find((d) => d.id === `dp:${site.id}:entity`))
  const Icon = TYPE_ICON[site.type]
  const excluded = site.status === "excluded"
  const review = site.entityReview || !site.legalEntityId
  return (
    <motion.li
      layout
      layoutId={`chip-${site.id}`}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn(
        "group flex min-w-0 flex-wrap items-center gap-1 rounded-xl border bg-surface py-1 pl-0.5 pr-1 text-sm",
        excluded ? "border-dashed border-line text-faint" : review ? "border-amber/50" : "border-line-strong",
        dragging && "opacity-30",
      )}
    >
      <span
        onPointerDown={(e) => !excluded && onDragStart(e, site.id)}
        className={cn("flex h-7 w-5 shrink-0 touch-none items-center justify-center rounded text-faint", !excluded && "cursor-grab hover:text-fg active:cursor-grabbing")}
        aria-hidden
      >
        <GripVertical size={13} />
      </span>
      <Icon size={13} className="shrink-0 text-muted" aria-hidden />
      <button
        type="button"
        onClick={() => dp && setUi({ provenance: dp })}
        className={cn("whitespace-nowrap rounded px-1 font-medium", excluded && "line-through")}
        aria-label={`${site.name}${dp ? `, entity from ${dp.source.toUpperCase()}` : ""}. Show provenance.`}
      >
        {site.name}
      </button>
      {dp && !excluded && <SourceBadge dp={dp} detail={false} />}
      <label className="sr-only" htmlFor={`assign-${site.id}`}>
        Legal entity for {site.name}
      </label>
      <select
        id={`assign-${site.id}`}
        value={site.entityReview ? "" : site.legalEntityId ?? ""}
        onChange={(e) => {
          if (!e.target.value) return
          assign(site.id, e.target.value, "owner")
          maybeConfirmBoundary()
        }}
        disabled={excluded}
        className="h-6 w-[22px] shrink-0 cursor-pointer appearance-none rounded-md border border-line bg-surface-2 text-[0px] hover:border-line-strong focus:w-auto focus:px-1 focus:text-xs disabled:opacity-30"
        title="Move to another entity"
        style={{
          backgroundImage: "linear-gradient(45deg,transparent 50%,var(--fg-muted) 50%),linear-gradient(135deg,var(--fg-muted) 50%,transparent 50%)",
          backgroundPosition: "7px 10px,11px 10px",
          backgroundSize: "4px 4px",
          backgroundRepeat: "no-repeat",
        }}
      >
        <option value="">Move to…</option>
        {entities
          .filter((e) => !e.aggregate)
          .map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
      </select>
    </motion.li>
  )
}

function EntityCard({
  entity,
  sites,
  entities,
  drag,
  onDragStart,
  consolidated,
  delay,
  pendingDecision,
}: {
  entity: LegalEntity
  sites: Site[]
  entities: LegalEntity[]
  drag: DragState
  onDragStart: (e: React.PointerEvent, id: string) => void
  consolidated: boolean
  delay: number
  pendingDecision?: boolean
}) {
  const cin = useStore((s) => s.dataPoints.find((d) => d.id === `dp:${entity.id}:cin`))
  const over = drag?.over === entity.id
  const preIpo = !!getClient().preIpo
  const rel = entity.aggregate
    ? preIpo
      ? "Common promoters · not part of the listing entity"
      : (entity.members?.[0]?.relationship ?? "Subsidiaries and associates")
    : entity.relationship === "holding"
      ? preIpo
        ? "Company that would list · first BRSR after listing"
        : isPublicClient()
          ? "Listed company · files the BRSR"
          : "Listed holding company"
      : entity.relationship === "jv"
        ? "Joint venture"
        : entity.relationship === "associate"
          ? "Associate"
          : "Subsidiary"
  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      data-lane={entity.id}
      className={cn(
        "flex h-full min-w-0 flex-col rounded-2xl border p-4 transition-colors",
        over ? "border-accent bg-accent/[0.07]" : consolidated ? "border-line-strong bg-surface/80" : "border-dashed border-line bg-surface/30",
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", consolidated ? "bg-accent/12 text-accent" : "bg-surface-2 text-faint")}>
          <Landmark size={15} />
        </span>
        <div className="min-w-0">
          <div className={cn("text-sm font-semibold leading-snug", !consolidated && "text-muted")}>{entity.name}</div>
          <div className="text-xs text-muted">
            {rel}
            {!consolidated && (pendingDecision ? " · decision pending" : " · outside boundary")}
          </div>
          {cin && <Value dp={cin} size="sm" detail={false} className="mt-1 -ml-1 px-1 [&>span:first-child]:text-[11px] [&>span:first-child]:text-faint" />}
        </div>
      </div>
      <ul className="mt-3 flex min-h-[40px] flex-wrap content-start gap-1.5" aria-label={`Sites of ${entity.name}`}>
        {sites.map((s) => (
          <SiteChip key={s.id} site={s} entities={entities} onDragStart={onDragStart} dragging={drag?.siteId === s.id} />
        ))}
        {!sites.length && !entity.aggregate && <li className="text-xs leading-relaxed text-faint">{entity.note ?? "No sites"}</li>}
      </ul>
      {entity.aggregate && entity.members && (
        <div className="text-xs leading-relaxed text-faint">
          {entity.members
            .slice(0, 6)
            .map((m) => `${m.name.replace(/ (Private )?Limited$/, "")}${m.holdingPct ? ` ${m.holdingPct}%` : ""}`)
            .join(" · ")}
          {entity.members.length > 6 ? ` · and ${entity.members.length - 6} more` : ""}
        </div>
      )}
      {!!sites.length && entity.note && entity.relationship !== "holding" && <p className="mt-2 text-[11px] leading-relaxed text-faint">{entity.note}</p>}
    </motion.div>
  )
}

export function BoundaryScene() {
  const boundary = useStore((s) => s.boundary)
  const entities = useStore((s) => s.entities)
  const sites = useStore((s) => s.sites)
  const dataPoints = useStore((s) => s.dataPoints)
  const knownCompanies = useStore((s) => s.knownCompanies)
  const reporting = useStore((s) => s.reportingEntity)
  const fiscalYear = useStore((s) => s.group.fiscalYear)
  const say = useStore((s) => s.say)
  const setJv = useStore((s) => s.setJvDecision)
  const assign = useStore((s) => s.assignSiteEntity)
  const [choice, setChoice] = useState<string>("")
  const [drag, setDrag] = useState<DragState>(null)
  const dragRef = useRef<DragState>(null)

  const isPublic = isPublicClient()
  const client = getClient()
  const companies = useMemo(() => {
    if (isPublic) return client.publicEntities.filter((e) => !e.aggregate && e.relationship !== "jv" && e.relationship !== "associate").map((e) => e.name)
    const names = knownCompanies.map((k) => k.name)
    return names.length ? names : ["Your company (demo)"]
  }, [knownCompanies, isPublic, client])
  const defaultChoice = isPublic ? client.legalName : companies.find((n) => / Limited$/.test(n) && !/Private/.test(n)) ?? companies[0]

  useEffect(() => {
    if (!boundary.reportingChosen) say("Which company files the BRSR?")
    else if (boundary.tree !== "done" || boundary.matching !== "done") void runBoundary(reporting?.entityId ?? defaultChoice)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pointer-based drag and drop works for mouse, pen and touch.
  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => {
      const next = { ...dragRef.current!, x: e.clientX, y: e.clientY, over: laneAt(e.clientX, e.clientY) }
      dragRef.current = next
      setDrag(next)
    }
    const up = (e: PointerEvent) => {
      const d = dragRef.current
      const lane = laneAt(e.clientX, e.clientY)
      if (d && lane && lane !== REVIEW) {
        assign(d.siteId, lane, "owner")
        maybeConfirmBoundary()
      }
      dragRef.current = null
      setDrag(null)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.siteId])

  const startDrag = (e: React.PointerEvent, siteId: string) => {
    e.preventDefault()
    const d = { siteId, x: e.clientX, y: e.clientY, over: null }
    dragRef.current = d
    setDrag(d)
  }

  const holding = entities.find((e) => e.relationship === "holding")
  const children = entities.filter((e) => e.relationship !== "holding")
  const jv = isPublic ? undefined : entities.find((e) => e.relationship === "jv" && sites.some((s) => s.legalEntityId === e.id))
  const jvSite = jv ? sites.find((s) => s.legalEntityId === jv.id) : undefined
  const listed = sites.filter((s) => s.status === "confirmed" || isBoundaryExcluded(s))
  const review = listed.filter((s) => s.status === "confirmed" && (s.entityReview || (boundary.matching === "done" && !s.legalEntityId)))
  const pool = listed.filter((s) => !s.legalEntityId && !review.includes(s))
  const lane = (id: string) => listed.filter((s) => s.legalEntityId === id && !s.entityReview)
  const draggingSite = drag ? sites.find((s) => s.id === drag.siteId) : undefined
  const statement = boundary.confirmed ? boundaryStatement() : ""
  const sitesIn = inBoundary({ sites }).length
  const consolidated = (e: LegalEntity) => consolidatedUnder(e, boundary.jvDecision)
  const subsidiarySites = listed.filter((s) => s.legalEntityId && entities.some((e) => e.id === s.legalEntityId && e.relationship !== "holding" && !e.aggregate))
  const reviewEntity = (s: Site) => entities.find((e) => e.pan && s.gstin?.includes(e.pan))

  return (
    <SceneLayout
      visual={
        <div className="scrollbar-thin absolute inset-0 overflow-y-auto p-4 sm:p-8">
          {!entities.length ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Landmark size={28} className="text-faint" />
              <p className="mt-3 max-w-sm text-sm text-muted">
                {boundary.tree === "running"
                  ? isPublic
                    ? "Reading the group companies listed in the filed BRSR…"
                    : "Reading MCA master data (demo)…"
                  : isPublic
                    ? "Confirm the reporting company and I'll lay out the group from its filed BRSR."
                    : "Choose the reporting company and I'll assemble the group from MCA master data."}
              </p>
            </div>
          ) : (
            <LayoutGroup>
              <div className="mx-auto flex max-w-5xl flex-col">
                {holding && (
                  <div className="mx-auto w-full max-w-2xl">
                    <EntityCard entity={holding} sites={lane(holding.id)} entities={entities} drag={drag} onDragStart={startDrag} consolidated delay={0} />
                  </div>
                )}
                {children.length > 0 && (
                  <div className="relative h-14" aria-hidden>
                    <motion.div className="absolute left-1/2 top-0 h-7 w-px -translate-x-1/2 bg-accent" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.4, delay: 0.4 }} style={{ originY: 0 }} />
                    {children.length > 1 && (
                      <motion.div
                        className="absolute top-7 h-px bg-line-strong"
                        style={{ left: `${50 / children.length}%`, right: `${50 / children.length}%`, originX: 0.5 }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                      />
                    )}
                  </div>
                )}
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, children.length)}, minmax(0, 1fr))` }}>
                  {children.map((c, i) => {
                    const pct = dataPoints.find((d) => d.id === `dp:${c.id}:holding`)
                    return (
                      <div key={c.id} className="relative flex min-w-0 flex-col pt-10">
                        <motion.div
                          aria-hidden
                          className={cn("absolute left-1/2 top-[-28px] h-[38px] w-px -translate-x-1/2", consolidated(c) ? "bg-accent" : "bg-line-strong")}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ duration: 0.4, delay: 1 + i * 0.2 }}
                          style={{ originY: 0 }}
                        />
                        {pct && (
                          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.3 + i * 0.25 }} className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2 rounded-full border border-line-strong bg-elev px-1 py-0.5">
                            <Value dp={pct} size="sm" detail={false} className="flex-nowrap! whitespace-nowrap" />
                          </motion.div>
                        )}
                        <EntityCard entity={c} sites={lane(c.id)} entities={entities} drag={drag} onDragStart={startDrag} consolidated={consolidated(c)} pendingDecision={!c.aggregate && (isPublic ? lane(c.id).length > 0 : c.relationship === "jv" || c.relationship === "associate") && !boundary.jvDecision} delay={0.35 + i * 0.22} />
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {pool.length > 0 && (
                    <div className="rounded-2xl border border-line p-4">
                      <Eyebrow>Matching by GSTIN…</Eyebrow>
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {pool.map((s) => (
                          <SiteChip key={s.id} site={s} entities={entities} onDragStart={startDrag} dragging={drag?.siteId === s.id} />
                        ))}
                      </ul>
                    </div>
                  )}
                  {(review.length > 0 || boundary.matching === "done") && (
                    <div data-lane={REVIEW} className={cn("rounded-2xl border border-dashed p-4", review.length ? "border-amber/50 bg-amber/[0.05]" : "border-line")}>
                      <Eyebrow className={review.length ? "text-amber" : ""}>Needs review · {review.length}</Eyebrow>
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {review.map((s) => (
                          <SiteChip key={s.id} site={s} entities={entities} onDragStart={startDrag} dragging={drag?.siteId === s.id} />
                        ))}
                        {!review.length && <li className="text-xs text-faint">Every site sits under an entity.</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </LayoutGroup>
          )}
          {drag && draggingSite && (
            <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-accent bg-elev px-3 py-1.5 text-sm font-medium shadow-2xl" style={{ left: drag.x, top: drag.y }}>
              {draggingSite.name}
            </div>
          )}
        </div>
      }
      panel={
        <div className="flex flex-col gap-6 p-6">
          <AgentLine />
          {!boundary.reportingChosen ? (
            <div className="space-y-3">
              <Eyebrow>Reporting entity</Eyebrow>
              <fieldset className="space-y-2">
                <legend className="sr-only">Which company files the BRSR?</legend>
                {companies.map((name) => {
                  const checked = (choice || defaultChoice) === name
                  return (
                    <label key={name} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors", checked ? "border-accent/50 bg-accent/[0.06]" : "border-line hover:bg-surface-2")}>
                      <input type="radio" name="reporting" value={name} checked={checked} onChange={() => setChoice(name)} className="accent-[var(--accent)]" />
                      <span className="flex-1 font-medium">{name}</span>
                      {name === defaultChoice && <span className="text-xs text-faint">Listed</span>}
                    </label>
                  )
                })}
              </fieldset>
              <Button variant="primary" onClick={() => runBoundary(choice || defaultChoice)}>
                Confirm reporting entity
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-surface/60 px-4">
              <div className="flex items-center gap-3 border-b border-line py-3.5 text-sm">
                {boundary.tree === "done" ? <Check size={15} className="text-accent" /> : <StatusDot tone="teal" pulse />}
                <span className="text-muted">
                  {isPublic ? (client.lastBrsr ? `Group companies in the filed ${client.lastBrsr.fy} BRSR…` : "Group companies from MCA, court and rating records…") : "Reading MCA master data (demo)…"}{" "}
                  <span className="text-fg">{entities.reduce((n, e) => n + (e.aggregate ? e.members?.length ?? 0 : 1), 0)} entities</span>
                </span>
              </div>
              <div className="flex items-center gap-3 py-3.5 text-sm">
                {boundary.matching === "done" ? <Check size={15} className="text-accent" /> : boundary.matching === "running" ? <StatusDot tone="teal" pulse /> : <StatusDot tone="grey" />}
                <span className="text-muted">
                  {isPublic ? "Placing sites under their owning company…" : "Matching sites to entities by GSTIN…"}{" "}
                  <span className="text-fg">
                    {listed.filter((s) => s.legalEntityId && !s.entityReview).length} of {listed.length}
                  </span>
                </span>
              </div>
            </div>
          )}

          <AnimatePresence>
            {boundary.matching === "done" &&
              review.map((s) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border border-amber/30 bg-amber/[0.06] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <StatusDot tone="amber" pulse /> {s.name} needs an entity
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    {s.reviewNote ?? (s.gstTradeName ? `GST lists ${reviewEntity(s)?.name ?? "another entity"}, but the trade name is “${s.gstTradeName}”.` : "No GSTIN matched.")} Drag it to the right company, or choose:
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entities
                      .filter((e) => e.relationship !== "jv" && e.relationship !== "associate" && !e.aggregate && (!isPublic || e.relationship === "holding" || e.name === s.entityHint || (s.reviewNote ?? "").includes(e.shortName.split(" ")[0])))
                      .map((e) => (
                        <Button
                          key={e.id}
                          size="sm"
                          variant={(s.reviewSuggest ? s.reviewSuggest === e.name : s.gstTradeName && s.gstTradeName.toLowerCase().includes(e.shortName.split(" ")[0].toLowerCase())) ? "primary" : "secondary"}
                          onClick={() => {
                            assign(s.id, e.id, "owner")
                            maybeConfirmBoundary()
                          }}
                        >
                          {e.shortName}
                        </Button>
                      ))}
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>

          {jv && jvSite && boundary.matching === "done" && !review.length && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line-strong p-4">
              <div className="text-sm font-medium leading-snug">
                {jv.name.replace(" Private Limited", "")} is a {jv.holdingPct ?? 50}% JV. Include its {jvSite.name} {jvSite.type} in this BRSR?
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant={boundary.jvDecision === "include" ? "primary" : "secondary"}
                  aria-pressed={boundary.jvDecision === "include"}
                  onClick={() => {
                    setJv("include")
                    maybeConfirmBoundary()
                  }}
                >
                  Include at {jv.holdingPct ?? 50}%
                </Button>
                <Button
                  size="sm"
                  variant={boundary.jvDecision === "exclude" ? "primary" : "secondary"}
                  aria-pressed={boundary.jvDecision === "exclude"}
                  onClick={() => {
                    setJv("exclude")
                    maybeConfirmBoundary()
                  }}
                >
                  Leave it out
                </Button>
              </div>
            </motion.div>
          )}

          {isPublic && boundary.matching === "done" && !review.length && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line-strong p-4">
              <div className="text-sm font-medium leading-snug">
                {client.preIpo ? client.preIpo.boundaryQuestion : `${client.shortName} filed ${client.lastBrsr?.fy} on a standalone basis. Keep it standalone for ${fiscalYear}?`}
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {subsidiarySites.length
                  ? `Consolidating brings in ${subsidiarySites.map((x) => x.name).join(", ")}, owned by ${subsidiarySites.length === 1 ? "a subsidiary" : "subsidiaries"}.`
                  : "No subsidiary owns a site in the public footprint, so consolidating changes only the entity list."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={boundary.jvDecision === "exclude" ? "primary" : "secondary"}
                  aria-pressed={boundary.jvDecision === "exclude"}
                  onClick={() => {
                    setJv("exclude")
                    maybeConfirmBoundary()
                  }}
                >
                  {client.preIpo ? "Standalone" : "Standalone, as filed"}
                </Button>
                <Button
                  size="sm"
                  variant={boundary.jvDecision === "include" ? "primary" : "secondary"}
                  aria-pressed={boundary.jvDecision === "include"}
                  onClick={() => {
                    setJv("include")
                    maybeConfirmBoundary()
                  }}
                >
                  Consolidate subsidiaries
                </Button>
              </div>
            </motion.div>
          )}

          {boundary.confirmed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="rounded-2xl border border-accent/30 bg-accent/[0.05] p-5">
                <Eyebrow>Boundary statement · {fiscalYear}</Eyebrow>
                <p className="mt-2 text-lg font-medium leading-snug tracking-tight">
                  <Typewriter key={statement} text={statement} />
                </p>
                <p className="mt-3 text-xs text-muted">{sitesIn} sites · {isPublic ? (client.lastBrsr ? `from the filed ${client.lastBrsr.fy} BRSR, ${client.publicGst.length ? "public GST records" : "company filings"} and your confirmations` : "from public records, your energy file and your confirmations") : "from MCA master data (demo), GSTIN matches and your confirmations"}</p>
              </div>
              <Button variant="primary" className="w-full" onClick={() => goTo("connect")}>
                {isPublic ? "Connect data sources" : "Activate ergOS energy layer"} <ArrowRight size={15} />
              </Button>
            </motion.div>
          )}
        </div>
      }
    />
  )
}
