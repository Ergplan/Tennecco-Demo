export type Step = { id: string; href: string; label: string; short: string }

// Company → map → one factory → its two tracks → the group platforms → the pilot.
export const STEPS: Step[] = [
  { id: "company", href: "/tenneco", label: "Tenneco India", short: "Company" },
  { id: "map", href: "/tenneco/map", label: "Footprint and shareholding", short: "Map" },
  { id: "bengaluru", href: "/tenneco/bengaluru", label: "Bengaluru today", short: "Bengaluru" },
  { id: "electricity", href: "/tenneco/bengaluru/power", label: "Bengaluru · electricity track", short: "Electricity" },
  { id: "heat", href: "/tenneco/bengaluru/heat", label: "Bengaluru · heat track", short: "Heat" },
  { id: "ergplan", href: "/tenneco/ergplan", label: "ergPLAN · bills in, power plan out", short: "ergPLAN" },
  { id: "ergos", href: "/tenneco/ergos", label: "ergOS · the group on one platform", short: "ergOS" },
  { id: "esgos", href: "/tenneco/esgos", label: "esgOS · gap assessment", short: "esgOS" },
  { id: "pilot", href: "/tenneco/pilot", label: "Proposed pilot", short: "Pilot" },
]

export const stepIndex = (pathname: string) => {
  const i = STEPS.findIndex((s) => s.href === pathname)
  return i < 0 ? 0 : i
}
