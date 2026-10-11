"use client"

// Full BRSR and ISSB readiness: every question or requirement, its status, the
// gap, how it is ranked, and who owns it.

import { AnimatePresence, motion } from "framer-motion"
import { BookOpen, ChevronDown, Clock, FileSearch, Link2, MessagesSquare } from "lucide-react"
import { useMemo, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { assessReadiness } from "@/esgos/lib/readiness/engine"
import type { GapCategory, Priority, ReadinessItem, Status } from "@/esgos/lib/readiness/types"
import { Eyebrow } from "../common/ui"
import { cn } from "../common/cn"
import { PRINCIPLE_ICON } from "../common/icons"
import type { Principle } from "@/esgos/lib/indicators"
import { getClient } from "@/esgos/lib/clients"

export const PRIORITY_STYLE: Record<Priority, string> = {
  "Before listing": "bg-hue-gaps/12 text-hue-gaps",
  "First BRSR year": "bg-amber/15 text-amber",
  "After listing": "bg-hue-seed/12 text-hue-seed",
}

// Priorities are ranked against a listing date; a listed company reads them
// against its next filing instead.
const LISTED_LABEL: Record<Priority, string> = {
  "Before listing": "Before next filing",
  "First BRSR year": "This reporting year",
  "After listing": "Later (voluntary)",
}
export function priorityLabel(p: Priority) {
  return getClient().preIpo ? p : LISTED_LABEL[p]
}

const STATUS_DOT: Record<Status, string> = { now: "bg-accent", sync: "bg-amber", open: "border border-dashed border-grey" }
const STATUS_LABEL: Record<Status, string> = { now: "In place", sync: "Source or filing exists, needs work", open: "Open" }

const PRINCIPLE_TITLES: Record<string, string> = {
  P1: "Ethics, transparency and accountability",
  P2: "Sustainable and safe goods and services",
  P3: "Well-being of employees and workers",
  P4: "Stakeholder interests",
  P5: "Human rights",
  P6: "Environment",
  P7: "Public and regulatory policy",
  P8: "Inclusive growth",
  P9: "Consumer value",
}

export function useReadiness() {
  const sources = useStore((s) => s.sources)
  const documents = useStore((s) => s.documents)
  const stakeholders = useStore((s) => s.stakeholders)
  const gaps = useStore((s) => s.gaps)
  const analysis = useStore((s) => s.analysis)
  const sites = useStore((s) => s.sites)
  const connect = useStore((s) => s.connect)
  const energy = useStore((s) => s.energy)
  const group = useStore((s) => s.group)
  const interviews = useStore((s) => s.interviews)
  const collection = useStore((s) => s.collection)
  const docReview = useStore((s) => s.docReview)
  const closure = useStore((s) => s.closure)
  const drafts = useStore((s) => s.drafts)
  const reportReview = useStore((s) => s.reportReview)
  const clientId = useStore((s) => s.clientId)
  return useMemo(
    () => assessReadiness({ sources, documents, stakeholders, gaps, analysis, sites, connect, energy, group, interviews, collection, docReview, closure, drafts, reportReview }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sources, documents, stakeholders, gaps, analysis, sites, connect, energy, group, interviews, collection, docReview, closure, drafts, reportReview, clientId],
  )
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[11px] text-faint">{label}</div>
      <div className="mt-1 flex gap-0.5" aria-label={`${label}: ${value} of 3`}>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 w-5 rounded-full", i <= value ? "bg-fg" : "bg-surface-3")} />
        ))}
      </div>
    </div>
  )
}

