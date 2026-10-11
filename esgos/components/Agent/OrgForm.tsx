"use client"

// The organisation gate: who is using esgOS and the key people who own BRSR
// answers. Required before the journey starts; editable later from the menu.

import { motion } from "framer-motion"
import { ArrowRight, Building2, CircleUserRound, FileText, Lock, Mail, UsersRound } from "lucide-react"
import { useMemo, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { getClient } from "@/esgos/lib/clients"
import { getMode } from "@/esgos/lib/mode"
import { KEY_ROLES, orgErrors, type OrgDetails, type PersonEntry } from "@/esgos/lib/org"
import { ALL_ROLES } from "@/esgos/lib/stakeholders"
import type { StakeholderRole } from "@/esgos/lib/types"
import { Button, Eyebrow } from "../common/ui"
import { ROLE_ICON, SECTOR_ICON } from "../common/icons"
import { cn } from "../common/cn"

const field = "h-10 w-full rounded-md border bg-bg px-3 text-sm text-fg outline-none placeholder:text-faint focus:border-fg/60"

function initialDraft(): Pick<OrgDetails, "you" | "people"> {
  const s = useStore.getState()
  const client = getClient()
  const saved = s.orgByClient?.[client.id]
  if (saved) return { you: { ...saved.you }, people: { ...saved.people } }
  // Start from the people already on file: the sample's people, or the BRSR contact a filing names.
  const people: Partial<Record<StakeholderRole, PersonEntry>> = {}
  for (const k of KEY_ROLES) {
    const p = s.stakeholders.find((x) => !x.siteId && x.role === k.role && !x.vacant)
    if (p) people[k.role] = { name: p.name, email: p.email ?? "" }
  }
  const sampleYou = client.kind === "sample" && getMode().demo ? s.stakeholders.find((x) => !x.siteId && x.role === "ESG lead") : undefined
  return {
    you: { name: sampleYou?.name ?? "", designation: sampleYou ? "Group ESG lead" : "", email: sampleYou?.email ?? "", phone: "", role: "ESG lead" },
    people,
  }
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-muted">
      <span>
        {label}
        {required && <span className="text-amber"> *</span>}
      </span>
      <span className="mt-1 block">{children}</span>
      {error && <span className="mt-1 block text-[11px] text-amber">{error}</span>}
    </label>
  )
}

