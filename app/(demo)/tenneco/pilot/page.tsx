"use client"

import { CalendarRange, CheckCircle2, ClipboardList, FileCheck2, Flame, Handshake, LineChart, Target, Zap } from "lucide-react"
import { useDemo } from "@/components/shell/DemoState"
import { Card, Eyebrow, PageHead, Pill } from "@/components/ui/kit"
import { cn } from "@/components/ui/cn"
import { plantPlan, scenario } from "@/lib/power"

const SCOPE = [
  {
    icon: Zap,
    tone: "text-green bg-green-soft",
    title: "Electricity",
    items: [
      "Confirm whether the existing PPA's renewable attributes reach Tenneco",
      "Roof survey and RESCO proposal for rooftop solar",
      "Costed route to 100% renewable power, compared with the ₹6.96 green offer",
    ],
  },
  {
    icon: Flame,
    tone: "text-heat bg-heat-soft",
    title: "Heat",
    items: [
      "Detailed feasibility and sizing for piston phosphating and ring plating / phosphating",
      "Economics check for steel ring phosphating (higher temperature, higher capex)",
      "Capex and Heat-as-a-Service offers for the chosen line",
    ],
  },
  {
    icon: LineChart,
    tone: "text-accent bg-accent-soft",
    title: "Data and ESG",
    items: [
      "esgOS workspace for the plant: 12 months of bills, fuel and production",
      "Locked FY2025-26 baseline the pilot is measured against",
      "BRSR Core energy and GHG figures for the plant, with their audit trail",
    ],
  },
]

const ASSUMPTIONS: { a: string; v: string; src: string; owner: "Tenneco" | "jouleWise" | "Joint" }[] = [
  { a: "Monthly consumption and mix", v: "33 lakh kWh: 27.5 PPA, 2.8 green offer, 2.7 DISCOM", src: "Plant note (ballpark)", owner: "Tenneco" },
  { a: "PPA tariff and renewable attributes", v: "Tariff unknown; attributes unverified", src: "PPA contract, wheeling statements", owner: "Tenneco" },
  { a: "DISCOM rate for the balance", v: "₹5.00/kWh as agreed with BESCOM", src: "Plant note", owner: "Tenneco" },
  { a: "Rooftop solar potential", v: "1.0 MWp placeholder; ≈1,450 kWh/kWp/yr", src: "Roof survey", owner: "jouleWise" },
  { a: "Group-captive landed price", v: "≈₹4.80/kWh incl. wheeling and 8% banking", src: "Developer quotes; KERC OA Regulations 2025", owner: "jouleWise" },
  { a: "Grid emission factor", v: "0.710 tCO₂/MWh", src: "CEA v21 (FY2024-25)", owner: "Joint" },
  { a: "Bath temperatures and heat duty per line", v: "65–95 °C; duties to be measured", src: "Line data, heater ratings, meters", owner: "Tenneco" },
  { a: "Current heating method and energy", v: "Assumed electric; confirm per line", src: "Line energy meters / fuel invoices", owner: "Tenneco" },
  { a: "Waste heat available", v: "Compressor cooling water ≈40 °C", src: "Utility flows and temperatures", owner: "Joint" },
  { a: "Operating hours", v: "≈6,000 h/yr", src: "Production plan", owner: "Tenneco" },
]

const DATA_REQUEST = [
  "12 months of BESCOM HT bills",
  "PPA contract and monthly wheeling / banking statements, with any REC or attribute clause",
  "Terms of the 2.8 lakh-unit green offer at ₹6.96",
  "Roof drawings or areas, and structural notes",
  "For each phosphating / plating line: bath volumes, set temperatures, heater ratings, operating hours, energy meters",
  "Compressor and chiller cooling-water flows and temperatures",
  "Monthly production (tonnes or pieces) for normalisation",
  "PNG / LPG / diesel invoices for 12 months",
]

const TIMELINE = [
  { w: "Week 0", t: "Kick-off", d: "Agree scope, assumptions and success criteria with the core team; data request out" },
  { w: "Weeks 1–3", t: "Data in, baseline locked", d: "Bills and meter data into esgOS; FY2025-26 baseline reviewed with plant finance" },
  { w: "Weeks 2–6", t: "Site work", d: "Roof survey, line measurements, waste-heat survey, PPA review" },
  { w: "Weeks 6–8", t: "Offers and decision pack", d: "Costed green-power route, heat pump offers (capex and service), results against the success criteria" },
]

const MODELS = [
  { t: "Pilot study", d: "A fixed scope and fee for the eight weeks, credited against implementation" },
  { t: "Heat-as-a-Service", d: "No capex: jouleWise funds, installs and runs the heat pump; Tenneco pays per kWh of heat, below today's cost" },
  { t: "Capex with guarantee", d: "Tenneco owns the machine; jouleWise guarantees the COP and the saving" },
  { t: "Power procurement", d: "Rooftop on RESCO (pay per unit); captive or open-access contracting, with fees linked to the saving delivered" },
]

