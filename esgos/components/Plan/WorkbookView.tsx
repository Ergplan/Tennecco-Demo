"use client"

// The completed BRSR data workbook, read in the app: the same workbook the Excel
// download writes, sheet by sheet, with each cell's value, formula, fill and note.

import type ExcelJS from "exceljs"
import { FunctionSquare, Loader2, StickyNote } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { ReportModel } from "@/esgos/lib/exports/model"
import { Button } from "../common/ui"
import { cn } from "../common/cn"

type CellView = { text: string; num: boolean; formula?: string; note?: string; bg?: string; fg?: string; bold?: boolean; italic?: boolean; link?: boolean; wrap?: boolean; size?: number }
type SheetView = { name: string; tab?: string; widths: number[]; rows: { n: number; cells: CellView[]; height?: number }[]; header: number; freezeCols: number; cols: number }

const argb = (c?: { argb?: string }) => (c?.argb && c.argb.length === 8 ? `#${c.argb.slice(2)}` : undefined)
// Dark text set for a white sheet is dropped on unfilled cells, so it follows the app theme.
const dark = (hex?: string) => {
  if (!hex) return true
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) < 90
}

// Enough of Excel's number formats for this workbook: "#,##0.00" (fixed), "#,##0.##" (up to), "0.00E+00".
function formatNumber(v: number, fmt?: string) {
  if (fmt?.includes("E+")) return v === 0 ? "0" : v.toExponential(2).replace("e", "E")
  const dec = fmt?.split(".")[1]
  if (dec) {
    const fixed = (dec.match(/0/g) ?? []).length
    const upTo = fixed + (dec.match(/#/g) ?? []).length
    return v.toLocaleString("en-IN", { minimumFractionDigits: fixed, maximumFractionDigits: upTo })
  }
  if (fmt) return v.toLocaleString("en-IN", { maximumFractionDigits: 0 })
  return Math.abs(v) < 0.001 && v !== 0 ? v.toExponential(3) : v.toLocaleString("en-IN", { maximumFractionDigits: 6 })
}

function cellView(c: ExcelJS.Cell): CellView {
  const v = c.value as unknown
  let text = ""
  let num = false
  let formula: string | undefined
  let link = false
  const show = (x: unknown) => {
    if (x === null || x === undefined) return ""
    if (typeof x === "number") {
      num = true
      return formatNumber(x, c.numFmt)
    }
    if (x instanceof Date) return x.toISOString().slice(0, 10)
    return String(x)
  }
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const o = v as { formula?: string; result?: unknown; text?: string; hyperlink?: string; richText?: { text: string }[]; sharedFormula?: string }
    if (o.formula || o.sharedFormula) {
      formula = o.formula ?? o.sharedFormula
      text = show(o.result)
    } else if (o.richText) text = o.richText.map((r) => r.text).join("")
    else if (o.hyperlink) {
      text = o.text ?? o.hyperlink
      link = true
    } else text = show(o.text)
  } else text = show(v)
  const note = typeof c.note === "string" ? c.note : (c.note as { texts?: { text: string }[] } | undefined)?.texts?.map((t) => t.text).join("")
  const fill = c.fill && c.fill.type === "pattern" ? argb((c.fill as ExcelJS.FillPattern).fgColor) : undefined
  return { text, num, formula, note, bg: fill, fg: argb(c.font?.color as { argb?: string }), bold: !!c.font?.bold, italic: !!c.font?.italic, link, wrap: !!c.alignment?.wrapText, size: c.font?.size }
}

function sheetView(ws: ExcelJS.Worksheet): SheetView {
  const cols = Math.max(ws.actualColumnCount, ws.columnCount)
  const widths = Array.from({ length: cols }, (_, i) => Math.round((ws.getColumn(i + 1).width ?? 10) * 7.2))
  const rows: SheetView["rows"] = []
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    rows.push({ n, height: row.height, cells: Array.from({ length: cols }, (_, i) => cellView(row.getCell(i + 1))) })
  })
  const view = (ws.views?.[0] ?? {}) as { ySplit?: number; xSplit?: number }
  return { name: ws.name, tab: argb(ws.properties.tabColor as { argb?: string }), widths, rows, header: view.ySplit ?? 0, freezeCols: view.xSplit ? 1 : 0, cols }
}

