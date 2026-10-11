// Who would know? Maps each question to the roles that usually hold the answer,
// so "Not sure" becomes a request to a named person instead of a dead end.

import type { Question } from "./questionEngine"
import type { Stakeholder, StakeholderRole } from "./types"

export const ALL_ROLES: StakeholderRole[] = [
  "Plant head",
  "EHS manager",
  "HR manager",
  "Energy manager",
  "Maintenance head",
  "Finance controller",
  "Procurement head",
  "Company secretary",
  "ESG lead",
  "Office admin",
  "IT / ERP owner",
  "Quality head",
]

const BY_CATEGORY: Record<Question["category"], StakeholderRole[]> = {
  operations: ["Plant head", "Finance controller", "Quality head"],
  heat: ["Energy manager", "Maintenance head", "Plant head", "Procurement head"],
  water: ["EHS manager", "Plant head", "Maintenance head"],
  waste: ["EHS manager", "Plant head"],
  refrigerants: ["Maintenance head", "Energy manager", "Plant head"],
  people: ["HR manager", "Plant head"],
  safety: ["EHS manager", "Plant head"],
  permits: ["EHS manager", "Company secretary", "Plant head"],
}

export function rolesForQuestion(q: Question): StakeholderRole[] {
  const office = q.appliesTo.length === 1 && q.appliesTo[0] === "office"
  const base: StakeholderRole[] = office ? ["Office admin", "Finance controller", "IT / ERP owner"] : BY_CATEGORY[q.category]
  const owner = (ALL_ROLES as string[]).includes(q.ownerRole) ? [q.ownerRole as StakeholderRole] : []
  return [...new Set([...owner, ...base])]
}

export type RankedPerson = { person: Stakeholder; match: "best" | "related" | "other" }

// People at the site first (best role match on top), then group-level people.
export function peopleFor(q: Question, siteId: string, all: Stakeholder[]): RankedPerson[] {
  const roles = rolesForQuestion(q)
  const rank = (p: Stakeholder) => {
    const i = roles.indexOf(p.role)
    return i === -1 ? 99 : i
  }
  const here = all.filter((p) => p.siteId === siteId).sort((a, b) => rank(a) - rank(b))
  const group = all.filter((p) => !p.siteId).sort((a, b) => rank(a) - rank(b))
  return [...here, ...group].map((person) => ({
    person,
    match: rank(person) === 0 ? "best" : rank(person) < 99 ? "related" : "other",
  }))
}

// "EHS manager" stays, "Energy manager" → "energy manager": for use mid-sentence.
export function roleInSentence(role: string) {
  return role
    .split(" ")
    .map((w) => (/^[A-Z]{2,}$/.test(w) ? w : w.toLowerCase()))
    .join(" ")
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
}

// "Meera Nair, EHS manager", or just "EHS manager, Khandala" for a vacant seat.
export function personLabel(p: Pick<Stakeholder, "name" | "role" | "vacant">) {
  return p.vacant ? p.name : `${p.name}, ${p.role}`
}
