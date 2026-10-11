"use client"

// Company data for the year: figures from the audited financial statements and
// the purchase, CSR and payroll ledgers. They answer Section A (paid-up capital,
// CSR applicability), the BRSR Core ratios (days payable, MSME sourcing,
// well-being spend) and turn Section C quantities into intensities.

import { Building2, Check } from "lucide-react"
import { useMemo, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { ANNUAL_FIELDS, ANNUAL_GROUPS, csrApplicable, daysPayable, fmtSci, intensity, share, type AnnualField, type AnnualId } from "@/esgos/lib/collection/annual"
import { derivedTotals } from "@/esgos/lib/collection/calc"
import { Button, Eyebrow } from "../common/ui"
import { cn } from "../common/cn"

const fmt = (n: number, d = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: d })

export function AnnualView() {
  const { collection, sites: allSites, setAnnual, approveAnnual, group } = useStore()
  const annual = collection.annual ?? {}
  const sites = allSites.filter((s) => s.status === "confirmed")
  const closed = collection.months.filter((m) => collection.cycles[m]?.closedAt)
  const totals = useMemo(() => derivedTotals(collection, sites, closed), [collection, sites, closed])
  const entered = ANNUAL_FIELDS.filter((f) => annual[f.id])
  const submitted = entered.filter((f) => annual[f.id]!.status === "submitted")
  const required = ANNUAL_FIELDS.filter((f) => !f.optional)

  const csr = csrApplicable(annual)
  const dpo = daysPayable(annual)
  const msme = share(annual, "fin.msmePurchases", "fin.purchases")
  const india = share(annual, "fin.indiaPurchases", "fin.purchases")
  const wellbeing = share(annual, "fin.wellbeing", "fin.revenue")
  const rnd = share(annual, "fin.rndSustainable", "fin.rnd")
  const capex = share(annual, "fin.capexSustainable", "fin.capex")
  const intens = (
    [
      ["Energy (P6 E1)", totals.totalGJ, "GJ"],
      ["Scope 1 and 2 (P6 E7)", totals.scope1 + totals.scope2, "tCO2e"],
      ["Water withdrawal (P6 E3)", totals.waterWithdrawal, "kL"],
      ["Waste (P6 E9)", totals.waste, "t"],
    ] as [string, number, string][]
  ).map(([label, q, unit]) => ({ label, unit, i: intensity(q, annual, closed.length) }))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Eyebrow className="flex items-center gap-2">
            <Building2 size={13} /> Company data · {group.fiscalYear}
          </Eyebrow>
          <h2 className="mt-1 text-xl font-medium tracking-tight">From the audited financial statements</h2>
          <p className="mt-1 text-sm text-muted">
            One figure per item for the reporting entity, with the statement or ledger it comes from. Finance enters them; a reviewer approves them. They answer the Section A finance questions, the BRSR Core ratios, and every intensity per rupee of turnover.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-x-5 text-right">
          {[
            [`${entered.filter((f) => !f.optional).length}/${required.length}`, "required entered"],
            [`${entered.filter((f) => annual[f.id]!.status === "approved").length}`, "approved"],
            [`${submitted.length}`, "awaiting review"],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="text-2xl font-medium tracking-tight">{v}</div>
              <div className="text-[11px] text-muted">{l}</div>
            </div>
          ))}
        </div>
      </div>
      {submitted.length > 0 && (
        <Button className="mt-3" size="sm" onClick={() => approveAnnual(submitted.map((f) => f.id))}>
          <Check size={13} /> Approve {submitted.length} entered value{submitted.length === 1 ? "" : "s"}
        </Button>
      )}

      <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {ANNUAL_GROUPS.map((g) => (
            <section key={g}>
              <Eyebrow>{g}</Eyebrow>
              <div className="mt-2 divide-y divide-line rounded-xl border border-line">
                {ANNUAL_FIELDS.filter((f) => f.group === g).map((f) => (
                  <AnnualRow key={f.id} field={f} onSave={setAnnual} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-5 text-sm">
          <section className="rounded-xl border border-line p-4">
            <Eyebrow>What these figures answer</Eyebrow>
            <dl className="mt-3 space-y-3">
              <Result label="CSR applicability (A.24)" value={csr ? (csr.applicable ? "Applies" : "Does not apply") : undefined} detail={csr ? csr.tests.map((t) => t.text).join("; ") : "Needs turnover, net worth and net profit"} />
              <Result label="Days of accounts payable (P1 E8, Core)" value={dpo !== undefined ? `${fmt(dpo, 1)} days` : undefined} detail="Trade payables × 365 ÷ cost of goods and services procured" />
              <Result label="Input material from MSMEs (P8 E4, Core)" value={msme !== undefined ? `${fmt(msme, 1)}%` : undefined} detail={india !== undefined ? `Sourced within India: ${fmt(india, 1)}%` : "Of total purchases"} />
              <Result label="Well-being spend (P3 E1c, Core)" value={wellbeing !== undefined ? `${fmt(wellbeing, 2)}% of revenue` : undefined} detail="Spend on well-being ÷ revenue from operations" />
              <Result label="Sustainable R&D and capex (P2 E1)" value={capex !== undefined ? `Capex ${fmt(capex, 1)}%${rnd !== undefined ? ` · R&D ${fmt(rnd, 1)}%` : ""}` : undefined} detail="Share spent to improve environmental and social impacts" />
            </dl>
          </section>
          <section className="rounded-xl border border-line p-4">
            <Eyebrow>Intensity per rupee of turnover</Eyebrow>
            <p className="mt-1 text-xs text-faint">{closed.length ? `Collected values for ${closed.length} closed month${closed.length === 1 ? "" : "s"} ÷ revenue for the same period.` : "Close a month of collection first."}</p>
            <table className="mt-2 w-full text-xs">
              <tbody>
                {intens.map((x) => (
                  <tr key={x.label} className="border-b border-line last:border-0">
                    <td className="py-1.5 text-muted">{x.label}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {x.i ? (
                        <>
                          {fmt(x.i.perCrore, 2)} <span className="text-faint">{x.unit}/₹ cr</span>
                          <div className="text-[10px] text-faint">{fmtSci(x.i.perRupee)} per ₹{x.i.perPppDollar !== undefined ? ` · ${fmtSci(x.i.perPppDollar)} per PPP $` : ""}</div>
                        </>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-faint">{intens[0].i ? `Basis: ${intens[0].i.basis}.` : closed.length >= 12 ? "Enter revenue for the year." : "Until the year is closed, enter revenue for the same months from the management accounts."}</p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Result({ label, value, detail }: { label: string; value?: string; detail: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("text-base font-medium tabular-nums", !value && "text-faint")}>{value ?? "Not yet"}</dd>
      <dd className="text-[11px] text-faint">{detail}</dd>
    </div>
  )
}

function AnnualRow({ field: f, onSave }: { field: AnnualField; onSave: (id: AnnualId, p: { value: number; evidence?: string } | null) => void }) {
  const cur = useStore((s) => s.collection.annual?.[f.id])
  const [value, setValue] = useState(cur ? String(cur.value) : "")
  const [evidence, setEvidence] = useState(cur?.evidence ?? "")
  const num = Number(value.replace(/,/g, ""))
  const save = () => {
    if (!value.trim()) {
      if (cur) onSave(f.id, null)
      return
    }
    if (!Number.isFinite(num)) return
    if (cur && cur.value === num && (cur.evidence ?? "") === evidence) return
    onSave(f.id, { value: num, evidence: evidence || f.evidence })
  }
  return (
    <div className="px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-[12rem] flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {f.label}
            {f.optional && <span className="text-[10px] text-faint">optional</span>}
            {cur && <span className={cn("rounded px-1.5 text-[10px]", cur.status === "approved" ? "bg-accent/20 text-accent" : "bg-amber/20 text-amber")}>{cur.status === "approved" ? `approved${cur.approvedBy ? ` · ${cur.approvedBy.split(" (")[0]}` : ""}` : "awaiting review"}</span>}
          </div>
          <div className="text-[11px] text-faint">
            {f.owner} · feeds {f.brsr.join(", ")}
          </div>
        </div>
        <span className="flex items-center gap-1.5">
          <input aria-label={f.label} value={value} inputMode="decimal" onChange={(e) => setValue(e.target.value.replace(/[^\d.,-]/g, ""))} onBlur={save} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="h-8 w-32 rounded-md border border-line-strong bg-bg px-2 text-right text-sm text-fg tabular-nums outline-none focus:border-fg/60" />
          <span className="w-20 shrink-0 text-[10px] leading-tight text-faint">{f.unit}</span>
        </span>
        <input aria-label={`${f.label}: evidence`} value={evidence} placeholder={f.evidence} onChange={(e) => setEvidence(e.target.value)} onBlur={() => cur && save()} className="h-8 w-full rounded-md border border-line bg-bg px-2 text-xs text-fg outline-none placeholder:text-faint focus:border-fg/60 sm:w-64" />
      </div>
      {f.help && <p className="mt-1 text-[11px] text-faint">{f.help}</p>}
    </div>
  )
}

