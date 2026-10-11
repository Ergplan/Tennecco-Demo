"use client"

import { motion } from "framer-motion"
import { Gauge, Landmark, Leaf, Scale } from "lucide-react"
import { Card, Eyebrow, Pill, SourceLinks } from "@/components/ui/kit"
import { cn } from "@/components/ui/cn"
import { COUNTING, EFFICIENCY, REFERENCE_PRICES, ROUTES, RULES } from "@/lib/knowledge"

const MAX = 7.5
const x = (v: number) => `${(v / MAX) * 100}%`

function RangeChart() {
  const landed = ROUTES.filter((r) => !r.premium)
  return (
    <div>
      <div className="relative">
        {landed.map((r, i) => (
          <div key={r.id} className="grid grid-cols-[150px_1fr] items-center gap-3 py-2 sm:grid-cols-[200px_1fr]">
            <span className="text-[13px] font-medium">{r.name}</span>
            <div className="relative h-7 rounded-md bg-surface-2">
              <motion.div
                className="absolute top-1 bottom-1 rounded"
                style={{ left: x(r.low), background: r.color }}
                initial={{ width: 0 }}
                animate={{ width: `max(8px, ${((r.high - r.low) / MAX) * 100}%)` }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.6 }}
              />
              <span className="tnum absolute top-1/2 -translate-y-1/2 pl-2 font-mono text-[11px] text-fg" style={{ left: x(r.high) }}>
                ₹{r.low.toFixed(2)}
                {r.high !== r.low && `–${r.high.toFixed(2)}`}
              </span>
            </div>
          </div>
        ))}
        {/* reference lines */}
        <div className="pointer-events-none absolute inset-y-0 left-[162px] right-0 sm:left-[212px]">
          {REFERENCE_PRICES.map((p, i) => (
            <div key={p.label} className="absolute inset-y-0 border-l border-dashed border-danger/60" style={{ left: x(p.value) }}>
              <span className="absolute -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1 font-mono text-[10px] text-danger" style={{ top: i === 1 ? -34 : -20 }}>
                ₹{p.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[150px_1fr] gap-3 sm:grid-cols-[200px_1fr]">
        <span />
        <div className="relative h-4 font-mono text-[10px] text-faint">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((v) => (
            <span key={v} className="absolute -translate-x-1/2" style={{ left: x(v) }}>
              ₹{v}
            </span>
          ))}
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px] text-muted">
        {REFERENCE_PRICES.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className="h-3 border-l border-dashed border-danger" />
            ₹{p.value.toFixed(2)} {p.label} <span className="text-faint">({p.note})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Public-domain routes to green power, Karnataka's rules and the accounting, shown under
// the electricity track so the options sit next to the plant's own numbers.
export function GreenPowerKnowledge() {
  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <Eyebrow>From the public record</Eyebrow>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          How a Karnataka plant buys green power, and what each route costs.
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Six routes, their landed cost against the prices offered to the plant, and the rules that apply in Bengaluru. Every fact links to its public source; ranges are indicative, not quotes.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow>Landed cost, ₹ per kWh</Eyebrow>
              <p className="mt-1 text-[13px] text-muted">Against the BESCOM tariff and the two prices offered to the Bengaluru plant</p>
            </div>
            <Pill tone="green">Cheapest: on-site and captive</Pill>
          </div>
          <div className="mt-10">
            <RangeChart />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {ROUTES.filter((r) => r.premium).map((r) => (
              <div key={r.id} className="rounded-xl border border-line p-3">
                <p className="flex items-center gap-2 text-[13px] font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                  {r.name}
                  <span className="tnum ml-auto font-mono text-[12px] text-fg">+₹{r.low < 0.1 ? r.low.toFixed(3) : r.low.toFixed(2)}/kWh</span>
                </p>
                <p className="mt-1 text-[12px] text-muted">{r.pros}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <Eyebrow className="flex items-center gap-2">
            <Landmark size={13} /> The rules, in order
          </Eyebrow>
          <ol className="mt-4 space-y-0">
            {RULES.map((r, i) => (
              <li key={r.title} className="relative flex gap-4 pb-4">
                {i < RULES.length - 1 && <span className="absolute left-[39px] top-6 bottom-0 w-px bg-line" />}
                <span className="w-[72px] shrink-0 pt-0.5 text-right font-mono text-[11px] text-faint">{r.date}</span>
                <span className={cn("relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-surface", r.tone === "karnataka" ? "bg-heat" : "bg-accent")} />
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-tight">
                    {r.title} {r.tone === "karnataka" && <Pill tone="heat">Karnataka</Pill>}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-snug text-muted">{r.text}</p>
                  <SourceLinks sources={[r.source]} className="mt-0.5" />
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ROUTES.map((r) => (
          <Card key={r.id} className="p-4">
            <p className="flex items-center gap-2 text-[14px] font-semibold">
              <span className="h-3 w-3 rounded-full" style={{ background: r.color }} />
              {r.name}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-fg">{r.how}</p>
            <p className="mt-2 text-[12px] leading-snug text-green">+ {r.pros}</p>
            <p className="mt-1 text-[12px] leading-snug text-amber">− {r.cons}</p>
            <SourceLinks sources={r.sources} className="mt-2" />
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <Eyebrow className="flex items-center gap-2">
            <Scale size={13} /> Counting it right
          </Eyebrow>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {COUNTING.map((c) => (
              <div key={c.title}>
                <p className="text-[13.5px] font-semibold">{c.title}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-muted">{c.text}</p>
                <SourceLinks sources={[c.source]} className="mt-1" />
              </div>
            ))}
          </div>
        </Card>
        <div className="min-w-0 space-y-4 xl:col-span-4">
          <Card>
            <Eyebrow className="flex items-center gap-2">
              <Gauge size={13} /> Efficiency first
            </Eyebrow>
            <p className="mt-2 text-[13px] leading-relaxed text-fg">{EFFICIENCY.text}</p>
            <SourceLinks sources={[EFFICIENCY.source]} className="mt-2" />
          </Card>
          <Card className="bg-green-soft/60">
            <Eyebrow className="flex items-center gap-2 text-green">
              <Leaf size={13} /> Already inside Tenneco
            </Eyebrow>
            <ul className="mt-2 space-y-1.5 text-[12.5px] leading-snug">
              <li>Chennai: over 90% solar and wind through a PPA</li>
              <li>Chakan: 920 kWp rooftop solar</li>
              <li>FMGIL Bengaluru: about 95% wheeled renewables; 23 MW solar availed</li>
              <li>FMGIL holds 26% of Real Captive Power: a captive vehicle exists</li>
              <li>TCAIL target: 50% renewable energy by 2030</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
