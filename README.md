# jouleWise × Tenneco India: electricity, heat and ESG demo

An interactive Next.js demo for a first meeting with Tenneco India's sustainability leadership. Open it, type **tenneco**, and walk through eight steps with the arrow keys (or the bar at the bottom):

| # | Step | Route | What it shows |
|---|------|-------|---------------|
| 1 | Overview | `/tenneco` | Map of India with every Tenneco plant, R&D centre and office; group structure of the 12 Indian entities; FY2025-26 BRSR headline numbers for the two listed companies |
| 2 | Locations | `/tenneco/locations` | Interactive map with entity filters; site cards with product, address, public ESG facts and sources; Bengaluru first |
| 3 | Site ESG | `/tenneco/esg` | Bengaluru case at the top (power mix and heat feasibility from the plant note); filed BRSR metrics for FMGIL and TCAIL with year-on-year change; what is public for each plant; data-coverage matrix |
| 4 | Green power | `/tenneco/green-power` | Public-domain routes to renewable electricity with landed-cost ranges, Karnataka's rules timeline (GEOA Rules, the High Court ruling, KERC OA Regulations 2025), Scope 2 accounting, efficiency first |
| 5 | Bengaluru power | `/tenneco/bengaluru/power` | One slider from today's 83% to 100% renewable: supply stack, annual cost, Scope 2, against the plant's current plan; jouleWise route versus the offered route; editable assumptions |
| 6 | Bengaluru heat | `/tenneco/bengaluru/heat` | Heat pumps for the three surface-treatment lines: sliders for source and bath temperature, duty, hours, incumbent heating; COP, cost of heat, saving, payback or Heat-as-a-Service; animated machine drawing; all-lines table. Uses the tariff and green share set on step 5 |
| 7 | ESG platform | `/tenneco/platform` | esgOS: one bill inbox (sample bills, plus drag-and-drop), extraction and mapping to entity / plant / indicator, checks, a locked FY2025-26 baseline for Bengaluru, and the BRSR Core roll-up |
| 8 | Pilot | `/tenneco/pilot` | Pilot scope, key assumptions with owners, success criteria, deliverables, timeline, data request and engagement models |

## Sources

- **BRSR FY2025-26** for Tenneco Clean Air India (NSE: TENNIND) and Federal-Mogul Goetze (NSE: FMGOETZE), as parsed by the esgOS BRSR pipeline (`Ergplan/esgOS`, `data/brsr`). Values are in `lib/brsr.ts` with links to the NSE filings.
- **Entities**: the group's entity list (relationships and whether audited financials are published).
- **Plants**: TCAIL Red Herring Prospectus (Nov 2025: 12 plants, 7 states + 1 UT), FMGIL filings and news. Each site in `lib/sites.ts` carries its source and a confidence level; FM TPR's location is assumed co-located with FMGIL Bengaluru.
- **Bengaluru plant note** (shared by Tenneco): monthly units, PPA volume, the ₹6.96 green offer and the ₹5.00 DISCOM rate, and the heat pump feasibility table.
- **Green power facts** (`lib/knowledge.ts`): each item links to its public source. Ranges are indicative, not quotes.
- **Heat pump COP model and machine drawing**: adapted from jouleWise's Heat Pump Studio (`Ergplan/websiterepo`).
- **India map**: the esgOS outline (Natural Earth, public domain) and projection (`lib/indiaPath.ts`, `lib/geo.ts`).

Values the plant has not shared yet (PPA tariff, rooftop size, line heat duties, current heating method) are placeholders. They are marked on screen and listed as pilot assumptions.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (all routes static)
npm run typecheck
```

## Deploy on Vercel

Import the repository in Vercel. The framework preset (Next.js) and the default build settings work as is. No environment variables are needed.
