"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Download, FileUp, Inbox, Sparkles, UserRound, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { TEMPLATES, mapRows, readTable, sitesToCsv, templateCsv, type ImportKind } from "@/esgos/lib/imports"
import { refreshFromImport, runPaste } from "@/esgos/lib/pipelines"
import { goTo } from "@/esgos/lib/navigation"
import { getClient } from "@/esgos/lib/clients"
import { fmtTime } from "@/esgos/lib/format"
import { Button, Eyebrow } from "./ui"
import { cn } from "./cn"

const KINDS: ImportKind[] = ["energy", "headcount", "erp", "ehs", "documents", "sites", "people"]

export function downloadTemplate(kind: ImportKind) {
  const blob = new Blob([templateCsv(kind)], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = TEMPLATES[kind].file
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ImportDrawer() {
  const open = useStore((s) => s.ui.importOpen)
  const openKind = useStore((s) => s.ui.importKind)
  const setUi = useStore((s) => s.setUi)
  const files = useStore((s) => s.imports.files)
  const applyImport = useStore((s) => s.applyImport)
  const seed = useStore((s) => s.seed)
  const [kind, setKind] = useState<ImportKind>("energy")
  const stakeholders = useStore((s) => s.stakeholders)
  const [preview, setPreview] = useState<{ fileName: string; table: string[][]; rows: unknown[]; errors: string[] } | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setPreview(null)
    setResult(null)
    if (openKind) setKind(openKind)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setUi({ importOpen: false, importKind: undefined })
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, openKind, setUi])

  const onFile = async (f: File | undefined) => {
    if (!f) return
    setResult(null)
    try {
      const table = await readTable(f)
      const mapped = mapRows(kind, table)
      setPreview({ fileName: f.name, table, rows: mapped.rows, errors: mapped.errors })
    } catch (e) {
      setPreview({ fileName: f.name, table: [], rows: [], errors: [e instanceof Error ? e.message : "Could not read the file."] })
    }
  }

  const commit = () => {
    if (!preview || !preview.rows.length) return
    if (kind === "sites") {
      if (seed.paste === "done" || seed.reconciled) {
        setResult("The footprint is already reconciled. Restart the demo to rebuild it from this list.")
        return
      }
      void runPaste(sitesToCsv(preview.rows as Record<string, string>[]))
      setUi({ importOpen: false, importKind: undefined })
      goTo("seed")
      return
    }
    const n = applyImport(kind, preview.rows, preview.fileName)
    setResult(`Imported ${n} row${n === 1 ? "" : "s"} from ${preview.fileName}.`)
    // Once sources are in play, the file connects its source straight away.
    if (kind !== "people" && useStore.getState().connect.phase === "done") void refreshFromImport(kind)
    setPreview(null)
  }

  const t = TEMPLATES[kind]
  const holder = stakeholders.find((p) => !p.siteId && p.role === t.owner && !p.vacant)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUi({ importOpen: false, importKind: undefined })} className="fixed inset-0 z-40 bg-black/40" aria-hidden />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Import data"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="scrollbar-thin fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col overflow-y-auto border-l border-line-strong bg-elev p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Eyebrow>Import data · {getClient().name}</Eyebrow>
                <h2 className="mt-1 text-xl font-medium tracking-tight">Bring your own exports</h2>
                <p className="mt-1 text-sm text-muted">Pick what you&apos;re bringing. Each file fills one data source; files stay in this browser.</p>
              </div>
              <button type="button" onClick={() => setUi({ importOpen: false, importKind: undefined })} className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Close import" autoFocus>
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-1" role="tablist" aria-label="What to import">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={kind === k}
                  onClick={() => {
                    setKind(k)
                    setPreview(null)
                    setResult(null)
                  }}
                  className={cn("rounded-md border px-2.5 py-1 text-xs", kind === k ? "border-fg text-fg" : "border-line text-muted hover:text-fg")}
                >
                  {TEMPLATES[k].title}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-line p-4">
              <div className="text-base font-medium">{t.title}</div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex gap-2.5">
                  <dt className="mt-0.5 text-faint">
                    <Inbox size={14} aria-label="Comes from" />
                  </dt>
                  <dd>
                    <span className="text-muted">Comes from: </span>
                    {t.system}
                  </dd>
                </div>
                <div className="flex gap-2.5">
                  <dt className="mt-0.5 text-faint">
                    <UserRound size={14} aria-label="Who has it" />
                  </dt>
                  <dd>
                    <span className="text-muted">Who usually has it: </span>
                    {t.owner}
                    {holder ? ` (${holder.name})` : ""}
                  </dd>
                </div>
                <div className="flex gap-2.5">
                  <dt className="mt-0.5 text-faint">
                    <Sparkles size={14} aria-label="What it fills" />
                  </dt>
                  <dd>
                    <span className="text-muted">Fills: </span>
                    {t.fills}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => downloadTemplate(kind)}>
                  <Download size={13} /> Download template
                </Button>
                <Button size="sm" variant="primary" onClick={() => inputRef.current?.click()}>
                  <FileUp size={13} /> Upload file
                </Button>
                <input ref={inputRef} type="file" accept=".csv,.xlsx,text/csv" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} aria-label="Choose a CSV or Excel file" />
              </div>
              <p className="mt-3 text-xs text-muted">{t.note} CSV or Excel. Column names are matched loosely; extra columns are ignored.</p>
              <table className="mt-3 w-full text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-faint">
                    <th className="py-1.5 pr-3 font-medium">Column</th>
                    <th className="py-1.5 font-medium">What goes in it</th>
                  </tr>
                </thead>
                <tbody>
                  {t.columns.map((c) => (
                    <tr key={c} className="border-b border-line align-top">
                      <td className="whitespace-nowrap py-1.5 pr-3 font-mono text-[11px]">
                        {c}
                        {t.required.includes(c) && <span className="text-amber"> *</span>}
                      </td>
                      <td className="py-1.5 text-muted">{t.help[c]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-faint">
                <span className="text-amber">*</span> required
              </p>
            </div>

            {preview && (
              <div className="mt-4 rounded-lg border border-line p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{preview.fileName}</span>
                  <span className="text-muted">
                    {preview.rows.length} valid row{preview.rows.length === 1 ? "" : "s"}
                  </span>
                </div>
                {!!preview.errors.length && (
                  <ul className="mt-2 space-y-0.5 text-xs text-amber">
                    {preview.errors.slice(0, 6).map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
                {preview.table.length > 1 && (
                  <div className="scrollbar-thin mt-3 overflow-x-auto">
                    <table className="text-xs">
                      <tbody>
                        {preview.table.slice(0, 6).map((r, i) => (
                          <tr key={i} className={cn("border-b border-line", i === 0 && "font-medium")}>
                            {r.slice(0, 8).map((c, j) => (
                              <td key={j} className="whitespace-nowrap px-2 py-1">
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Button size="sm" variant="primary" className="mt-3" disabled={!preview.rows.length} onClick={commit}>
                  Import {preview.rows.length} row{preview.rows.length === 1 ? "" : "s"}
                </Button>
              </div>
            )}
            {result && <p className="mt-4 text-sm text-accent">{result}</p>}

            {files.length > 0 && (
              <div className="mt-8">
                <Eyebrow>Imported so far</Eyebrow>
                <ul className="mt-2 space-y-1 text-sm">
                  {files.map((f, i) => (
                    <li key={i} className="flex justify-between gap-3 border-b border-line py-1.5">
                      <span>
                        {f.fileName} <span className="text-faint">· {TEMPLATES[f.kind].title}</span>
                      </span>
                      <span className="text-xs text-muted">
                        {f.rows} rows · {fmtTime(f.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
