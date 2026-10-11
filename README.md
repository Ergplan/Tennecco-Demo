# jouleWise × Tenneco India: electricity, heat and ESG demo

An interactive Next.js demo for a first meeting with Tenneco India's sustainability leadership. Open it, type **tenneco**, and walk through nine steps with the arrow keys (or the bar at the bottom):

| # | Step | Route | What it shows |
|---|------|-------|---------------|
| 1 | Company | `/tenneco` | Tenneco India: the two listed companies, the 12 entities, businesses, FY2025-26 BRSR headline numbers |
| 2 | Map | `/tenneco/map` | esgOS-style discovery: public sources read one by one and each site flies onto the map; then the shareholding tree builds and every site drops under its owner; then pick a factory (Bengaluru) |
| 3 | Bengaluru | `/tenneco/bengaluru` | The plant today: power mix and renewable share, Scope 2, heat-pump candidates, what is already on the public record, what is still unknown, and two tracks |
| 4 | Electricity | `/tenneco/bengaluru/power` | Slider from 83% to 100% renewable: supply stack, cost against the plant's current plan, editable assumptions; below it, the public-domain routes, costs and Karnataka rules |
| 5 | Heat | `/tenneco/bengaluru/heat` | Heat pumps for the phosphating and plating lines: COP, cost of heat, saving, payback or Heat-as-a-Service, animated machine drawing |
| 6 | ergPLAN | `/tenneco/ergplan` | The factories around one dropbox: drop power-bill PDFs, a scanner reads them and ticks them off; then today's supply against the plan (DISCOM, solar, wind, exchange; % green and average purchase cost); then the group map with the saving and the path to 100% green |
| 7 | ergOS | `/tenneco/ergos` | The jouleWise energy platform with the group on it: the day by source, connect every factory, run baselining for the current renewable share, bills and meters |
| 8 | esgOS | `/tenneco/esgos` | The real esgOS app (vendored under `/esgos`) on Tenneco Clean Air India: org gate, footprint, boundary, connect, profile, gaps |
| 9 | Pilot | `/tenneco/pilot` | Pilot scope, key assumptions with owners, success criteria, deliverables, timeline, data request and engagement models |

esgOS is a copy of `Ergplan/esgOS` (demo branch) in `esgos/`, served from its own route group (`app/(esgos)`) with its own stylesheet. It adds a Tenneco client (`esgos/lib/clients/tenneco.ts`, `data/tenneco.json`), runs on FY 2026-27, keeps Federal-Mogul Goetze outside TCAIL's boundary, and stores its state under `esgos-tenneco-v1` in the browser.

## Sources

- **BRSR FY2025-26** for Tenneco Clean Air India (NSE: TENNIND) and Federal-Mogul Goetze (NSE: FMGOETZE), as parsed by the esgOS BRSR pipeline (`Ergplan/esgOS`, `data/brsr`). Values are in `lib/brsr.ts` with links to the NSE filings.
- **Entities**: the group's entity list (relationships and whether audited financials are published).
- **Factories**: Tenneco's India location list (13 factories in 9 states and Puducherry), with the name each factory carries there. Product lines and site ESG facts come from the TCAIL Red Herring Prospectus (Nov 2025) and the companies' filings. `lib/sites.ts` also has the Pune technical centre, the Kharkhoda plant under construction and the offices, which are not factories.
- **Bengaluru plant note** (shared by Tenneco): monthly units, PPA volume, the ₹6.96 green offer and the ₹5.00 DISCOM rate, and the heat pump feasibility table.
- **Green power facts** (`lib/knowledge.ts`): each item links to its public source. Ranges are indicative, not quotes.
- **Heat pump COP model and machine drawing**: adapted from jouleWise's Heat Pump Studio (`Ergplan/websiterepo`).
- **ergPLAN and ergOS**: Bengaluru from the plant note; renewable shares from the filed BRSRs where public; other plant loads, state tariffs and plan prices indicative until each plant's bills are read. Parsed-bill values in the demo are sample values.
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
