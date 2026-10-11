"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check, Upload } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useStore, type ErgosLink } from "@/esgos/lib/store"
import { SOURCE_IMPORT, connectSource, resolveErgosCandidate, runConnect } from "@/esgos/lib/pipelines"
import { goTo } from "@/esgos/lib/navigation"
import { inBoundary, profileEstimate, profileOrder } from "@/esgos/lib/selectors"
import { formatEstimate } from "@/esgos/lib/questionEngine"
import { groupEnergy, derived } from "@/esgos/lib/derived"
import { providers } from "@/esgos/providers"
import { ERGOS_ENERGY } from "@/esgos/lib/demoData"
import type { DataPoint, DocumentRecord, Site, SourceKey } from "@/esgos/lib/types"
import { getClient } from "@/esgos/lib/clients"
import { filedDp, filedMetric } from "@/esgos/lib/filed"
import { EnergyFilePanel } from "./EnergyFilePanel"
import { Download, FileUp, Inbox, Sparkles, UserRound } from "lucide-react"
import { TEMPLATES } from "@/esgos/lib/imports"
import { roleInSentence } from "@/esgos/lib/stakeholders"
import { downloadTemplate } from "../common/ImportDrawer"
import { AgentLine } from "../common/AgentLine"
import { Button, Count, Eyebrow, SceneLayout, StatusDot } from "../common/ui"
import { SourceBadge, Value } from "../common/Value"
import { SiteVisual } from "../Factory/SiteVisual"
import { cn } from "../common/cn"
import { SOURCE_ICON } from "../common/icons"

const LINK_COPY: Record<ErgosLink, string> = {
  pending: "Waiting",
  connecting: "Connecting…",
  connected: "Connected",
  "needs-review": "Needs review",
  "not-found": "Not on ergOS",
}

const NO_METERS: never[] = []

function SiteTile({ site }: { site: Site }) {
  const link = useStore((s) => s.connect.siteStatus[site.id] ?? "pending")
  const meters = useStore((s) => s.connect.validated[site.id]) ?? NO_METERS
  const entity = useStore((s) => s.entities.find((e) => e.id === site.legalEntityId))
  const elec = useStore((s) => s.dataPoints.find((d) => d.id === `dp:${site.id}:elec.annual`))
  const building = link === "connected"
  return (
    <motion.div layout className={cn("rounded-2xl border p-3 transition-colors", link === "needs-review" ? "border-amber/50 bg-amber/[0.04]" : link === "connected" ? "border-line-strong bg-surface/50" : "border-line")}>
      <SiteVisual
        type={site.type}
        phase={building ? "building" : "dot"}
        meters={meters}
        pending={link === "connecting" || link === "pending"}
        muted={link === "not-found"}
        title={`${site.name} ${site.type}${building ? `, ${meters.join(", ")} validated` : ""}`}
      />
      <div className="mt-1 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{site.name}</div>
          <div className="truncate text-[11px] text-faint">{entity?.shortName ?? site.city}</div>
        </div>
        <span className={cn("shrink-0 text-[11px]", link === "connected" ? "text-accent" : link === "needs-review" ? "text-amber" : "text-faint")}>{LINK_COPY[link]}</span>
      </div>
      {elec && <Value dp={elec} size="sm" detail={false} className="mt-1 -ml-1 px-1" />}
    </motion.div>
  )
}

function CandidateChooser({ site }: { site: Site }) {
  const [choice, setChoice] = useState(site.ergosCandidates?.[0] ?? "")
  const [busy, setBusy] = useState(false)
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber/30 bg-amber/[0.05] p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <StatusDot tone="amber" pulse /> {site.name}: two ergOS candidates
      </div>
      <p className="mt-1 text-[13px] text-muted">Pick the feed that represents the plant. The other stays in ergOS untouched.</p>
      <fieldset className="mt-3 space-y-2">
        <legend className="sr-only">ergOS feed for {site.name}</legend>
        {(site.ergosCandidates ?? []).map((id) => {
          const rec = providers.ergos.describeCandidate(id)
          const e = ERGOS_ENERGY[id]
          const comp = e ? derived(`cand:${id}`, "Data completeness", Math.round(e.completeness * 100), { unit: "%", source: "ergos", sourceRef: id, period: e.period }) : undefined
          return (
            <label key={id} className={cn("flex cursor-pointer gap-3 rounded-xl border p-3 text-sm", choice === id ? "border-accent/50 bg-accent/[0.06]" : "border-line hover:bg-surface-2")}>
              <input type="radio" name={`cand-${site.id}`} checked={choice === id} onChange={() => setChoice(id)} className="mt-1 accent-[var(--accent)]" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{rec?.label ?? id}</span>
                <span className="block text-xs text-muted">
                  {id} · {rec?.meterCount} meter{rec?.meterCount === 1 ? "" : "s"} · data since {rec?.dataSince}
                </span>
                {comp && <Value dp={comp} size="sm" detail={false} className="mt-1 -ml-1 px-1" />}
              </span>
            </label>
          )
        })}
      </fieldset>
      <Button
        size="sm"
        variant="primary"
        className="mt-3"
        disabled={!choice || busy}
        onClick={async () => {
          setBusy(true)
          await resolveErgosCandidate(site.id, choice)
          setBusy(false)
        }}
      >
        {busy ? "Connecting…" : "Use this feed"}
      </Button>
    </motion.div>
  )
}

