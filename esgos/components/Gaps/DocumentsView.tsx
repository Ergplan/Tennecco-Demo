"use client"

// Desktop document review (Phase 1A): every document the assessment asks for,
// corporate and per plant, with what to look for, the BRSR questions it evidences,
// and the reviewer's outcome and notes. Outcomes feed BRSR readiness.

import { motion } from "framer-motion"
import { ChevronDown, Factory, FileSearch } from "lucide-react"
import { useMemo, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { AREAS, CATEGORY_LABEL, OUTCOME_LABEL, coverage, reviewRows, type DocCategory, type Outcome, type ReviewRow } from "@/esgos/lib/documents/review"
import { Eyebrow } from "../common/ui"
import { cn } from "../common/cn"

const OUTCOME_STYLE: Record<Outcome, string> = {
  adequate: "border-accent bg-accent/12 text-accent",
  partial: "border-amber bg-amber/12 text-amber",
  inadequate: "border-hue-gaps bg-hue-gaps/12 text-hue-gaps",
  missing: "border-line-strong bg-surface-2 text-muted",
}
const OUTCOME_DOT: Record<Outcome, string> = { adequate: "bg-accent", partial: "bg-amber", inadequate: "bg-hue-gaps", missing: "bg-grey" }
const CATEGORIES = Object.keys(CATEGORY_LABEL) as DocCategory[]

function Row({ row, open, onToggle, files }: { row: ReviewRow; open: boolean; onToggle: () => void; files: string[] }) {
  const reviewDocument = useStore((s) => s.reviewDocument)
  const r = row.review
  const [notes, setNotes] = useState(r?.notes ?? "")
  const [file, setFile] = useState(r?.file ?? "")
  const label = `${row.doc.title}${row.site ? ` · ${row.site.name}` : ""}`
  return (
    <li className={cn("rounded-lg border", open ? "border-line-strong bg-surface" : "border-line bg-surface/40")}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-label={label} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", r?.outcome ? OUTCOME_DOT[r.outcome] : "border border-dashed border-grey")} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">
            {row.doc.title}
            {row.site && <span className="text-muted"> · {row.site.name}</span>}
          </span>
          {r?.outcome && <span className="block truncate text-xs text-muted">{[OUTCOME_LABEL[r.outcome], r.file, r.notes].filter(Boolean).join(" · ")}</span>}
        </span>
        <span className="hidden shrink-0 gap-1 sm:flex">
          {row.doc.refs.slice(0, 4).map((x) => (
            <span key={x} className="rounded border border-line px-1.5 py-px font-mono text-[10px] text-faint">
              {x}
            </span>
          ))}
          {row.doc.refs.length > 4 && <span className="text-[10px] text-faint">+{row.doc.refs.length - 4}</span>}
        </span>
        <span className="hidden w-32 shrink-0 truncate text-right text-xs text-muted lg:inline">{row.doc.owner}</span>
        <ChevronDown size={14} className={cn("shrink-0 text-faint transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-4 py-4 text-sm">
          <p className="text-muted">
            <span className="text-fg">Look for:</span> {row.doc.lookFor}
          </p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Review outcome">
            {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={r?.outcome === o}
                onClick={() => reviewDocument(row.key, { outcome: o, file: file || undefined, notes: notes || undefined })}
                className={cn("rounded-md border px-2.5 py-1 text-xs transition-colors", r?.outcome === o ? OUTCOME_STYLE[o] : "border-line text-muted hover:text-fg")}
              >
                {OUTCOME_LABEL[o]}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={file}
              onChange={(e) => setFile(e.target.value)}
              onBlur={() => file !== (r?.file ?? "") && reviewDocument(row.key, { file })}
              list="doc-review-files"
              placeholder="Document reviewed (file name or vault document)"
              aria-label="Document reviewed"
              className="h-9 rounded-md border border-line-strong bg-bg px-2.5 text-xs outline-none placeholder:text-faint focus:border-fg/60"
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== (r?.notes ?? "") && reviewDocument(row.key, { notes })}
              placeholder="Review notes: what is missing, dates, approvals"
              aria-label="Review notes"
              className="h-9 rounded-md border border-line-strong bg-bg px-2.5 text-xs outline-none placeholder:text-faint focus:border-fg/60"
            />
          </div>
          <datalist id="doc-review-files">
            {files.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
          <p className="text-xs text-muted">
            <span className="text-fg">If it falls short:</span> {row.doc.recommendation}
          </p>
          <p className="text-[11px] text-faint">
            Evidences {row.doc.refs.join(", ")} · owner {row.doc.owner}
            {r?.at ? ` · reviewed by ${r.by} on ${new Date(r.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
          </p>
        </div>
      )}
    </li>
  )
}

export function DocumentsView() {
  const docReview = useStore((s) => s.docReview)
  const sites = useStore((s) => s.sites)
  const documents = useStore((s) => s.documents)
  const [category, setCategory] = useState<DocCategory | null>(null)
  const [plant, setPlant] = useState<string | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const rows = useMemo(() => reviewRows(docReview, sites), [docReview, sites])
  const cov = useMemo(() => coverage(rows), [rows])
  const reviewed = rows.filter((r) => r.review?.outcome)
  const count = (o: Outcome) => reviewed.filter((r) => r.review!.outcome === o).length
  const plants = sites.filter((s) => s.type === "factory" && s.status === "confirmed")
  const shown = rows.filter((r) => (!category || r.doc.category === category) && (!plant || !r.site || r.site.id === plant))
  const files = documents.map((d) => d.name)

  return (
    <div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted">
        Prior ESG diligence, policies, procedures, risk registers, HR and EHS data and compliance records, with the plant-specific documents reviewed for every plant. Each outcome updates the BRSR questions the document evidences.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
        <div>
          <div className="text-3xl font-medium tracking-tight tnum">
            {reviewed.length}
            <span className="text-lg text-faint">/{rows.length}</span>
          </div>
          <div className="text-xs text-muted">documents reviewed</div>
        </div>
        {(["adequate", "partial", "inadequate", "missing"] as Outcome[]).map((o) => (
          <div key={o}>
            <div className={cn("text-3xl font-medium tracking-tight tnum", o === "adequate" ? "text-accent" : o === "partial" ? "text-amber" : o === "inadequate" ? "text-hue-gaps" : "text-muted")}>{count(o)}</div>
            <div className="text-xs text-muted">{OUTCOME_LABEL[o].toLowerCase()}</div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Eyebrow>Coverage of BRSR areas by the documents reviewed</Eyebrow>
        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6 xl:grid-cols-12">
          {cov.map((c) => (
            <div key={c.area} className={cn("rounded-md border p-2 text-center", !c.reviewed ? "border-dashed border-line" : c.gaps ? "border-amber/40 bg-amber/[0.06]" : "border-accent/40 bg-accent/[0.06]")} title={`${c.area}: ${c.reviewed} of ${c.expected} documents reviewed, ${c.adequate} adequate`}>
              <div className="font-mono text-[11px] font-medium">{c.area}</div>
              <div className="mt-0.5 text-[11px] text-muted tnum">
                {c.reviewed}/{c.expected}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-faint">Documents reviewed out of those that evidence each area. Green when every reviewed document is adequate; amber when one falls short. {AREAS.length} areas: Sections A and B, the nine principles, and ISSB.</p>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Category">
          <button type="button" aria-pressed={!category} onClick={() => setCategory(null)} className={cn("rounded-md border px-2.5 py-1 text-xs", !category ? "border-fg text-fg" : "border-line text-muted hover:text-fg")}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(category === c ? null : c)} className={cn("rounded-md border px-2.5 py-1 text-xs", category === c ? "border-fg text-fg" : "border-line text-muted hover:text-fg")}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        {plants.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted">
            <Factory size={13} /> Plant documents for
            <select value={plant ?? ""} onChange={(e) => setPlant(e.target.value || null)} aria-label="Plant" className="h-8 rounded-md border border-line-strong bg-bg px-2 text-xs text-fg">
              <option value="">All plants</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-5 space-y-6">
        {CATEGORIES.filter((c) => shown.some((r) => r.doc.category === c)).map((c) => {
          const list = shown.filter((r) => r.doc.category === c)
          const done = list.filter((r) => r.review?.outcome).length
          return (
            <motion.section key={c} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Eyebrow className="flex items-center gap-2">
                <FileSearch size={12} /> {CATEGORY_LABEL[c]} · {done}/{list.length} reviewed
              </Eyebrow>
              <ul className="mt-2 space-y-1.5">
                {list.map((r) => (
                  <Row key={r.key} row={r} open={openKey === r.key} onToggle={() => setOpenKey(openKey === r.key ? null : r.key)} files={files} />
                ))}
              </ul>
            </motion.section>
          )
        })}
      </div>
    </div>
  )
}
