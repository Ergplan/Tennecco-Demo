// Tenneco's Indian entities, as mapped from the group's filings (TCAIL RHP, Nov 2025;
// FMGIL annual filings). "Balance sheet" = audited financials published on
// tennecoindia.com/investor-relations/audited-financials.

export type EntityId =
  | "tcail"
  | "taipl"
  | "fmipl"
  | "fmbil"
  | "fmsil"
  | "fmgil"
  | "fmtpr"
  | "fmmp"
  | "motocare"
  | "fmps"
  | "tgs"
  | "tio"

export type Entity = {
  id: EntityId
  name: string
  short: string
  relationship: string
  balanceSheet: "Included" | "Not found publicly"
  listed?: string
  business: string
  group: "TCAIL group" | "Federal-Mogul Goetze group" | "Wider Tenneco group"
  color: string
  brsr?: "fmgil" | "tcail"
}

export const ENTITIES: Entity[] = [
  {
    id: "tcail",
    name: "Tenneco Clean Air India Limited",
    short: "TCAIL",
    relationship: "Main listed company",
    balanceSheet: "Included",
    listed: "NSE: TENNIND · listed 19 Nov 2025",
    business: "Clean Air & Powertrain Solutions: catalytic converters, mufflers, BS6 exhaust systems",
    group: "TCAIL group",
    color: "#0033a0",
    brsr: "tcail",
  },
  {
    id: "taipl",
    name: "Tenneco Automotive India Private Limited",
    short: "TAIPL",
    relationship: "100% subsidiary of TCAIL",
    balanceSheet: "Included",
    business: "Advanced Ride Technology: Monroe shock absorbers and struts",
    group: "TCAIL group",
    color: "#2aa8e0",
  },
  {
    id: "fmipl",
    name: "Federal-Mogul Ignition Products India Limited",
    short: "FM Ignition",
    relationship: "100% subsidiary of TCAIL",
    balanceSheet: "Included",
    business: "Ignition products (Champion spark plugs)",
    group: "TCAIL group",
    color: "#5b6fd6",
  },
  {
    id: "fmbil",
    name: "Federal-Mogul Bearings India Limited",
    short: "FM Bearings",
    relationship: "99.37% subsidiary of TCAIL",
    balanceSheet: "Included",
    business: "Engine bearings and bushes",
    group: "TCAIL group",
    color: "#7f56c2",
  },
  {
    id: "fmsil",
    name: "Federal-Mogul Sealings India Limited",
    short: "FM Sealings",
    relationship: "89.89% subsidiary of TCAIL",
    balanceSheet: "Included",
    business: "Gaskets and heat shields",
    group: "TCAIL group",
    color: "#b05cc4",
  },
  {
    id: "fmgil",
    name: "Federal-Mogul Goetze (India) Limited",
    short: "FMGIL",
    relationship: "Wider group / fellow subsidiary",
    balanceSheet: "Included",
    listed: "NSE: FMGOETZE · listed 1995",
    business: "Pistons, piston rings, pins, cylinder liners, valve seats and guides",
    group: "Federal-Mogul Goetze group",
    color: "#001d34",
    brsr: "fmgil",
  },
  {
    id: "fmtpr",
    name: "Federal-Mogul TPR (India) Limited",
    short: "FM TPR",
    relationship: "51% subsidiary of Goetze",
    balanceSheet: "Included",
    business: "Steel piston rings for passenger vehicles",
    group: "Federal-Mogul Goetze group",
    color: "#3d5a8a",
  },
  {
    id: "fmmp",
    name: "Federal-Mogul Motorparts (India) Limited",
    short: "FM Motorparts",
    relationship: "Wider group / promoter-group member",
    balanceSheet: "Not found publicly",
    business: "Aftermarket distribution",
    group: "Wider Tenneco group",
    color: "#7f8ea3",
  },
  {
    id: "motocare",
    name: "Motocare India Private Limited",
    short: "Motocare",
    relationship: "Wider group; transferred to Motorparts in March 2025",
    balanceSheet: "Not found publicly",
    business: "Aftermarket",
    group: "Wider Tenneco group",
    color: "#7f8ea3",
  },
  {
    id: "fmps",
    name: "Federal-Mogul Powertrain Solutions India Private Limited",
    short: "FM Powertrain Solutions",
    relationship: "Wider group / promoter-group member",
    balanceSheet: "Not found publicly",
    business: "Manufacturing at Bhiwadi, Rajasthan (FM PT Solutions)",
    group: "Wider Tenneco group",
    color: "#0e9aa7",
  },
  {
    id: "tgs",
    name: "Tenneco Global Services Private Limited",
    short: "Tenneco Global Services",
    relationship: "Wider group / promoter-group member",
    balanceSheet: "Not found publicly",
    business: "IT and shared services (incorporated 2025)",
    group: "Wider Tenneco group",
    color: "#7f8ea3",
  },
  {
    id: "tio",
    name: "Tenneco India Operations Private Limited",
    short: "Tenneco India Operations",
    relationship: "Wider group / promoter-group member",
    balanceSheet: "Not found publicly",
    business: "Not disclosed",
    group: "Wider Tenneco group",
    color: "#7f8ea3",
  },
]

export const entityById = (id: EntityId) => ENTITIES.find((e) => e.id === id)!