const SOURCE_ROWS: { key: SourceKey; title: string; system: string }[] = [
  { key: "ergos", title: "Energy", system: "ergOS" },
  { key: "hrms", title: "Headcount", system: "HRMS" },
  { key: "erp", title: "Fuel and production", system: "ERP" },
  { key: "ehs", title: "Safety and waste", system: "EHS" },
  { key: "vault", title: "Permits and policies", system: "Document vault" },
]

type Cell = "on" | "partial" | "off"

function UploadForm({ sites, onDone }: { sites: Site[]; onDone: () => void }) {
  const addDocument = useStore((s) => s.addDocument)
  const setSource = useStore((s) => s.setSource)
  const vault = useStore((s) => s.sources.vault)
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "")
  const [kind, setKind] = useState<DocumentRecord["kind"]>("permit")
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const topics: Record<string, string> = { permit: "Consent to Operate (Water and Air Acts)", invoice: "Fuel invoices, 12 months", policy: "Policy document" }
  return (
    <form
      className="mt-3 space-y-2 rounded-xl border border-line bg-bg/40 p-3 text-left"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        const site = sites.find((s) => s.id === siteId)
        const doc = await providers.vault.upload({
          fileName: file?.name ?? `${kind === "permit" ? "CTO" : kind === "invoice" ? "Fuel_invoices" : "Policy"}_${site?.name.replace(/\s/g, "") ?? "Group"}.pdf`,
          kind,
          topic: topics[kind],
          siteId: kind === "policy" ? undefined : siteId,
        })
        addDocument(doc)
        if (vault.status === "not_connected") setSource("vault", { status: "partial", syncState: "synced", coverageNote: "Uploads only", coverage: doc.siteId ? [doc.siteId] : [] })
        setBusy(false)
        onDone()
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value as DocumentRecord["kind"])} className="mt-1 h-8 w-full rounded-lg border border-line-strong bg-surface px-2 text-xs text-fg">
            <option value="permit">CTO / CTE permit</option>
            <option value="invoice">Fuel invoices</option>
            <option value="policy">Policy</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          Site
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)} disabled={kind === "policy"} className="mt-1 h-8 w-full rounded-lg border border-line-strong bg-surface px-2 text-xs text-fg disabled:opacity-40">
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-xs text-muted">
        File (optional, stays in this browser)
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs text-muted file:mr-2 file:rounded-full file:border-0 file:bg-surface-3 file:px-3 file:py-1 file:text-xs file:text-fg" />
      </label>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" type="submit" disabled={busy}>
          {busy ? "Uploading…" : "Upload"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

type SourceRow = (typeof SOURCE_ROWS)[number]

// One card per source: what to bring, from whom, what it fills, and how to bring it.
function SourceCard({ row, cellCount, total, index }: { row: SourceRow; cellCount: number; total: number; index: number }) {
  const src = useStore((s) => s.sources[row.key])
  const note = useStore((s) => s.records.sourceNotes[row.key])
  const stakeholders = useStore((s) => s.stakeholders)
  const setUi = useStore((s) => s.setUi)
  const sites = useStore((s) => s.sites)
  const [uploading, setUploading] = useState(false)
  const isPublic = getClient().kind === "public"
  const kind = SOURCE_IMPORT[row.key]
  const t = TEMPLATES[kind]
  const owner = stakeholders.find((p) => !p.siteId && p.role === t.owner && !p.vacant)
  const Icon = SOURCE_ICON[row.key]
  const connected = src.status === "connected" || src.status === "partial"
  const status = src.status === "connecting" ? "Connecting…" : src.status === "connected" ? "Connected" : src.status === "partial" ? "Partial" : "Needed"
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index }}
      className={cn("flex flex-col rounded-lg border p-4", connected ? "border-accent/40 bg-accent/[0.05]" : "border-line-strong bg-surface")}
      aria-label={`${row.title} from ${row.system}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-md", connected ? "bg-accent/15 text-accent" : "bg-hue-connect/12 text-hue-connect")}>
            <Icon size={17} />
          </span>
          <div>
            <div className="text-[15px] font-medium leading-tight">{row.title}</div>
            <div className="text-xs text-muted">{row.key === "ergos" && getClient().energyFile && connected ? "Your energy file (until ergOS is connected)" : row.system}</div>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            src.status === "connected" ? "bg-accent/15 text-accent" : src.status === "partial" ? "bg-teal/15 text-teal" : src.status === "connecting" ? "bg-teal/10 text-teal" : "bg-amber/15 text-amber",
          )}
        >
          {src.status === "connected" && <Check size={11} />}
          {status}
        </span>
      </div>

      {connected ? (
        <p className="mt-3 text-sm text-muted">
          {note ?? src.coverageNote} · <span className="text-fg">{cellCount}</span> of {total} sites
        </p>
      ) : (
        <dl className="mt-3 space-y-1.5 text-[13px] leading-snug">
          <div className="flex gap-2">
            <dt className="mt-0.5 shrink-0 text-faint">
              <Inbox size={13} aria-label="Bring" />
            </dt>
            <dd>
              <span className="font-medium">{t.title}</span>
              <span className="text-muted"> · {t.system}</span>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="mt-0.5 shrink-0 text-faint">
              <UserRound size={13} aria-label="Ask" />
            </dt>
            <dd className="text-muted">
              Ask {owner ? <span className="text-fg">{owner.name}</span> : "the"} {owner ? `(${t.owner})` : roleInSentence(t.owner)}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="mt-0.5 shrink-0 text-faint">
              <Sparkles size={13} aria-label="Fills" />
            </dt>
            <dd className="text-muted">{t.fills}</dd>
          </div>
        </dl>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        {!isPublic && row.key !== "ergos" && src.status === "not_connected" && (
          <Button size="sm" variant="primary" onClick={() => connectSource(row.key as Exclude<SourceKey, "ergos">)}>
            Connect (mock)
          </Button>
        )}
        {(isPublic || row.key === "ergos") && (
          <Button size="sm" variant={isPublic && !connected ? "primary" : "secondary"} onClick={() => setUi({ importOpen: true, importKind: kind })}>
            <FileUp size={13} /> {connected ? "Upload a newer file" : "Upload file"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => downloadTemplate(kind)}>
          <Download size={13} /> Template
        </Button>
        {!isPublic && row.key === "vault" && (
          <Button size="sm" variant="ghost" onClick={() => setUploading((u) => !u)} aria-expanded={uploading}>
            <Upload size={13} /> One document
          </Button>
        )}
      </div>
      {!isPublic && row.key === "vault" && uploading && <UploadForm sites={inBoundary({ sites })} onDone={() => setUploading(false)} />}
    </motion.article>
  )
}

export function ConnectScene() {
  const state = useStore()
  const { connect, sources, say, records, documents, energy } = state
  const sites = useMemo(() => profileOrder(state), [state])
  const review = sites.filter((s) => connect.siteStatus[s.id] === "needs-review")
  const est = profileEstimate(state)
  const g = groupEnergy(state)
  const allSites = inBoundary(state)

  const client = getClient()
  const isPublic = client.kind === "public"
  const unmetered = isPublic && g.sites.length === 0
  const filedTotal = isPublic ? filedMetric("p6.e1.total") : undefined
  const filedA = isPublic ? filedMetric("p6.e1.A") : undefined
  const filedD = isPublic ? filedMetric("p6.e1.D") : undefined
  const filedS1 = isPublic ? filedMetric("p6.e7.scope1") : undefined
  const filedS2 = isPublic ? filedMetric("p6.e7.scope2") : undefined
  const reShare: DataPoint | undefined =
    filedA && filedD && typeof filedA.value === "number" && typeof filedD.value === "number"
      ? {
          ...filedDp(filedA),
          id: "filed:re-share",
          label: `Renewable share of electricity, ${filedA.fy}`,
          value: Math.round((filedA.value / (filedA.value + filedD.value)) * 1000) / 10,
          unit: "%",
          note: `Computed from the filed energy table: A ÷ (A + D) = ${filedA.value} ÷ ${filedA.value + filedD.value} GJ.`,
        }
      : undefined

  useEffect(() => {
    if (connect.phase === "idle") say(client.energyFile ? `Next, the data sources. I'll start with your energy file, ${client.energyFile.file}.` : isPublic ? "Next, the data sources. First, is there an ergOS account?" : "I'll activate the ergOS energy layer.")
    void runConnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cell = (key: SourceKey, site: Site): Cell => {
    switch (key) {
      case "ergos": {
        if (connect.siteStatus[site.id] !== "connected") return "off"
        const m = connect.validated[site.id] ?? []
        return (energy[site.id]?.completeness ?? 1) < 0.95 || (site.type === "factory" && !m.includes("steam") && !m.includes("water")) ? "partial" : "on"
      }
      case "hrms":
        return records.hrms[site.id] ? "on" : "off"
      case "erp":
        return records.erpFuel[site.id] ? "on" : records.erpProducts[site.id] ? "partial" : "off"
      case "ehs":
        return records.ehs[site.id] ? "on" : "off"
      case "vault": {
        const docs = documents.filter((d) => d.siteId === site.id)
        return docs.some((d) => d.kind === "permit") ? "on" : docs.length ? "partial" : "off"
      }
    }
  }

  const coverageCount = (key: SourceKey) => allSites.filter((s) => cell(key, s) !== "off").length
  const estimateValue = derived("profile:estimate", "Profile estimate", est.questions, { source: "engine", sourceRef: "Question rules over connected sources", note: `${formatEstimate(est.seconds)} across ${est.sites} sites` })
  const connectedCount = SOURCE_ROWS.filter((r) => sources[r.key].status === "connected" || sources[r.key].status === "partial").length

  return (
    <SceneLayout
      visual={
        <div className="scrollbar-thin absolute inset-0 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <Eyebrow className="text-hue-connect">Data sources · {connectedCount} of {SOURCE_ROWS.length} connected</Eyebrow>
                <h2 className="mt-1 text-2xl font-medium tracking-tight">What I need from {client.shortName}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {client.preIpo
                    ? "No BRSR has been filed yet, so every plant figure comes from your own systems. Your energy file is already in; each source below fills more of the plant-level picture and removes questions from the site profiles."
                    : isPublic
                    ? "The filed BRSR has company totals only. Each source below fills the plant-level picture and removes questions from the site profiles. Bring one file per source, or connect it read-only."
                    : "Connect each source read-only. Every connection removes questions from the site profiles."}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {SOURCE_ROWS.map((row, i) => (
                <SourceCard key={row.key} row={row} cellCount={coverageCount(row.key)} total={allSites.length} index={i} />
              ))}
            </div>

            {client.energyFile && (
              <div className="mt-10">
                <EnergyFilePanel file={client.energyFile} />
              </div>
            )}

            <div className="mt-10">
              {unmetered && filedTotal ? (
                <>
                  <Eyebrow>Filed {filedTotal.fy} · company totals</Eyebrow>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 xl:grid-cols-5">
                    <div className="col-span-2 sm:col-span-1">
                      <div className="text-xs text-muted">Total energy</div>
                      <Value dp={filedDp(filedTotal)} size="lg" badge="below" className="mt-1 -ml-1 px-1" />
                    </div>
                    {reShare && (
                      <div>
                        <div className="text-xs text-muted">Renewable electricity</div>
                        <Value dp={reShare} size="lg" badge="below" detail={false} className="mt-1 -ml-1 px-1" />
                      </div>
                    )}
                    {filedS1 && (
                      <div>
                        <div className="text-xs text-muted">Scope 1</div>
                        <Value dp={filedDp(filedS1)} size="lg" badge="below" detail={false} className="mt-1 -ml-1 px-1" />
                      </div>
                    )}
                    {filedS2 && (
                      <div>
                        <div className="text-xs text-muted">Scope 2</div>
                        <Value dp={filedDp(filedS2)} size="lg" badge="below" detail={false} className="mt-1 -ml-1 px-1" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted">Metered sites</div>
                      <div className="mt-1 text-2xl font-medium tracking-tight">
                        0 <span className="text-sm text-muted">of {allSites.length}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Eyebrow>Energy layer</Eyebrow>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 xl:grid-cols-5">
                    <div className="col-span-2 sm:col-span-1">
                      <div className="text-xs text-muted">Annual electricity</div>
                      <Value dp={g.total} size="lg" badge="below" className="mt-1 -ml-1 px-1" />
                    </div>
                    <div>
                      <div className="text-xs text-muted">Renewable</div>
                      {client.energyFile ? (
                        <div className="mt-1 text-sm leading-snug text-muted">
                          Group solar only
                          <span className="block text-[11px] text-faint">not allocated to plants</span>
                        </div>
                      ) : (
                        <Value dp={g.re} size="lg" badge="below" detail={false} className="mt-1 -ml-1 px-1" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted">Grid</div>
                      <Value dp={g.grid} size="lg" badge="below" detail={false} className="mt-1 -ml-1 px-1" />
                    </div>
                    <div>
                      <div className="text-xs text-muted">Connected sites</div>
                      <Value dp={g.connected} size="lg" badge="below" detail={false} format={(d) => ({ text: `${d.value}`, unit: `of ${allSites.length}` })} className="mt-1 -ml-1 px-1" />
                    </div>
                    <div>
                      <div className="text-xs text-muted">{client.energyFile ? "Months from readings" : "Completeness"}</div>
                      <Value dp={g.completeness} size="lg" badge="below" detail={false} className="mt-1 -ml-1 px-1" />
                    </div>
                  </div>
                  {connect.phase === "done" && !client.energyFile && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted">
                      Steam metered at <Value dp={g.steam} size="sm" detail={false} format={(d) => ({ text: `${d.value} sites` })} />, water at <Value dp={g.water} size="sm" detail={false} format={(d) => ({ text: String(d.value) })} />
                    </motion.p>
                  )}
                </>
              )}
            </div>

            <div className="mt-10">
              <Eyebrow>Sites · energy layer</Eyebrow>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                {sites
                  .filter((s) => !state.ui.siteFilter || s.type === state.ui.siteFilter)
                  .map((s) => (
                    <SiteTile key={s.id} site={s} />
                  ))}
              </div>
            </div>
          </div>
        </div>
      }
      panel={
        <div className="flex flex-col gap-6 p-6">
          <AgentLine />

          <div className="rounded-2xl border border-line bg-surface/60 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <Eyebrow>Profile estimate</Eyebrow>
                <div className="mt-1 text-2xl font-medium tracking-tight">{formatEstimate(est.seconds)}</div>
              </div>
              <div className="text-right text-xs text-muted">
                <Count value={est.questions} /> questions left
                <div className="mt-1">
                  <SourceBadge dp={estimateValue} detail={false} />
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">Every source you bring removes questions for the plants it covers.</p>
            <AnimatePresence mode="wait">
              {connect.drop && (
                <motion.div key={connect.drop.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-2 rounded-xl bg-accent/[0.08] px-3 py-2 text-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inset-0 rounded-full bg-accent motion-pulse" />
                    <span className="relative h-2 w-2 rounded-full bg-accent" />
                  </span>
                  <span>
                    {connect.drop.label}: <span className="font-medium text-accent">{connect.drop.removed} question{connect.drop.removed === 1 ? "" : "s"} removed</span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {review.map((s) => (
            <CandidateChooser key={s.id} site={s} />
          ))}

          <section aria-label="Coverage by site">
            <Eyebrow>Coverage by site</Eyebrow>
            <table className="mt-2 w-full text-xs">
              <thead>
                <tr className="text-faint">
                  <th className="py-1.5 text-left font-medium">Site</th>
                  {SOURCE_ROWS.map((r) => {
                    const I = SOURCE_ICON[r.key]
                    return (
                      <th key={r.key} className="py-1.5 text-center font-medium" title={`${r.title} (${r.system})`}>
                        <I size={13} className="mx-auto" aria-label={r.system} />
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {allSites.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="py-1.5 pr-2 text-muted">{s.name}</td>
                    {SOURCE_ROWS.map((r) => {
                      const c = cell(r.key, s)
                      return (
                        <td key={r.key} className="py-1.5 text-center">
                          <span
                            className={cn("inline-block h-2.5 w-2.5 rounded-full", c === "on" ? "bg-accent" : c === "partial" ? "border-2 border-teal" : "border border-line-strong")}
                            title={c === "on" ? "Connected" : c === "partial" ? "Partial" : "Not connected"}
                            aria-label={`${s.name} ${r.system}: ${c === "on" ? "connected" : c === "partial" ? "partial" : "not connected"}`}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 flex gap-4 text-[11px] text-faint">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Connected</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border-2 border-teal" /> Partial</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-line-strong" /> Not connected</span>
            </div>
          </section>

          {connect.phase === "done" && !review.length && (
            <div className="sticky bottom-0 -mx-6 border-t border-line bg-bg/90 px-6 py-4 backdrop-blur">
              <Button variant="primary" className="w-full" onClick={() => goTo("profile")}>
                Understand my sites <ArrowRight size={15} />
              </Button>
              {isPublic && connectedCount === 0 && <p className="mt-2 text-center text-xs text-muted">No files yet? I&apos;ll ask each plant instead.</p>}
            </div>
          )}
        </div>
      }
    />
  )
}