const col = (n: number) => {
  let s = ""
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function WorkbookView({ model }: { model: ReportModel }) {
  const [sheets, setSheets] = useState<SheetView[] | null>(null)
  const [active, setActive] = useState("Summary")
  const [sel, setSel] = useState<{ r: number; c: number } | null>(null)
  const [limit, setLimit] = useState(150)

  useEffect(() => {
    let live = true
    setSheets(null)
    import("@/esgos/lib/exports/xlsx").then((x) => {
      if (!live) return
      const wb = x.dataWorkbook(model)
      setSheets(wb.worksheets.map(sheetView))
    })
    return () => {
      live = false
    }
  }, [model])

  const sheet = useMemo(() => sheets?.find((s) => s.name === active) ?? sheets?.[0], [sheets, active])
  if (!sheets || !sheet)
    return (
      <p className="flex items-center gap-2 text-sm text-muted">
        <Loader2 size={14} className="animate-spin" /> Building the workbook…
      </p>
    )
  const head = sheet.rows.slice(0, sheet.header)
  const body = sheet.rows.slice(sheet.header)
  const cell = sel ? sheet.rows.find((r) => r.n === sel.r)?.cells[sel.c - 1] : undefined

  return (
    <div className="overflow-hidden rounded-xl border border-line-strong">
      {/* Formula bar */}
      <div className="flex min-h-9 items-center gap-2 border-b border-line bg-surface px-3 py-1.5 text-xs">
        <span className="w-20 shrink-0 font-mono text-muted">{sel ? `${col(sel.c)}${sel.r}` : ""}</span>
        <FunctionSquare size={13} className="shrink-0 text-faint" />
        <span className="min-w-0 flex-1 truncate font-mono" title={cell?.formula ? `=${cell.formula}` : cell?.text}>
          {cell?.formula ? <span className="text-hue-plan">={cell.formula}</span> : cell?.text}
        </span>
        {cell?.formula && <span className="shrink-0 tabular-nums text-muted">= {cell.text || "blank"}</span>}
      </div>
      {cell?.note && (
        <div className="flex items-start gap-2 border-b border-line bg-amber/[0.06] px-3 py-1.5 text-[11px] text-muted">
          <StickyNote size={12} className="mt-0.5 shrink-0 text-amber" /> {cell.note}
        </div>
      )}
      <div className="max-h-[62vh] overflow-auto scrollbar-thin bg-bg text-fg">
        <table className="border-separate border-spacing-0 text-[11px]" style={{ width: sheet.widths.reduce((a, b) => a + b, 40) }}>
          <colgroup>
            <col style={{ width: 40 }} />
            {sheet.widths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 border-b border-r border-line bg-surface-2 text-[10px] font-normal text-faint" />
              {sheet.widths.map((_, i) => (
                <th key={i} className="border-b border-r border-line bg-surface-2 py-0.5 text-center text-[10px] font-normal text-faint">
                  {col(i + 1)}
                </th>
              ))}
            </tr>
            {head.map((r) => (
              <Row key={r.n} r={r} sheet={sheet} sel={sel} onSel={setSel} />
            ))}
          </thead>
          <tbody>
            {body.slice(0, limit).map((r) => (
              <Row key={r.n} r={r} sheet={sheet} sel={sel} onSel={setSel} />
            ))}
          </tbody>
        </table>
        {body.length > limit && (
          <div className="p-3">
            <Button size="sm" variant="ghost" onClick={() => setLimit(limit + 300)}>
              Show {Math.min(300, body.length - limit)} more of {body.length} rows
            </Button>
          </div>
        )}
      </div>
      {/* Sheet tabs */}
      <div role="tablist" aria-label="Workbook sheets" className="scrollbar-thin flex gap-0.5 overflow-x-auto border-t border-line bg-surface px-1 py-1">
        {sheets.map((s) => (
          <button
            key={s.name}
            type="button"
            role="tab"
            aria-selected={s.name === sheet.name}
            onClick={() => {
              setActive(s.name)
              setSel(null)
              setLimit(150)
            }}
            className={cn("shrink-0 rounded px-2.5 py-1 text-[11px] transition-colors", s.name === sheet.name ? "bg-bg text-fg shadow-sm" : "text-muted hover:text-fg")}
            style={{ borderBottom: `2px solid ${s.tab ?? "transparent"}` }}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function Row({ r, sheet, sel, onSel }: { r: SheetView["rows"][number]; sheet: SheetView; sel: { r: number; c: number } | null; onSel: (s: { r: number; c: number }) => void }) {
  return (
    <tr style={{ height: r.height ? Math.max(18, r.height * 1.1) : undefined }}>
      <td className="sticky left-0 z-10 border-b border-r border-line bg-surface-2 px-1 text-right text-[10px] text-faint">{r.n}</td>
      {r.cells.map((c, i) => {
        const selected = sel?.r === r.n && sel.c === i + 1
        const sticky = sheet.freezeCols > 0 && i === 0
        return (
          <td
            key={i}
            onClick={() => onSel({ r: r.n, c: i + 1 })}
            title={c.note ? `${c.text}\n${c.note}` : c.text || undefined}
            className={cn("relative cursor-cell border-b border-r border-line px-1.5 py-0.5 align-top", c.num && "text-right tabular-nums", c.wrap ? "whitespace-pre-wrap" : "truncate whitespace-nowrap", selected && "outline outline-2 -outline-offset-2 outline-hue-plan", sticky && "sticky left-10 z-[5]")}
            style={{ background: c.bg ?? (sticky ? "var(--bg)" : undefined), color: c.bg ? (c.fg ?? "#0f172a") : dark(c.fg) ? undefined : c.fg, fontWeight: c.bold ? 600 : undefined, fontStyle: c.italic ? "italic" : undefined, fontSize: c.size && c.size > 12 ? 14 : undefined, textDecoration: c.link ? "underline" : undefined, maxWidth: sheet.widths[i] }}
          >
            {c.text}
            {c.note && <span className="absolute right-0 top-0 h-0 w-0 border-l-[5px] border-t-[5px] border-l-transparent border-t-amber" />}
          </td>
        )
      })}
    </tr>
  )
}