export function OrgForm({ onSaved, onCancel, compact }: { onSaved: () => void; onCancel?: () => void; compact?: boolean }) {
  const saveOrg = useStore((s) => s.saveOrg)
  const client = getClient()
  const SectorIcon = SECTOR_ICON[client.sector]
  const [draft, setDraft] = useState(initialDraft)
  const [tried, setTried] = useState(false)
  const youKey = KEY_ROLES.some((k) => k.role === draft.you.role)

  // Your own row mirrors what you type under "You".
  const people = useMemo(() => {
    const out = { ...draft.people }
    if (youKey) out[draft.you.role] = { name: draft.you.name, email: draft.you.email }
    return out
  }, [draft, youKey])
  const errors = orgErrors({ you: draft.you, people })
  const shown = tried ? errors : {}
  const missing = Object.keys(errors).length

  const setYou = (p: Partial<OrgDetails["you"]>) => setDraft((d) => ({ ...d, you: { ...d.you, ...p } }))
  const setPerson = (role: StakeholderRole, p: Partial<PersonEntry>) =>
    setDraft((d) => ({ ...d, people: { ...d.people, [role]: { name: "", ...d.people[role], ...p } } }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (missing) return
    saveOrg({ you: { ...draft.you, name: draft.you.name.trim(), designation: draft.you.designation.trim(), email: draft.you.email.trim() }, people, savedAt: new Date().toISOString() })
    onSaved()
  }

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <div className={cn("grid gap-4", !compact && "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]")}>
        <div className="space-y-4">
          <section className="rounded-lg border border-line bg-surface/60 p-4" aria-label="Organisation">
            <Eyebrow className="flex items-center gap-2">
              <Building2 size={13} /> Organisation
            </Eyebrow>
            <div className="mt-3 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface-2">
                <SectorIcon size={16} />
              </span>
              <div className="min-w-0 text-sm">
                <div className="font-medium">{client.legalName}</div>
                <div className="text-xs text-muted">
                  {[client.listed && `${client.listed.exchange}: ${client.listed.symbol}`, client.cin && `CIN ${client.cin}`].filter(Boolean).join(" · ")}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <FileText size={12} /> Reporting {client.group.fiscalYear}
                  {client.lastBrsr && ` · last BRSR filed ${client.lastBrsr.fy}`}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface/60 p-4" aria-label="Your details">
            <Eyebrow className="flex items-center gap-2">
              <CircleUserRound size={13} /> You
            </Eyebrow>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Full name" required error={shown["you.name"]}>
                <input className={cn(field, shown["you.name"] ? "border-amber/60" : "border-line-strong")} value={draft.you.name} onChange={(e) => setYou({ name: e.target.value })} autoComplete="name" autoFocus={!compact} />
              </Field>
              <Field label="Designation" required error={shown["you.designation"]}>
                <input className={cn(field, shown["you.designation"] ? "border-amber/60" : "border-line-strong")} value={draft.you.designation} onChange={(e) => setYou({ designation: e.target.value })} placeholder="e.g. Head of Sustainability" autoComplete="organization-title" />
              </Field>
              <Field label="Work email" required error={shown["you.email"]}>
                <input type="email" className={cn(field, shown["you.email"] ? "border-amber/60" : "border-line-strong")} value={draft.you.email} onChange={(e) => setYou({ email: e.target.value })} autoComplete="email" />
              </Field>
              <Field label="Phone">
                <input type="tel" className={cn(field, "border-line-strong")} value={draft.you.phone ?? ""} onChange={(e) => setYou({ phone: e.target.value })} autoComplete="tel" />
              </Field>
              <div className="col-span-2">
                <Field label="Your role in this BRSR">
                  <select className={cn(field, "border-line-strong")} value={draft.you.role} onChange={(e) => setYou({ role: e.target.value as StakeholderRole })}>
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {KEY_ROLES.find((k) => k.role === r)?.label ?? r}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-line bg-surface/60 p-4" aria-label="Key people">
          <div className="flex items-baseline justify-between gap-3">
            <Eyebrow className="flex items-center gap-2">
              <UsersRound size={13} /> Key people
            </Eyebrow>
            <span className="text-[11px] text-faint">
              <span className="text-amber">*</span> needed to start
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">Questions, gaps and requests go to these people by name. Plant contacts come later, per site.</p>
          <ul className="mt-3 divide-y divide-line">
            {KEY_ROLES.map((k) => {
              const Icon = ROLE_ICON[k.role]
              const isYou = youKey && k.role === draft.you.role
              const p = people[k.role]
              const err = shown[`people.${k.role}`]
              const emailErr = shown[`people.${k.role}.email`]
              return (
                <li key={k.role} className="grid grid-cols-1 gap-2 py-2.5 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-muted">
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {k.label}
                        {k.required && <span className="text-amber"> *</span>}
                      </span>
                      <span className="block text-[11px] leading-snug text-faint">{k.owns}</span>
                    </span>
                  </div>
                  <label className="block">
                    <span className="sr-only">{k.label} name</span>
                    <input
                      className={cn(field, "h-9", err ? "border-amber/60" : "border-line-strong", isYou && "text-muted")}
                      value={p?.name ?? ""}
                      onChange={(e) => setPerson(k.role, { name: e.target.value })}
                      placeholder={isYou ? "You" : "Name"}
                      disabled={isYou}
                      aria-invalid={!!err}
                    />
                  </label>
                  <label className="flex items-center gap-2 rounded-md border bg-bg px-2.5 focus-within:border-fg/60 sm:h-9" style={{ borderColor: emailErr ? "color-mix(in oklab, var(--amber) 60%, transparent)" : "var(--line-strong)" }}>
                    <Mail size={13} className="shrink-0 text-faint" />
                    <span className="sr-only">{k.label} email</span>
                    <input
                      type="email"
                      className={cn("h-9 w-full bg-transparent text-sm outline-none placeholder:text-faint", isYou && "text-muted")}
                      value={p?.email ?? ""}
                      onChange={(e) => setPerson(k.role, { email: e.target.value })}
                      placeholder="Email (optional)"
                      disabled={isYou}
                    />
                  </label>
                  {isYou && <span className="text-[11px] text-accent sm:col-start-2">That&apos;s you</span>}
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size={compact ? "md" : "lg"}>
          {onCancel ? "Save details" : "Save and continue"} <ArrowRight size={16} />
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {tried && missing > 0 && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-amber" role="status">
            {missing} field{missing === 1 ? "" : "s"} still needed
          </motion.span>
        )}
        <span className="flex items-center gap-1.5 text-xs text-faint">
          <Lock size={12} /> Kept in this browser. Change it any time from the menu.
        </span>
      </div>
    </form>
  )
}
