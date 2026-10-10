export type Step = { id: string; href: string; label: string; short: string }

export const STEPS: Step[] = [
  { id: "overview", href: "/tenneco", label: "Tenneco in India", short: "Overview" },
  { id: "locations", href: "/tenneco/locations", label: "Locations", short: "Locations" },
  { id: "esg", href: "/tenneco/esg", label: "ESG by entity and site", short: "Site ESG" },
  { id: "green-power", href: "/tenneco/green-power", label: "Greening electricity", short: "Green power" },
  { id: "bengaluru-power", href: "/tenneco/bengaluru/power", label: "Bengaluru: 100% green power", short: "Bengaluru power" },
  { id: "bengaluru-heat", href: "/tenneco/bengaluru/heat", label: "Bengaluru: process heat", short: "Bengaluru heat" },
  { id: "platform", href: "/tenneco/platform", label: "One ESG platform", short: "ESG platform" },
  { id: "pilot", href: "/tenneco/pilot", label: "Proposed pilot", short: "Pilot" },
]

export const stepIndex = (pathname: string) => {
  const i = STEPS.findIndex((s) => s.href === pathname)
  return i < 0 ? 0 : i
}