export default function Pilot() {
  const { assumptions } = useDemo()
  const plan = plantPlan(assumptions)
  const full = scenario("joulewise", 1, assumptions)
  const delta = plan.annualCost - full.annualCost

  const CRITERIA = [
    { k: "Power", t: `A contractable route to 100% renewable electricity at or below the plant's current plan (today's model: ${delta >= 0 ? "₹" + (delta / 1e5).toFixed(0) + " lakh/yr below" : "within ₹" + (-delta / 1e5).toFixed(0) + " lakh/yr"}), signed off by plant finance` },
    { k: "Evidence", t: "A certificate trail agreed for the PPA, so its units count as zero in market-based Scope 2" },
    { k: "Heat", t: "For the chosen line: COP of at least 3 at design point, and either payback within 3 years or a service saving of at least 15%" },
    { k: "Data", t: "12 months of bills in esgOS, at least 95% of kWh from readings, reconciled to BESCOM within ±2%" },
    { k: "Decision", t: "A go / no-go on scale-up to the next plants, with the same method and numbers" },
  ]

  const DELIVERABLES = [
    { icon: Zap, t: "Green power roadmap", d: "Rooftop proposal, captive / open-access options, cost against the ₹6.96 offer, certificate plan" },
    { icon: Flame, t: "Heat pump feasibility", d: "Sizing, concept layout, energy model, capex and Heat-as-a-Service offers" },
    { icon: LineChart, t: "Baseline and BRSR extract", d: "Locked FY2025-26 baseline in esgOS; BRSR Core energy and GHG for the plant" },
    { icon: FileCheck2, t: "Decision pack", d: "Results against each success criterion; a scale-up plan for the core team" },
  ]

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Proposed pilot · for alignment with the core team"
        title={
          <>
            Start with one plant. <span className="text-accent">Decide on evidence.</span>
          </>
        }
        lede="Before any wider commitment: one pilot at the Bengaluru plant to test technical feasibility and commercial viability, against scope, assumptions, success criteria and deliverables agreed up front."
        right={<Pill tone="blue">FMGIL Bengaluru · 8 weeks from data</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {SCOPE.map((s) => (
          <Card key={s.title}>
            <div className="flex items-center gap-3">
              <span className={cn("grid h-9 w-9 place-items-center rounded-xl", s.tone)}>
                <s.icon size={18} />
              </span>
              <p className="text-[15px] font-semibold">Scope · {s.title}</p>
            </div>
            <ul className="mt-3 space-y-2">
              {s.items.map((i) => (
                <li key={i} className="flex gap-2 text-[13px] leading-snug">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-faint" />
                  {i}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="p-0 xl:col-span-7">
          <div className="flex items-center gap-2 border-b border-line px-5 py-3">
            <ClipboardList size={16} className="text-accent" />
            <p className="text-[14px] font-semibold">Key assumptions to agree</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[12.5px]">
              <thead className="text-left text-[11px] text-faint">
                <tr>
                  <th className="px-5 py-2 font-medium">Assumption</th>
                  <th className="px-3 py-2 font-medium">Working value</th>
                  <th className="px-3 py-2 font-medium">Confirmed from</th>
                  <th className="px-5 py-2 font-medium">Owner</th>
                </tr>
              </thead>
              <tbody>
                {ASSUMPTIONS.map((r) => (
                  <tr key={r.a} className="border-t border-line align-top">
                    <td className="px-5 py-2.5 font-medium">{r.a}</td>
                    <td className="px-3 py-2.5 text-muted">{r.v}</td>
                    <td className="px-3 py-2.5 text-muted">{r.src}</td>
                    <td className="px-5 py-2.5">
                      <Pill tone={r.owner === "Tenneco" ? "blue" : r.owner === "jouleWise" ? "green" : "grey"}>{r.owner}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <Eyebrow className="flex items-center gap-2">
            <Target size={13} /> Success criteria
          </Eyebrow>
          <ul className="mt-3 space-y-3">
            {CRITERIA.map((c, i) => (
              <li key={c.k} className="flex gap-3">
                <span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent font-mono text-[11px] font-semibold text-white">{i + 1}</span>
                <p className="text-[13px] leading-snug">
                  <b>{c.k}.</b> {c.t}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {DELIVERABLES.map((d) => (
          <Card key={d.t}>
            <d.icon size={18} className="text-accent" />
            <p className="mt-2 text-[14.5px] font-semibold">{d.t}</p>
            <p className="mt-1 text-[12.5px] leading-snug text-muted">{d.d}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <Eyebrow className="flex items-center gap-2">
            <CalendarRange size={13} /> Timeline
          </Eyebrow>
          <ol className="mt-4 grid gap-3 sm:grid-cols-4">
            {TIMELINE.map((t, i) => (
              <li key={t.w} className="relative rounded-xl border border-line p-3">
                <span className="font-mono text-[11px] text-accent">{t.w}</span>
                <p className="mt-1 text-[13.5px] font-semibold leading-tight">{t.t}</p>
                <p className="mt-1 text-[12px] leading-snug text-muted">{t.d}</p>
                {i < TIMELINE.length - 1 && <span className="absolute -right-2 top-1/2 hidden h-px w-3 bg-line-strong sm:block" />}
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <p className="text-[13px] font-semibold">Data we need from the plant</p>
            <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {DATA_REQUEST.map((d) => (
                <li key={d} className="flex gap-2 text-[12.5px] leading-snug text-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <Eyebrow className="flex items-center gap-2">
            <Handshake size={13} /> Ways to work together
          </Eyebrow>
          <ul className="mt-3 space-y-3">
            {MODELS.map((m) => (
              <li key={m.t} className="rounded-xl border border-line p-3">
                <p className="text-[13.5px] font-semibold">{m.t}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{m.d}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-brand-deep p-4 text-white">
            <p className="text-[13.5px] font-semibold">After the pilot</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-white/75">
              If the criteria are met, the same playbook goes to the next plants: Chennai (over 90% PPA) and Chakan (rooftop solar) bring their evidence into the same platform,
              the ride-control plants are worth screening for washing and paint-shop heat, and Kharkhoda can be designed green from day one.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
