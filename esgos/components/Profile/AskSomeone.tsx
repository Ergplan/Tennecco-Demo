"use client"

import { motion } from "framer-motion"
import { ArrowLeft, Mail, Send, UserPlus } from "lucide-react"
import { useState } from "react"
import { useStore } from "@/esgos/lib/store"
import type { Question } from "@/esgos/lib/questionEngine"
import { ALL_ROLES, initials, peopleFor, roleInSentence, rolesForQuestion } from "@/esgos/lib/stakeholders"
import type { Site, StakeholderRole } from "@/esgos/lib/types"
import { Button, Eyebrow } from "../common/ui"
import { cn } from "../common/cn"
import { ROLE_ICON } from "../common/icons"

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface-2 font-mono text-[10px] text-fg", className)} aria-hidden>
      {initials(name)}
    </span>
  )
}

// "Not sure" → pick who would know. The question becomes a task for that person.
export function AskSomeone({
  q,
  site,
  onSend,
  onCancel,
}: {
  q: Question
  site: Site
  onSend: (stakeholderId?: string) => void
  onCancel: () => void
}) {
  const stakeholders = useStore((s) => s.stakeholders)
  const addStakeholder = useStore((s) => s.addStakeholder)
  const roles = rolesForQuestion(q)
  const ranked = peopleFor(q, site.id, stakeholders)
  const [adding, setAdding] = useState(ranked.length === 0)
  const [name, setName] = useState("")
  const [role, setRole] = useState<StakeholderRole>(roles[0])
  const [email, setEmail] = useState("")

  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="mt-6">
      <div className="flex items-center justify-between">
        <Eyebrow>Who would know?</Eyebrow>
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
          <ArrowLeft size={12} /> Back to the question
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">
        Usually the {roles.slice(0, 2).map(roleInSentence).join(" or ")}. I&apos;ll send them this question with its context, due in 14 days.
        {ranked.some((r) => r.person.vacant) && " Roles without a name stay as roles until you add people or import a people list."}
      </p>
      <ul className="mt-4 space-y-1.5" aria-label={`People at ${site.name}`}>
        {ranked.map(({ person, match }) => (
          <li key={person.id}>
            <button
              type="button"
              onClick={() => onSend(person.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-fg/60 hover:bg-surface-2",
                match === "best" ? "border-line-strong bg-surface" : "border-line",
              )}
            >
              {person.vacant ? (
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-faint" aria-hidden>
                  {(() => {
                    const I = ROLE_ICON[person.role]
                    return <I size={13} />
                  })()}
                </span>
              ) : (
                <Avatar name={person.name} />
              )}
              <span className="min-w-0 flex-1" title={person.note}>
                <span className="block text-sm font-medium">{person.vacant ? person.role : person.name}</span>
                <span className="flex items-center gap-1 truncate text-xs text-muted">
                  {!person.vacant &&
                    (() => {
                      const I = ROLE_ICON[person.role]
                      return <I size={11} className="shrink-0" aria-hidden />
                    })()}
                  {person.vacant
                    ? `${person.siteId ? site.name : "Group"} · name not on file yet`
                    : `${person.role}${person.siteId ? "" : " · group"}${person.email ? ` · ${person.email}` : ""}${person.note && !person.email ? " · named in the filed BRSR" : ""}`}
                </span>
              </span>
              {match === "best" && <span className="font-mono text-[10px] uppercase tracking-wider text-accent">Best fit</span>}
              <Send size={13} className="shrink-0 text-faint" />
            </button>
          </li>
        ))}
        {!ranked.length && <li className="text-sm text-muted">No one is listed for {site.name} yet.</li>}
      </ul>

      {adding ? (
        <form
          className="mt-4 space-y-2 rounded-lg border border-line p-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            const p = addStakeholder({ name, role, email, siteId: site.id })
            onSend(p.id)
          }}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserPlus size={14} /> Add someone at {site.name}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line-strong bg-bg px-2 text-sm text-fg" autoFocus />
            </label>
            <label className="text-xs text-muted">
              Role
              <select value={role} onChange={(e) => setRole(e.target.value as StakeholderRole)} className="mt-1 h-9 w-full rounded-md border border-line-strong bg-bg px-2 text-sm text-fg">
                {ALL_ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs text-muted">
            Email (optional)
            <span className="mt-1 flex items-center gap-2 rounded-md border border-line-strong bg-bg px-2">
              <Mail size={13} className="text-faint" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 w-full bg-transparent text-sm text-fg outline-none" />
            </span>
          </label>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" type="submit" disabled={!name.trim()}>
              Add and send
            </Button>
            {ranked.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
            <UserPlus size={13} /> Someone else
          </Button>
        </div>
      )}
      <button type="button" onClick={() => onSend(undefined)} className="mt-4 text-xs text-faint hover:text-muted">
        Don&apos;t know who — send it to the {roleInSentence(roles[0])} role
      </button>
    </motion.div>
  )
}

export function PeopleStrip({ siteId, siteName }: { siteId: string; siteName: string }) {
  const all = useStore((s) => s.stakeholders).filter((p) => p.siteId === siteId)
  const people = all.filter((p) => !p.vacant)
  const seats = all.length - people.length
  const tasks = useStore((s) => s.tasks).filter((t) => t.siteId === siteId && t.status === "open")
  if (!people.length)
    return (
      <p className="mt-2 text-xs text-faint">
        {seats ? `${seats} roles at ${siteName}, no names on file yet. Questions can still be routed to a role.` : `No people listed for ${siteName} yet. Add them when a question needs routing.`}
        {tasks.length ? ` ${tasks.length} question${tasks.length === 1 ? "" : "s"} waiting.` : ""}
      </p>
    )
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" aria-label={`People at ${siteName}`}>
      <div className="flex -space-x-1.5">
        {people.slice(0, 5).map((p) => (
          <span key={p.id} title={`${p.name}, ${p.role}`}>
            <Avatar name={p.name} className="bg-bg" />
          </span>
        ))}
      </div>
      <span className="text-xs text-muted">
        {people.length} {people.length === 1 ? "person" : "people"} at {siteName}
        {tasks.length ? ` · ${tasks.length} question${tasks.length === 1 ? "" : "s"} with them` : ""}
      </span>
    </div>
  )
}
