// Organisation details captured at the gate: who is using esgOS and the key
// people who own BRSR answers. They fill the group-level stakeholder seats, so
// questions, gaps and plan requests are addressed to named people.

import type { Stakeholder, StakeholderRole } from "./types"

export type PersonEntry = { name: string; email?: string }

export type OrgDetails = {
  you: { name: string; designation: string; email: string; phone?: string; role: StakeholderRole }
  people: Partial<Record<StakeholderRole, PersonEntry>>
  savedAt: string
}

// Group roles asked for at the gate. The first three are required.
export const KEY_ROLES: { role: StakeholderRole; label: string; owns: string; required?: boolean }[] = [
  { role: "ESG lead", label: "ESG / sustainability lead", owns: "Runs the BRSR; materiality, targets, coverage", required: true },
  { role: "Finance controller", label: "CFO / finance head", owns: "Turnover, payables, assurance engagement", required: true },
  { role: "Company secretary", label: "Company secretary", owns: "Boundary, policies, board approval, filing", required: true },
  { role: "HR manager", label: "HR head", owns: "Headcount, wages, benefits, POSH" },
  { role: "EHS manager", label: "EHS head", owns: "Safety incidents, waste, permits" },
  { role: "Energy manager", label: "Energy / utilities head", owns: "Electricity, fuels, meters" },
  { role: "Procurement head", label: "Procurement head", owns: "MSME sourcing, Scope 3, suppliers" },
  { role: "IT / ERP owner", label: "IT / ERP owner", owns: "Read-only system connections" },
]

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())

export function orgErrors(org: Pick<OrgDetails, "you" | "people">): Record<string, string> {
  const e: Record<string, string> = {}
  if (!org.you.name.trim()) e["you.name"] = "Your name is needed"
  if (!org.you.designation.trim()) e["you.designation"] = "Your designation is needed"
  if (!isEmail(org.you.email)) e["you.email"] = "A work email is needed"
  for (const k of KEY_ROLES) {
    const p = org.people[k.role]
    if (k.required && !p?.name.trim()) e[`people.${k.role}`] = "Required"
    if (p?.email && p.email.trim() && !isEmail(p.email)) e[`people.${k.role}.email`] = "Check the email"
  }
  return e
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

// Put the named people into the group-level seats. An existing group seat for
// the role is updated in place (keeping its id, so routed questions follow).
export function applyOrg(stakeholders: Stakeholder[], org: OrgDetails | undefined): Stakeholder[] {
  if (!org) return stakeholders
  let out = [...stakeholders]
  for (const [role, p] of Object.entries(org.people) as [StakeholderRole, PersonEntry | undefined][]) {
    if (!p?.name.trim()) continue
    const you = p.name.trim() === org.you.name.trim()
    const person = {
      name: p.name.trim(),
      email: p.email?.trim() || (you ? org.you.email.trim() : undefined),
      vacant: false,
      note: you ? `${org.you.designation} · entered by you` : "Named at the organisation gate",
      source: "owner" as const,
    }
    const seat = out.find((x) => !x.siteId && x.role === role)
    if (seat) out = out.map((x) => (x.id === seat.id ? { ...x, ...person } : x))
    else out.push({ id: `sh-org-${slug(role)}`, role, ...person })
  }
  return out
}

// Gap and task owners are written as job titles ("CFO", "ESG committee").
// Map them to the role whose named person should receive the request.
const OWNER_ALIASES: [RegExp, StakeholderRole][] = [
  [/company secretary/i, "Company secretary"],
  [/\bcfo\b|finance/i, "Finance controller"],
  [/esg|sustainab/i, "ESG lead"],
  [/chro|\bhr\b|human resources/i, "HR manager"],
  [/procurement/i, "Procurement head"],
  [/\bit\b|erp/i, "IT / ERP owner"],
  [/ehs|safety/i, "EHS manager"],
  [/energy/i, "Energy manager"],
  [/plant head/i, "Plant head"],
  [/office admin/i, "Office admin"],
  [/maintenance/i, "Maintenance head"],
  [/quality/i, "Quality head"],
]

// The named person who should receive a request: the site's person for site
// gaps, the group person from the gate otherwise.
export function ownerPerson(owner: string, siteId: string | undefined, stakeholders: Stakeholder[]): Stakeholder | undefined {
  const role = roleForOwner(owner)
  if (!role) return undefined
  if (siteId) return stakeholders.find((x) => x.siteId === siteId && x.role === role && !x.vacant)
  return stakeholders.find((x) => !x.siteId && x.role === role && !x.vacant)
}

export function roleForOwner(owner: string): StakeholderRole | undefined {
  return OWNER_ALIASES.find(([re]) => re.test(owner))?.[1]
}

// The named group-level person for an owner title, if the gate recorded one.
export function groupPersonFor(owner: string, stakeholders: Stakeholder[]): Stakeholder | undefined {
  const role = roleForOwner(owner)
  if (!role) return undefined
  return stakeholders.find((x) => !x.siteId && x.role === role && !x.vacant)
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? ""
}