export function ItemRow({ item, open, onToggle }: { item: ReadinessItem; open: boolean; onToggle: () => void }) {
  const setUi = useStore((s) => s.setUi)
  return (
    <li className={cn("rounded-lg border", open ? "border-line-strong bg-surface" : "border-line bg-surface/40")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STATUS_DOT[item.status])} title={STATUS_LABEL[item.status]} aria-label={STATUS_LABEL[item.status]} />
        <span className={cn("shrink-0 truncate font-mono text-[11px] text-faint", item.framework === "ISSB" ? "w-32" : "w-24")} title={item.id}>
          {item.id}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{item.title}</span>
          {item.status !== "now" && item.gap && <span className="block truncate text-xs text-muted">{item.gap}</span>}
        </span>
        {item.interview && (
          <span className="hidden shrink-0 items-center gap-1 rounded bg-hue-boundary/12 px-1.5 py-0.5 text-[10px] font-medium text-hue-boundary sm:inline-flex" title={item.interview.sources.join(", ")}>
            <MessagesSquare size={10} /> Interview
          </span>
        )}
        {item.documents && (
          <span className="hidden shrink-0 items-center gap-1 rounded bg-hue-connect/12 px-1.5 py-0.5 text-[10px] font-medium text-hue-connect sm:inline-flex" title={item.documents.sources.join(", ")}>
            <FileSearch size={10} /> Document
          </span>
        )}
        {item.core && <span className="hidden shrink-0 rounded bg-accent/12 px-1.5 py-0.5 text-[10px] font-medium text-accent sm:inline">Core</span>}
        {item.coverage && (
          <span className={cn("hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline", item.coverage === "covered" ? "bg-accent/12 text-accent" : item.coverage === "partial" ? "bg-amber/15 text-amber" : "bg-hue-gaps/12 text-hue-gaps")}>
            {item.coverage === "covered" ? "In BRSR" : item.coverage === "partial" ? "Partly in BRSR" : "Not in BRSR"}
          </span>
        )}
        {item.status !== "now" && <span className={cn("hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium md:inline", PRIORITY_STYLE[item.priority])}>{priorityLabel(item.priority)}</span>}
        <span className="hidden w-36 shrink-0 truncate text-right text-xs text-muted lg:inline">{item.owner.person ?? item.owner.role}</span>
        <ChevronDown size={14} className={cn("shrink-0 text-faint transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-4 border-t border-line px-4 py-4 text-sm">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{item.ref}</div>
                <blockquote className="mt-1 border-l-2 border-fg/30 pl-3 text-[13px] leading-relaxed text-muted">{item.text}</blockquote>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Eyebrow>Status</Eyebrow>
                  <p className="mt-1">
                    {STATUS_LABEL[item.status]} <span className="text-muted">· {item.how}</span>
                  </p>
                  {item.gap && <p className="mt-1 text-muted">{item.gap}</p>}
                </div>
                <div>
                  <Eyebrow>Owner</Eyebrow>
                  <p className="mt-1">
                    {item.owner.person ? `${item.owner.person} · ` : ""}
                    <span className="text-muted">{item.owner.role}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {item.category} · effort {item.effort} · about {item.weeks} weeks
                  </p>
                </div>
              </div>
              {item.recommendation && item.status !== "now" && (
                <div>
                  <Eyebrow>Recommendation</Eyebrow>
                  <p className="mt-1">{item.recommendation}</p>
                </div>
              )}
              {item.status !== "now" && (
                <div>
                  <Eyebrow>Why this priority</Eyebrow>
                  <div className="mt-2 flex flex-wrap items-end gap-6">
                    <Score label="Regulatory" value={item.scores.regulatory} />
                    <Score label="Investor" value={item.scores.investor} />
                    <Score label="IPO impact" value={item.scores.ipo} />
                    <div>
                      <div className="text-[11px] text-faint">{getClient().preIpo ? "Can wait until after listing" : "Voluntary"}</div>
                      <div className="mt-0.5 text-sm">{item.scores.deferrable ? "Yes" : "No"}</div>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", PRIORITY_STYLE[item.priority])}>{priorityLabel(item.priority)}</span>
                  </div>
                </div>
              )}
              {!!item.dependsOn.length && item.status !== "now" && (
                <div>
                  <Eyebrow>Depends on</Eyebrow>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {item.dependsOn.map((d) => (
                      <li key={d} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs text-muted">
                        <Link2 size={11} /> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {item.framework === "BRSR" && (
                <button type="button" onClick={() => setUi({ reference: { indicatorId: item.id } })} className="inline-flex items-center gap-1.5 text-xs text-muted underline-offset-4 hover:text-fg hover:underline">
                  <BookOpen size={12} /> Why it&apos;s needed
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function Chip<T extends string>({ value, current, onChange, children }: { value: T | null; current: T | null; onChange: (v: T | null) => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={current === value} onClick={() => onChange(current === value ? null : value)} className={cn("rounded-md border px-2.5 py-1 text-xs", current === value ? "border-fg text-fg" : "border-line text-muted hover:text-fg")}>
      {children}
    </button>
  )
}

export function BrsrReadiness() {
  const r = useReadiness()
  const [section, setSection] = useState<string | null>(null)
  const [kind, setKind] = useState<"core" | "essential" | "leadership" | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [priority, setPriority] = useState<Priority | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const items = r.items.filter((x) => x.framework !== "ISSB")
  const shown = items.filter(
    (x) =>
      (!section || (section === "IMP" ? x.framework === "Implementation" : x.framework === "BRSR" && (x.principle ?? x.id.split(".")[0]) === section)) &&
      (!kind || (kind === "core" ? x.core : x.kind === kind)) &&
      (!status || x.status === status) &&
      (!priority || (x.status !== "now" && x.priority === priority)),
  )
  const groups = [...new Set(shown.map((x) => (x.framework === "Implementation" ? "IMP" : x.principle ?? x.id.split(".")[0])))]
  const sections = ["A", "B", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "IMP"]
  const groupTitle = (g: string) => (g === "A" ? "Section A · General disclosures" : g === "B" ? "Section B · Management and process" : g === "IMP" ? "Implementation across plants" : `${g} · ${PRINCIPLE_TITLES[g] ?? ""}`)

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <div>
          <div className="text-3xl font-medium tracking-tight">{r.brsr.total}</div>
          <div className="text-xs text-muted">BRSR questions assessed</div>
        </div>
        <div>
          <div className="text-3xl font-medium tracking-tight text-accent">{r.brsr.now}</div>
          <div className="text-xs text-muted">in place</div>
        </div>
        <div>
          <div className="text-3xl font-medium tracking-tight text-amber">{r.brsr.sync}</div>
          <div className="text-xs text-muted">source or filing exists</div>
        </div>
        <div>
          <div className="text-3xl font-medium tracking-tight">{r.brsr.open}</div>
          <div className="text-xs text-muted">open</div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">
        BRSR Core: <span className="text-fg">{r.brsr.coreReady}</span> of {r.brsr.core} assurance-ready · {r.brsr.leadership} Leadership indicators · gaps by priority:{" "}
        {(["Before listing", "First BRSR year", "After listing"] as Priority[]).map((p, i) => (
          <span key={p}>
            {i > 0 && ", "}
            <span className="text-fg">{r.byPriority[p]}</span> {priorityLabel(p).replace(/^\S+/, (w) => w.toLowerCase())}
          </span>
        ))}
      </p>

      <div className="mt-5 space-y-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Section">
          <Chip value={null} current={section} onChange={setSection}>
            All
          </Chip>
          {sections.map((s) => {
            const I = PRINCIPLE_ICON[s as Principle]
            return (
              <Chip key={s} value={s} current={section} onChange={setSection}>
                <span className="inline-flex items-center gap-1">
                  {I && <I size={11} />}
                  {s === "IMP" ? "Implementation" : s}
                </span>
              </Chip>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filters">
          <Chip value={null} current={kind} onChange={setKind}>
            All types
          </Chip>
          <Chip value="core" current={kind} onChange={setKind}>
            BRSR Core
          </Chip>
          <Chip value="essential" current={kind} onChange={setKind}>
            Essential
          </Chip>
          <Chip value="leadership" current={kind} onChange={setKind}>
            Leadership
          </Chip>
          <span className="mx-1 w-px bg-line" />
          <Chip value={null} current={status} onChange={setStatus}>
            Any status
          </Chip>
          <Chip value="open" current={status} onChange={setStatus}>
            Open
          </Chip>
          <Chip value="sync" current={status} onChange={setStatus}>
            Needs work
          </Chip>
          <Chip value="now" current={status} onChange={setStatus}>
            In place
          </Chip>
          <span className="mx-1 w-px bg-line" />
          {(["Before listing", "First BRSR year", "After listing"] as Priority[]).map((p) => (
            <Chip key={p} value={p} current={priority} onChange={setPriority}>
              {priorityLabel(p)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-6">
        {groups.map((g) => (
          <section key={g}>
            <Eyebrow>{groupTitle(g)}</Eyebrow>
            <ul className="mt-2 space-y-1.5">
              {shown
                .filter((x) => (x.framework === "Implementation" ? "IMP" : x.principle ?? x.id.split(".")[0]) === g)
                .map((x) => (
                  <ItemRow key={x.id} item={x} open={openId === x.id} onToggle={() => setOpenId(openId === x.id ? null : x.id)} />
                ))}
            </ul>
          </section>
        ))}
        {!shown.length && <p className="py-8 text-center text-sm text-muted">Nothing matches these filters.</p>}
      </div>
    </div>
  )
}

export function IssbReadiness() {
  const r = useReadiness()
  const [openId, setOpenId] = useState<string | null>(null)
  const [coverage, setCoverage] = useState<"covered" | "partial" | "not" | null>(null)
  const items = r.items.filter((x) => x.framework === "ISSB" && (!coverage || x.coverage === coverage))
  const pillars = [...new Set(items.map((x) => `${x.ref.split(" ")[0] === "IFRS" ? x.ref.split(" ").slice(0, 2).join(" ") : ""} · ${x.pillar}`))]
  return (
    <div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted">
        International investors expect IFRS S1 (sustainability) and S2 (climate) disclosures. Each requirement below is mapped to the BRSR questions that cover it; the rest is work beyond BRSR.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-x-6 sm:max-w-xl">
        <button type="button" onClick={() => setCoverage(coverage === "covered" ? null : "covered")} className="text-left" aria-pressed={coverage === "covered"}>
          <div className="text-3xl font-medium tracking-tight text-accent">{r.issb.covered}</div>
          <div className="text-xs text-muted">covered by BRSR</div>
        </button>
        <button type="button" onClick={() => setCoverage(coverage === "partial" ? null : "partial")} className="text-left" aria-pressed={coverage === "partial"}>
          <div className="text-3xl font-medium tracking-tight text-amber">{r.issb.partial}</div>
          <div className="text-xs text-muted">partly covered</div>
        </button>
        <button type="button" onClick={() => setCoverage(coverage === "not" ? null : "not")} className="text-left" aria-pressed={coverage === "not"}>
          <div className="text-3xl font-medium tracking-tight text-hue-gaps">{r.issb.not}</div>
          <div className="text-xs text-muted">not covered</div>
        </button>
      </div>
      <div className="mt-6 space-y-6">
        {pillars.map((p) => (
          <section key={p}>
            <Eyebrow>{p.replace(/^ · /, "")}</Eyebrow>
            <ul className="mt-2 space-y-1.5">
              {items
                .filter((x) => `${x.ref.split(" ")[0] === "IFRS" ? x.ref.split(" ").slice(0, 2).join(" ") : ""} · ${x.pillar}` === p)
                .map((x) => (
                  <ItemRow key={x.id} item={x} open={openId === x.id} onToggle={() => setOpenId(openId === x.id ? null : x.id)} />
                ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-faint">
        <Clock size={12} /> ISSB is not mandatory in India today; these gaps are ranked as investor expectations{getClient().preIpo ? ", most after listing" : ""}.
      </p>
    </div>
  )
}

export function categoryCounts(byCategory: Record<GapCategory, number>) {
  return Object.entries(byCategory).filter(([, n]) => n > 0) as [GapCategory, number][]
}
