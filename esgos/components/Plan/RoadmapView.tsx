"use client"

// The roadmap: every open readiness item ranked and placed on a milestone,
// with effort, dependencies and an owner. Week 0 is today.

import { motion } from "framer-motion"
import { CalendarRange, Flag, Info, Link2, UserRound } from "lucide-react"
import { useMemo, useState } from "react"
import { MILESTONES } from "@/esgos/lib/readiness/engine"
import type { MilestoneId, Priority, ReadinessItem } from "@/esgos/lib/readiness/types"
import { getClient } from "@/esgos/lib/clients"
import { Eyebrow } from "../common/ui"
import { cn } from "../common/cn"
import { PRIORITY_STYLE, priorityLabel, useReadiness } from "../Gaps/ReadinessView"

const HORIZON = 78
const MS_HUE: Record<MilestoneId, string> = {
  M1: "var(--hue-boundary)",
  M2: "var(--hue-connect)",
  M3: "var(--hue-profile)",
  M4: "var(--hue-plan)",
  M5: "var(--hue-seed)",
}
const PRIORITIES: Priority[] = ["Before listing", "First BRSR year", "After listing"]

function weekDate(start: Date, w: number) {
  const d = new Date(start.getTime() + w * 7 * 86400000)
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

// Listed companies read M4 against their next filing rather than a first report.
function milestoneTitle(id: MilestoneId, title: string) {
  if (id === "M4" && !getClient().preIpo) return "Next BRSR drafted"
  return title
}

function topOwners(items: ReadinessItem[], n = 3) {
  const m = new Map<string, number>()
  for (const x of items) {
    const k = x.owner.person ? `${x.owner.person} (${x.owner.role})` : x.owner.role
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
}

export function RoadmapView() {
  const r = useReadiness()
  const client = getClient()
  const [ms, setMs] = useState<MilestoneId | null>(null)
  const [priority, setPriority] = useState<Priority | null>(null)
  const [owner, setOwner] = useState<string>("")
  const today = useMemo(() => new Date(), [])
  const open = useMemo(() => r.items.filter((x) => x.status !== "now").sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, undefined, { numeric: true })), [r.items])
  const owners = useMemo(() => [...new Set(open.map((x) => x.owner.role))].sort(), [open])
  const rows = open.filter((x) => (!ms || x.milestone === ms) && (!priority || x.priority === priority) && (!owner || x.owner.role === owner))
  const ticks = [0, 13, 26, 39, 52, 65, 78]

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow className="flex items-center gap-2">
            <CalendarRange size={13} /> Roadmap · {client.shortName}
          </Eyebrow>
          <h2 className="mt-1 text-xl font-medium tracking-tight">{client.preIpo ? "From today to a listing-ready ESG disclosure" : "From today to the next assured BRSR"}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            {open.length} open items across BRSR, ISSB and plant data, ranked and placed on five milestones. Week 0 is today (
            {today.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}).
            {client.preIpo?.plannedListing && ` Listing target: ${client.preIpo.plannedListing}.`}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-x-5 text-right">
          {PRIORITIES.map((p) => (
            <button key={p} type="button" onClick={() => setPriority(priority === p ? null : p)} aria-pressed={priority === p} className="text-right">
              <div className={cn("text-2xl font-medium tracking-tight", p === "Before listing" ? "text-hue-gaps" : p === "First BRSR year" ? "text-amber" : "text-hue-seed")}>{r.byPriority[p]}</div>
              <div className={cn("text-[11px]", priority === p ? "text-fg underline underline-offset-4" : "text-muted")}>{priorityLabel(p)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-6 rounded-xl border border-line bg-surface/40 p-4">
        <div className="relative ml-0 sm:ml-56">
          <div className="relative h-5 text-[10px] text-faint">
            {ticks.map((w) => (
              <span key={w} className={cn("absolute whitespace-nowrap", w === 0 ? "" : w === HORIZON ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: `${(w / HORIZON) * 100}%` }}>
                <span className="hidden sm:inline">{weekDate(today, w)}</span>
                <span className="sm:hidden">w{w}</span>
              </span>
            ))}
          </div>
        </div>
        <ul className="mt-1 space-y-2">
          {MILESTONES.map((m, i) => {
            const items = open.filter((x) => x.milestone === m.id)
            const active = ms === m.id
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setMs(active ? null : m.id)}
                  aria-pressed={active}
                  className={cn(
                    "grid w-full grid-cols-1 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors sm:grid-cols-[13.5rem_1fr]",
                    active ? "bg-surface-2" : "hover:bg-surface-2/60",
                  )}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Flag size={13} style={{ color: MS_HUE[m.id] }} />
                      {m.id} · {milestoneTitle(m.id, m.title)}
                    </span>
                    <span className="block truncate pl-5 text-[11px] text-faint">
                      Weeks {m.start}–{m.end} · {weekDate(today, m.end)}
                    </span>
                  </span>
                  <span className="block">
                    <span className="relative block h-8 rounded-md bg-surface-3/40">
                      {ticks.map((w) => (
                        <span key={w} className="absolute inset-y-0 w-px bg-line" style={{ left: `${(w / HORIZON) * 100}%` }} />
                      ))}
                      <motion.span
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
                        className="absolute inset-y-1 flex origin-left items-center overflow-hidden whitespace-nowrap rounded px-2 text-[11px] font-medium"
                        style={{
                          left: `${(m.start / HORIZON) * 100}%`,
                          width: `${((m.end - m.start) / HORIZON) * 100}%`,
                          background: `color-mix(in oklab, ${MS_HUE[m.id]} 22%, transparent)`,
                          color: MS_HUE[m.id],
                          boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${MS_HUE[m.id]} 45%, transparent)`,
                        }}
                      >
                        <span className="truncate">
                          {items.length} item{items.length === 1 ? "" : "s"}
                        </span>
                      </motion.span>
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-muted" style={{ paddingLeft: `${(m.start / HORIZON) * 100}%` }} title={m.outcome}>
                      {m.outcome}
                    </span>
                  </span>
                </button>
                {active && (
                  <div className="ml-2 mt-1 flex flex-wrap gap-x-5 gap-y-1 pl-5 text-xs text-muted sm:ml-56 sm:pl-2">
                    {topOwners(items).map(([o, n]) => (
                      <span key={o} className="inline-flex items-center gap-1.5">
                        <UserRound size={11} /> {o} · {n}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Table */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>
          {rows.length} item{rows.length === 1 ? "" : "s"}
          {ms ? ` · ${ms} ${milestoneTitle(ms, MILESTONES.find((m) => m.id === ms)!.title)}` : ""}
          {priority ? ` · ${priorityLabel(priority)}` : ""}
        </Eyebrow>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted">
            Owner
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className="h-8 rounded-md border border-line-strong bg-bg px-2 text-xs text-fg">
              <option value="">Everyone</option>
              {owners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          {(ms || priority || owner) && (
            <button
              type="button"
              className="text-xs text-muted hover:text-fg"
              onClick={() => {
                setMs(null)
                setPriority(null)
                setOwner("")
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] text-faint">
              <th className="py-2 pr-3 font-medium">Item</th>
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 font-medium">Priority</th>
              <th className="py-2 pr-3 font-medium">Effort</th>
              <th className="py-2 pr-3 font-medium">Depends on</th>
              <th className="py-2 font-medium">Owner</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((x) => (
              <tr key={x.id} className="border-b border-line align-top">
                <td className="py-2 pr-3">
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 font-mono text-[11px] text-faint">{x.id}</span>
                    <span className="min-w-0">
                      <span className="block">{x.title}</span>
                      {x.gap && <span className="block text-xs text-muted">{x.gap}</span>}
                    </span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-xs text-muted">
                  {x.category}
                  {x.core && <span className="ml-1.5 rounded bg-accent/12 px-1 py-px text-[10px] font-medium text-accent">Core</span>}
                </td>
                <td className="py-2 pr-3">
                  <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", PRIORITY_STYLE[x.priority])}>{priorityLabel(x.priority)}</span>
                  <div className="mt-1 text-[10px] text-faint">
                    score {x.score} · {x.milestone}
                  </div>
                </td>
                <td className="whitespace-nowrap py-2 pr-3 text-xs text-muted">
                  {x.effort} · ~{x.weeks} wk
                </td>
                <td className="py-2 pr-3 text-xs text-muted">
                  {x.dependsOn.length ? (
                    <ul className="space-y-0.5">
                      {x.dependsOn.map((d) => (
                        <li key={d} className="flex items-start gap-1">
                          <Link2 size={10} className="mt-[3px] shrink-0" /> {d}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-faint">None</span>
                  )}
                </td>
                <td className="py-2 text-xs">
                  {x.owner.person && <div>{x.owner.person}</div>}
                  <div className="text-muted">{x.owner.role}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 200 && <p className="mt-2 text-xs text-faint">Showing the top 200 of {rows.length}. Filter by milestone or owner to see the rest.</p>}
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-lg border border-line bg-surface/40 p-3 text-xs leading-relaxed text-muted">
        <Info size={13} className="mt-0.5 shrink-0" />
        <p>
          How items are ranked: score = 3 × regulatory weight + 2 × investor relevance + 3 × {client.preIpo ? "IPO impact" : "filing impact"} − 4 if it can wait
          {client.preIpo ? " until after listing" : ""}. Each weight is 1 to 3.{" "}
          {client.preIpo
            ? "Section A, Section B, BRSR Core and board policies are needed before listing (offer document and day-one governance); other Essential indicators are needed for the first BRSR after listing; Leadership, value-chain and ISSB-only items can follow."
            : "Section A, Section B, BRSR Core and board policies come first; other Essential indicators in this reporting year; Leadership, value-chain and ISSB-only items are voluntary."}{" "}
          Effort is S (up to 3 weeks), M (6 to 10) or L (14 to 20), and assumes the owner has the data.
        </p>
      </div>
    </div>
  )
}
