// Gap analysis results and recommendations as a PowerPoint: the same sections,
// numbers and wording as the page in Gaps → Results, laid out for a management
// audience. Native charts and tables, real title placeholders, speaker notes.

import type PptxGenJS from "pptxgenjs"
import type { Priority } from "../readiness/types"
import { AREAS, FOCI, FOCUS_LABEL, OUTCOME_LABEL, PRIORITIES, RATING_TEXT, STATUS_TEXT, buildGapReport, outlineEntry, type GapReport, type SectionId } from "./gapReport"
import type { Outcome } from "../documents/review"
import type { ReportModel } from "./model"
import { AMBER, BLUE, BOTTOM, CW, CYAN, FAINT, FONT, GREEN, INK, LINE, MINT, MUTED, MX, PANEL, ROSE, STATUS_COLOR, TOP, VIOLET, W, WHITE, card, chip, clip, dot, fit, fitAfter, legend, lineCount, lineH, newDeck, numberCircle, statusBar, text, textH, tint } from "./deckKit"
import type { Rating } from "../interviews/plan"

export const PRIORITY_COLOR: Record<Priority, string> = { "Before listing": ROSE, "First BRSR year": AMBER, "After listing": BLUE }
export const MS_COLOR: Record<string, string> = { M1: VIOLET, M2: "EA580C", M3: GREEN, M4: CYAN, M5: BLUE }
const RATING_COLOR: Record<Rating, string> = { "in-place": GREEN, partial: AMBER, "not-in-place": ROSE, na: FAINT }
const TONE: Record<"good" | "warn" | "bad", string> = { good: GREEN, warn: AMBER, bad: ROSE }

const n = (v: number) => v.toLocaleString("en-IN")
const fmt = (v: number, unit: string) => (unit === "%" ? `${v.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%` : unit === "₹ cr" ? `₹${n(Math.round(v))} cr` : `${v.toLocaleString("en-IN", { maximumFractionDigits: v < 10 ? 2 : 0 })} ${unit}`)
const eyebrow = (g: GapReport, id: SectionId) => {
  const o = outlineEntry(g, id)
  return `${o.n} · ${o.label}`
}

export function gapAnalysisDeck(m: ReportModel) {
  const g = buildGapReport(m)
  const { pptx, slide } = newDeck({
    title: "Gap analysis results and recommendations",
    client: g.clientShort,
    date: g.date,
    footer: `${g.clientShort} · BRSR and ISSB gap analysis · ${g.date} · Draft for discussion`,
    author: g.preparedBy,
    company: g.legalName,
  })
  cover(pptx, slide, g, m)
  executiveSummary(slide, g)
  scope(slide, g)
  documents(slide, g)
  readiness(pptx, slide, g)
  heatmap(slide, g)
  themes(slide, g)
  priorityGaps(slide, g)
  brsrCore(slide, g)
  plants(slide, g)
  interviews(slide, g)
  issb(pptx, slide, g)
  peer(slide, g)
  recommendations(slide, g)
  closingLoop(slide, g)
  closingData(slide, g)
  standardise(slide, g)
  roadmap(slide, g)
  decisions(slide, g)
  appendix(slide, g)
  return pptx
}

export type SlideFn = ReturnType<typeof newDeck>["slide"]
// Lets another deck reuse a slide under its own numbering and wording.
export type Head = { eyebrow: string; title?: string; section?: string }

// ------------------------------------------------------------------ cover
function cover(pptx: PptxGenJS, slide: SlideFn, g: GapReport, m: ReportModel) {
  const s = slide({
    layout: "cover",
    section: "Summary",
    notes: `Gap analysis of ${g.legalName} against every BRSR question and the IFRS S1/S2 requirements, ${g.fy}. ${g.headline}`,
  })
  text(s, "GAP ANALYSIS · BRSR AND ISSB S1/S2", { x: MX, y: 1.45, w: 8.3, h: 0.3, fontSize: 11, bold: true, color: MINT, charSpacing: 1.5 })
  s.addText("Gap analysis results and recommendations", { placeholder: "title" })
  s.addText(`${g.legalName} · ${g.fy}`, { placeholder: "subtitle" })
  text(s, `${g.date} · Prepared by ${g.preparedBy} · Draft for discussion`, { x: MX, y: 4.78, w: 8.3, h: 0.3, fontSize: 12, color: "94A3B8" })

  // Every BRSR question as a dot, coloured by status and grouped by section.
  const items = m.readiness.items.filter((x) => x.framework === "BRSR")
  const cols = 12
  const step = 0.27
  const d = 0.17
  const x0 = 9.55
  const y0 = 1.55
  items.forEach((x, i) => {
    const cx = x0 + (i % cols) * step
    const cy = y0 + Math.floor(i / cols) * step
    const color = x.status === "now" ? MINT : x.status === "sync" ? "E9B45E" : "3A4250"
    s.addShape("ellipse", { x: cx, y: cy, w: d, h: d, fill: { color }, line: { color, width: 0 } })
  })
  const rows = Math.ceil(items.length / cols)
  const ly = y0 + rows * step + 0.12
  text(s, `Each dot is one of the ${items.length} BRSR questions`, { x: x0, y: ly, w: 3.4, h: 0.24, fontSize: 10, color: "94A3B8" })
  legend(
    s,
    x0,
    ly + 0.3,
    [
      [`${g.stats.brsrNow} in place`, MINT],
      [`${g.stats.brsrSync} need work`, "E9B45E"],
      [`${g.stats.brsrOpen} open`, "3A4250"],
    ],
    "CBD5E1",
  )
  void pptx
}

// ------------------------------------------------------- executive summary
export function executiveSummary(slide: SlideFn, g: GapReport, head?: Head) {
  const before = g.stats.byPriority["Before listing"]
  const s = slide({
    eyebrow: head?.eyebrow ?? eyebrow(g, "summary"),
    title: head?.title ?? outlineEntry(g, "summary").title,
    section: head?.section ?? "Summary",
    notes: [g.headline, ...g.messages.map((x) => `${x.title}: ${x.body}`)].join("\n\n"),
  })
  const lw = 7.75
  const hh = textH(g.headline, lw, 15)
  text(s, g.headline, { x: MX, y: TOP, w: lw, h: hh + 0.05, fontSize: 15, color: INK })
  const bodies = g.messages.map((msg) => clip(msg.body, 190))
  const used = bodies.reduce((a, b) => a + 0.3 + textH(b, lw - 0.35, 12), 0)
  const gap = Math.max(0.12, Math.min(0.3, (BOTTOM - TOP - hh - 0.3 - used) / g.messages.length))
  let y = TOP + hh + 0.3
  g.messages.forEach((msg, i) => {
    const bh = textH(bodies[i], lw - 0.35, 12)
    dot(s, MX, y + 0.06, 0.16, TONE[msg.tone])
    text(s, msg.title, { x: MX + 0.32, y, w: lw - 0.35, h: 0.26, fontSize: 13, bold: true })
    text(s, bodies[i], { x: MX + 0.32, y: y + 0.3, w: lw - 0.35, h: bh + 0.04, fontSize: 12, color: MUTED })
    y += 0.3 + bh + gap
  })
  const x = 8.85
  const w = W - MX - x
  const stats: [string, string, string, number, string][] = [
    [String(g.stats.brsrNow), `/${g.stats.brsrTotal}`, "BRSR questions in place today", g.stats.brsrNow / g.stats.brsrTotal, GREEN],
    [String(g.stats.coreReady), `/${g.stats.coreTotal}`, "BRSR Core KPIs traceable to source", g.stats.coreReady / Math.max(1, g.stats.coreTotal), g.stats.coreReady === g.stats.coreTotal ? GREEN : ROSE],
    [String(before), "", `to close ${g.when["Before listing"]}, of ${g.stats.openTotal} gaps`, before / Math.max(1, g.stats.openTotal), ROSE],
  ]
  stats.forEach(([big, small, label, share, color], i) => {
    const yy = TOP + i * 1.74
    card(s, x, yy, w, 1.56)
    s.addText(
      [
        { text: big, options: { fontSize: 40, bold: true, color } },
        { text: small, options: { fontSize: 20, bold: true, color: FAINT } },
      ],
      { x: x + 0.28, y: yy + 0.18, w: w - 0.56, h: 0.68, fontFace: FONT, margin: 0, valign: "bottom", isTextBox: true },
    )
    text(s, label, { x: x + 0.28, y: yy + 0.9, w: w - 0.56, h: 0.26, fontSize: 11.5, color: MUTED })
    s.addShape("rect", { x: x + 0.28, y: yy + 1.28, w: w - 0.56, h: 0.07, fill: { color: LINE }, line: { color: LINE, width: 0 } })
    if (share > 0) s.addShape("rect", { x: x + 0.28, y: yy + 1.28, w: Math.max(0.04, (w - 0.56) * Math.min(1, share)), h: 0.07, fill: { color }, line: { color, width: 0 } })
  })
}

// ------------------------------------------------------------------ scope
function scope(slide: SlideFn, g: GapReport) {
  const s = slide({
    eyebrow: eyebrow(g, "scope"),
    title: outlineEntry(g, "scope").title,
    section: "Summary",
    notes: `${g.scope.boundary}\n\n${g.scope.cards.map((c) => `${c.label}: ${c.detail}`).join("\n")}\n\nMethod: ${g.scope.method.map((x) => `${x.title}: ${x.text}`).join(" ")}`,
  })
  const cw = (CW - 3 * 0.25) / 4
  g.scope.cards.forEach((c, i) => {
    const x = MX + i * (cw + 0.25)
    card(s, x, TOP, cw, 2.42)
    text(s, c.label.toUpperCase(), { x: x + 0.25, y: TOP + 0.22, w: cw - 0.5, h: 0.22, fontSize: 9.5, bold: true, color: FAINT, charSpacing: 1.2 })
    text(s, c.value, { x: x + 0.25, y: TOP + 0.5, w: cw - 0.5, h: 0.5, fontSize: 24, bold: true, color: INK })
    text(s, clip(c.detail, 150), { x: x + 0.25, y: TOP + 1.08, w: cw - 0.5, h: 1.2, fontSize: 11.5, color: MUTED })
  })
  const y = TOP + 2.85
  text(s, "HOW EACH GAP IS ASSESSED, RANKED AND PLANNED", { x: MX, y, w: CW, h: 0.24, fontSize: 9.5, bold: true, color: FAINT, charSpacing: 1.2 })
  const sw = (CW - 3 * 0.25) / 4
  s.addShape("line", { x: MX + 0.2, y: y + 0.62, w: CW - sw + 0.0, h: 0, line: { color: LINE, width: 1.5 } })
  g.scope.method.forEach((st, i) => {
    const x = MX + i * (sw + 0.25)
    numberCircle(s, x + 0.03, y + 0.45, i + 1, INK)
    text(s, st.title, { x, y: y + 0.95, w: sw - 0.1, h: 0.3, fontSize: 14, bold: true })
    text(s, st.text, { x, y: y + 1.3, w: sw - 0.15, h: 0.82, fontSize: 11.5, color: MUTED })
  })
}

// -------------------------------------------------------------- documents
const OUTCOME_COLOR: Record<Outcome, string> = { adequate: GREEN, partial: AMBER, inadequate: ROSE, missing: FAINT }

function documents(slide: SlideFn, g: GapReport) {
  const d = g.documents
  const s = slide({
    eyebrow: eyebrow(g, "documents"),
    title: outlineEntry(g, "documents").title,
    section: "Summary",
    notes: `Desktop document review: prior ESG diligence, policies, procedures, risk registers, HR and EHS data, compliance records, and plant-specific documents for each of ${d.plants} plants. ${d.reviewed} of ${d.total} reviewed. ${(Object.keys(d.byOutcome) as Outcome[]).map((o) => `${OUTCOME_LABEL[o]}: ${d.byOutcome[o]}`).join("; ")}.`,
  })
  const lw = 6.3
  // Outcome counts
  const stats: [string, number, string][] = [
    ["Reviewed", d.reviewed, INK],
    ...(["adequate", "partial", "inadequate", "missing"] as Outcome[]).map((o) => [OUTCOME_LABEL[o], d.byOutcome[o], OUTCOME_COLOR[o]] as [string, number, string]),
  ]
  const sw = lw / stats.length
  card(s, MX, TOP, lw, 1.2)
  stats.forEach(([label, v, color], i) => {
    const x = MX + 0.2 + i * sw
    text(s, i === 0 ? `${v}/${d.total}` : String(v), { x, y: TOP + 0.16, w: sw - 0.1, h: 0.5, fontSize: i === 0 ? 22 : 24, bold: true, color })
    text(s, label, { x, y: TOP + 0.72, w: sw - 0.1, h: 0.36, fontSize: 10, color: MUTED })
  })
  // Coverage by BRSR area
  text(s, "COVERAGE OF BRSR AREAS BY THE DOCUMENTS REVIEWED", { x: MX, y: TOP + 1.45, w: lw, h: 0.24, fontSize: 9.5, bold: true, color: FAINT, charSpacing: 1.2 })
  const cols = 6
  const tw = (lw - (cols - 1) * 0.1) / cols
  d.coverage.forEach((c, i) => {
    const x = MX + (i % cols) * (tw + 0.1)
    const y = TOP + 1.8 + Math.floor(i / cols) * 0.95
    const color = !c.reviewed ? LINE : c.gaps ? AMBER : GREEN
    s.addShape("roundRect", { x, y, w: tw, h: 0.82, fill: { color: !c.reviewed ? PANEL : tint(color, 0.86) }, line: { color: !c.reviewed ? LINE : tint(color, 0.6), width: 0.75 }, rectRadius: 0.05 })
    text(s, c.area, { x, y: y + 0.1, w: tw, h: 0.3, fontSize: 13, bold: true, color: !c.reviewed ? MUTED : color, align: "center" })
    text(s, `${c.reviewed}/${c.expected}`, { x, y: y + 0.44, w: tw, h: 0.26, fontSize: 10.5, color: MUTED, align: "center" })
  })
  text(s, "Documents reviewed of those that evidence each area; green when all reviewed are adequate, amber when one falls short.", { x: MX, y: TOP + 3.75, w: lw, h: 0.4, fontSize: 9.5, color: FAINT })
  // By category
  const cy = TOP + 4.25
  d.byCategory.forEach((c, i) => {
    const x = MX + (i % 4) * (lw / 4)
    const y = cy + Math.floor(i / 4) * 0.42
    text(s, [{ text: `${c.reviewed}/${c.total}  `, options: { bold: true, color: INK } }, { text: c.category, options: { color: MUTED } }], { x, y, w: lw / 4 - 0.05, h: 0.4, fontSize: 9.5 })
  })
  // Shortfalls
  const x = MX + lw + 0.45
  const w = W - MX - x
  const iw = w - 0.44
  text(s, d.shortfalls.length ? "WHERE THE DOCUMENTS FALL SHORT" : "WHAT THE REVIEW COVERS", { x, y: TOP, w, h: 0.24, fontSize: 9.5, bold: true, color: FAINT, charSpacing: 1.2 })
  if (d.shortfalls.length) {
    const list = d.shortfalls.slice(0, 4)
    const ch = (BOTTOM - TOP - 0.38 - 3 * 0.12) / 4
    list.forEach((f, i) => {
      const y = TOP + 0.38 + i * (ch + 0.12)
      card(s, x, y, w, ch)
      const cw2 = chip(s, x + 0.22, y + 0.16, OUTCOME_LABEL[f.outcome], OUTCOME_COLOR[f.outcome], { size: 9, h: 0.24, solid: true })
      text(s, fit(`${f.title}${f.site ? ` · ${f.site}` : ""}`, iw - cw2 - 0.14, 11.5, 1, true), { x: x + 0.22 + cw2 + 0.14, y: y + 0.16, w: iw - cw2 - 0.14, h: 0.24, fontSize: 11.5, bold: true, valign: "middle" })
      const body = `${f.notes ? `${f.notes}. ` : ""}→ ${f.recommendation}`
      text(s, fit(body, iw, 10.5, Math.max(1, Math.floor((ch - 0.62) / lineH(10.5)))), { x: x + 0.22, y: y + 0.52, w: iw, h: ch - 0.6, fontSize: 10.5, color: MUTED })
    })
  } else {
    d.byCategory.forEach((c, i) => {
      const y = TOP + 0.38 + i * 0.6
      dot(s, x, y + 0.08, 0.14, c.reviewed ? GREEN : LINE)
      text(s, c.category, { x: x + 0.3, y, w: iw, h: 0.26, fontSize: 12, bold: true })
      text(s, `${c.total} document${c.total === 1 ? "" : "s"} to review`, { x: x + 0.3, y: y + 0.27, w: iw, h: 0.22, fontSize: 10.5, color: MUTED })
    })
  }
}

// -------------------------------------------------------------- readiness
function readiness(pptx: PptxGenJS, slide: SlideFn, g: GapReport) {
  const st = g.stats
  const secs = g.sections
  const best = [...secs].sort((a, b) => b.tally.now / Math.max(1, b.tally.total) - a.tally.now / Math.max(1, a.tally.total))[0]
  const s = slide({
    eyebrow: eyebrow(g, "readiness"),
    title: outlineEntry(g, "readiness").title,
    section: "Findings",
    notes: `By section: ${secs.map((x) => `${x.id} ${x.tally.now} in place, ${x.tally.sync} need work, ${x.tally.open} open`).join("; ")}.`,
  })
  const labels = secs.map((x) => `${x.id} · ${x.title}`)
  s.addChart(
    pptx.ChartType.bar,
    [
      { name: "In place", labels, values: secs.map((x) => x.tally.now) },
      { name: "Needs work", labels, values: secs.map((x) => x.tally.sync) },
      { name: "Open", labels, values: secs.map((x) => x.tally.open) },
    ],
    { ...barChart(), x: MX - 0.1, y: TOP - 0.05, w: 8.0, h: BOTTOM - TOP + 0.05, barGapWidthPct: 45 },
  )
  const x = 8.85
  const w = W - MX - x
  const rows: [string, number, string][] = [
    ["In place", st.brsrNow, GREEN],
    ["Needs work", st.brsrSync, AMBER],
    ["Open", st.brsrOpen, ROSE],
  ]
  card(s, x, TOP, w, 1.5)
  rows.forEach(([label, v, color], i) => {
    const cx = x + 0.25 + i * ((w - 0.5) / 3)
    text(s, String(v), { x: cx, y: TOP + 0.2, w: 1.1, h: 0.62, fontSize: 30, bold: true, color })
    text(s, label, { x: cx, y: TOP + 0.88, w: 1.15, h: 0.4, fontSize: 11, color: MUTED })
  })
  text(s, "WHAT STANDS OUT", { x, y: TOP + 1.8, w, h: 0.24, fontSize: 9.5, bold: true, color: FAINT, charSpacing: 1.2 })
  const b = secs.find((x) => x.id === "B")!
  const p6 = secs.find((x) => x.id === "P6")!
  const obs = [
    `${best.id} · ${best.title} is furthest ahead: ${best.tally.now} of ${best.tally.total} in place.`,
    `Section B (policies and governance): ${b.tally.now} of ${b.tally.total} in place, ${b.tally.open} open.`,
    `P6 Environment: ${p6.tally.now} of ${p6.tally.total} in place; ${p6.tally.sync} have a source that needs work.`,
  ]
  obs.forEach((o, i) => {
    const y = TOP + 2.15 + i * 0.95
    dot(s, x, y + 0.06, 0.12, INK)
    text(s, o, { x: x + 0.25, y, w: w - 0.25, h: 0.8, fontSize: 12, color: INK })
  })
}

// ---------------------------------------------------------------- heatmap
function heatmap(slide: SlideFn, g: GapReport) {
  const s = slide({
    eyebrow: eyebrow(g, "heatmap"),
    title: outlineEntry(g, "heatmap").title,
    section: "Findings",
    notes: `Open and needs-work items by category and priority. ${g.heatmap.rows.map((r) => `${r.category}: ${PRIORITIES.map((p, i) => `${r.cells[i]} ${g.priorityLabel[p].toLowerCase()}`).join(", ")}`).join(". ")}.`,
  })
  const DEF: Record<Priority, string> = g.preIpo
    ? { "Before listing": "Required by SEBI or asked in IPO diligence", "First BRSR year": "Needed in the first BRSR after listing", "After listing": "Leadership indicators and ISSB, voluntary today" }
    : { "Before listing": "Mandatory or assured; needed for the next filing", "First BRSR year": "Needed in this reporting year", "After listing": "Leadership indicators and ISSB, voluntary today" }
  const labelW = 3.3
  const totalW = 1.15
  const gap = 0.08
  const colW = (CW - labelW - totalW - 4 * gap) / 3
  const headH = 0.82
  const rowH = 0.56
  const y0 = TOP
  PRIORITIES.forEach((p, i) => {
    const x = MX + labelW + gap + i * (colW + gap)
    text(s, g.priorityLabel[p], { x, y: y0, w: colW, h: 0.3, fontSize: 13, bold: true, color: PRIORITY_COLOR[p], align: "center" })
    text(s, DEF[p], { x: x + 0.1, y: y0 + 0.32, w: colW - 0.2, h: 0.45, fontSize: 10.5, color: MUTED, align: "center" })
  })
  text(s, "Total", { x: MX + labelW + gap + 3 * (colW + gap), y: y0, w: totalW, h: 0.3, fontSize: 13, bold: true, color: INK, align: "center" })
  const rows = [...g.heatmap.rows, { category: "Total", cells: g.heatmap.totals, total: g.stats.openTotal }]
  rows.forEach((r, ri) => {
    const y = y0 + headH + ri * (rowH + gap)
    const isTotal = ri === rows.length - 1
    text(s, r.category, { x: MX, y, w: labelW - 0.1, h: rowH, fontSize: 13, bold: isTotal, color: INK, valign: "middle" })
    r.cells.forEach((v, ci) => {
      const x = MX + labelW + gap + ci * (colW + gap)
      const color = PRIORITY_COLOR[PRIORITIES[ci]]
      const fill = isTotal ? (v ? color : PANEL) : v ? tint(color, 0.88 - 0.6 * Math.min(1, v / g.heatmap.max)) : PANEL
      const dark = isTotal ? !!v : v / g.heatmap.max > 0.45
      s.addShape("rect", { x, y, w: colW, h: rowH, fill: { color: fill }, line: { color: fill, width: 0 } })
      text(s, v ? String(v) : "–", { x, y, w: colW, h: rowH, fontSize: 16, bold: true, color: v ? (dark ? WHITE : color) : FAINT, align: "center", valign: "middle" })
    })
    const tx = MX + labelW + gap + 3 * (colW + gap)
    s.addShape("rect", { x: tx, y, w: totalW, h: rowH, fill: { color: isTotal ? INK : PANEL }, line: { color: isTotal ? INK : PANEL, width: 0 } })
    text(s, String(r.total), { x: tx, y, w: totalW, h: rowH, fontSize: 16, bold: true, color: isTotal ? WHITE : INK, align: "center", valign: "middle" })
  })
}

// ----------------------------------------------------------------- themes
function themes(slide: SlideFn, g: GapReport) {
  const s = slide({
    eyebrow: eyebrow(g, "themes"),
    title: outlineEntry(g, "themes").title,
    section: "Findings",
    notes: g.themes.map((t) => `${t.n}. ${t.title}: ${t.finding}`).join("\n"),
  })
  const cw = (CW - 3 * 0.22) / 4
  const ch = 2.46
  g.themes.forEach((t, i) => {
    const x = MX + (i % 4) * (cw + 0.22)
    const y = TOP + Math.floor(i / 4) * (ch + 0.2)
    card(s, x, y, cw, ch)
    numberCircle(s, x + 0.22, y + 0.22, t.n, t.before ? ROSE : t.open.length ? INK : GREEN, 0.32)
    text(s, t.title, { x: x + 0.66, y: y + 0.2, w: cw - 0.85, h: 0.5, fontSize: 12.5, bold: true, valign: "top" })
    const notIn = t.tally.total - t.tally.now
    s.addText(
      [
        { text: String(notIn), options: { fontSize: 24, bold: true, color: INK } },
        { text: ` of ${t.tally.total} not in place`, options: { fontSize: 11, color: MUTED } },
      ],
      { x: x + 0.22, y: y + 0.78, w: cw - 0.44, h: 0.44, fontFace: FONT, margin: 0, valign: "bottom", isTextBox: true },
    )
    statusBar(s, x + 0.22, y + 1.3, cw - 0.44, 0.09, t.tally)
    if (t.before) chip(s, x + 0.22, y + 1.5, `${t.before} ${g.when["Before listing"]}`, ROSE, { size: 9.5, h: 0.24 })
    else chip(s, x + 0.22, y + 1.5, t.open.length ? "Not urgent" : "In place", t.open.length ? BLUE : GREEN, { size: 9.5, h: 0.24 })
    const big = t.open[0]
    text(s, big ? `Biggest gap: ${clip(big.title, 70)}` : "Nothing open.", { x: x + 0.22, y: y + 1.86, w: cw - 0.44, h: 0.5, fontSize: 10.5, color: MUTED })
  })
}

// ---------------------------------------------------------- priority gaps
export function priorityGaps(slide: SlideFn, g: GapReport, head?: Head) {
  const top = g.top
  if (!top.length) return
  const s = slide({
    eyebrow: head?.eyebrow ?? eyebrow(g, "priority"),
    title: head?.title ?? outlineEntry(g, "priority").title,
    section: head?.section ?? "Findings",
    notes: top.map((x, i) => `${i + 1}. ${x.id} ${x.title}. Today: ${x.gap || x.how}. Recommendation: ${x.recommendation}. Owner: ${x.owner.person ?? x.owner.role}; about ${x.weeks} weeks.`).join("\n"),
  })
  const cw = (CW - 2 * 0.22) / 3
  const ch = (BOTTOM - TOP - 0.16) / 2
  const iw = cw - 0.4
  top.forEach((x, i) => {
    const cx = MX + (i % 3) * (cw + 0.22)
    const cy = TOP + Math.floor(i / 3) * (ch + 0.16)
    card(s, cx, cy, cw, ch)
    numberCircle(s, cx + 0.2, cy + 0.2, i + 1, ROSE, 0.3)
    let at = cx + 0.6
    at += chip(s, at, cy + 0.23, x.id, INK, { size: 9, h: 0.24 }) + 0.08
    chip(s, at, cy + 0.23, x.category, x.core ? GREEN : MUTED, { size: 9, h: 0.24 })
    const title = fit(x.title, iw, 13, 3, true)
    const th = lineCount(title, iw, 13, true) * lineH(13)
    let y = cy + 0.64
    text(s, title, { x: cx + 0.2, y, w: iw, h: th + 0.04, fontSize: 13, bold: true })
    y += th + 0.12
    const today = fitAfter("Today", x.gap || x.how, iw, 10.5, 2)
    const tdh = textH(`Today  ${today}`, iw, 10.5)
    s.addText(
      [
        { text: "Today  ", options: { bold: true, color: INK } },
        { text: today, options: { color: MUTED } },
      ],
      { x: cx + 0.2, y, w: iw, h: tdh + 0.04, fontFace: FONT, fontSize: 10.5, margin: 0, valign: "top", isTextBox: true },
    )
    y += tdh + 0.1
    const room = cy + ch - 0.38 - y
    const action = fitAfter("Action", x.recommendation ?? "", iw, 10.5, Math.max(1, Math.floor(room / lineH(10.5))))
    s.addText(
      [
        { text: "Action  ", options: { bold: true, color: GREEN } },
        { text: action, options: { color: INK } },
      ],
      { x: cx + 0.2, y, w: iw, h: Math.max(0.2, room), fontFace: FONT, fontSize: 10.5, margin: 0, valign: "top", isTextBox: true },
    )
    text(s, `${x.owner.person ? `${x.owner.person} · ` : ""}${x.owner.role} · about ${x.weeks} weeks`, { x: cx + 0.2, y: cy + ch - 0.34, w: iw, h: 0.22, fontSize: 9.5, color: FAINT })
  })
}

// -------------------------------------------------------------- BRSR Core
function brsrCore(slide: SlideFn, g: GapReport) {
  const c = g.core
  const s = slide({
    eyebrow: eyebrow(g, "core"),
    title: outlineEntry(g, "core").title,
    section: "Findings",
    notes: `BRSR Core is what an independent assessment or assurance provider will trace to source documents. ${c.attributes.map((a) => `Attribute ${a.n}, ${a.name}: ${STATUS_TEXT[a.status]}. ${a.note}`).join(" ")}`,
  })
  const cw = (CW - 2 * 0.2) / 3
  const ch = 1.6
  c.attributes.forEach((a, i) => {
    const x = MX + (i % 3) * (cw + 0.2)
    const y = TOP + Math.floor(i / 3) * (ch + 0.13)
    const color = STATUS_COLOR[a.status]
    card(s, x, y, cw, ch, tint(color, 0.93))
    text(s, `ATTRIBUTE ${a.n}`, { x: x + 0.22, y: y + 0.18, w: 1.6, h: 0.2, fontSize: 9, bold: true, color: FAINT, charSpacing: 1.2 })
    chip(s, x + cw - 0.22 - (STATUS_TEXT[a.status].length * 9 * 0.0078 + 0.26), y + 0.14, STATUS_TEXT[a.status], color, { size: 9, h: 0.24, solid: true })
    text(s, a.name, { x: x + 0.22, y: y + 0.44, w: cw - 0.44, h: 0.3, fontSize: 13, bold: true })
    text(s, a.items.map((x) => x.id).join(" · "), { x: x + 0.22, y: y + 0.76, w: cw - 0.44, h: 0.22, fontSize: 9.5, color: FAINT })
    text(s, clip(a.note, 95), { x: x + 0.22, y: y + 1.02, w: cw - 0.44, h: 0.48, fontSize: 10.5, color: MUTED })
  })
}

// ----------------------------------------------------------------- plants
function plants(slide: SlideFn, g: GapReport) {
  if (!g.plants.length) return
  const pages = Math.ceil(g.plants.length / 12)
  for (let pg = 0; pg < pages; pg++) {
    const list = g.plants.slice(pg * 12, pg * 12 + 12)
    const s = slide({
      eyebrow: `${eyebrow(g, "plants")}${pages > 1 ? ` (${pg + 1} of ${pages})` : ""}`,
      title: outlineEntry(g, "plants").title,
      section: "Findings",
      notes: `${g.plantsNote} ${g.plants.map((p) => `${p.name}: ${AREAS.map((a) => `${a.label} ${STATUS_TEXT[p.areas[a.id].status].toLowerCase()}`).join(", ")}`).join(". ")}.`,
    })
    const cols = [
      { label: "Plant", w: 3.15 },
      { label: "Energy readings", w: 1.35 },
      ...AREAS.map((a) => ({ label: a.label, w: 1.17 })),
      { label: "Interview", w: 1.05 },
      { label: "Open gaps", w: 0.88 },
    ]
    const xs: number[] = []
    let at = MX
    for (const c of cols) {
      xs.push(at)
      at += c.w
    }
    const headH = 0.42
    const rowH = Math.min(0.37, (BOTTOM - TOP - headH - 0.35) / list.length)
    cols.forEach((c, i) => text(s, c.label, { x: xs[i] + (i ? 0.04 : 0), y: TOP, w: c.w - 0.08, h: headH, fontSize: 10.5, bold: true, color: MUTED, align: i ? "center" : "left", valign: "bottom" }))
    s.addShape("line", { x: MX, y: TOP + headH + 0.04, w: CW, h: 0, line: { color: LINE, width: 1 } })
    list.forEach((p, ri) => {
      const y = TOP + headH + 0.1 + ri * rowH
      if (ri % 2 === 1) s.addShape("rect", { x: MX, y, w: CW, h: rowH, fill: { color: "F8FAFC" }, line: { color: "F8FAFC", width: 0 } })
      text(s, clip(p.name, 38), { x: xs[0] + 0.05, y, w: cols[0].w - 0.1, h: rowH, fontSize: 11, color: INK, valign: "middle" })
      const rd = p.readings
      text(s, rd === null ? "No data" : `${rd}%`, { x: xs[1], y, w: cols[1].w, h: rowH, fontSize: 11, bold: rd !== null, color: rd === null ? FAINT : rd >= 90 ? GREEN : rd >= 50 ? AMBER : ROSE, align: "center", valign: "middle" })
      AREAS.forEach((a, ai) => {
        const cell = p.areas[a.id]
        const color = STATUS_COLOR[cell.status]
        const cx = xs[2 + ai] + 0.1
        const cw = cols[2 + ai].w - 0.2
        s.addShape("roundRect", { x: cx, y: y + 0.06, w: cw, h: rowH - 0.12, fill: { color: tint(color, 0.85) }, line: { color: tint(color, 0.85), width: 0 }, rectRadius: 0.05 })
        text(s, STATUS_TEXT[cell.status], { x: cx, y: y + 0.06, w: cw, h: rowH - 0.12, fontSize: 9.5, bold: true, color, align: "center", valign: "middle" })
      })
      const iv = xs[2 + AREAS.length]
      text(s, p.interview === "done" ? "Done" : p.interview === "planned" ? "Planned" : "—", { x: iv, y, w: cols[2 + AREAS.length].w, h: rowH, fontSize: 10.5, color: p.interview === "done" ? GREEN : MUTED, align: "center", valign: "middle" })
      text(s, String(p.gaps), { x: xs[cols.length - 1], y, w: cols[cols.length - 1].w, h: rowH, fontSize: 11, bold: true, color: p.gaps ? INK : FAINT, align: "center", valign: "middle" })
    })
    text(s, g.plantsNote, { x: MX, y: BOTTOM - 0.24, w: CW, h: 0.24, fontSize: 9.5, color: FAINT })
  }
}

// ------------------------------------------------------------- interviews
function interviews(slide: SlideFn, g: GapReport) {
  const iv = g.interviews
  if (!iv.planned) return
  const done = iv.rows.filter((r) => r.status === "done")
  if (!done.length) {
    const s = slide({
      eyebrow: eyebrow(g, "interviews"),
      title: outlineEntry(g, "interviews").title,
      section: "Findings",
      notes: "The interviews confirm what is practised, not just what documents say. Findings open, weaken or confirm BRSR items.",
    })
    const rows = iv.rows.slice(0, 11)
    rows.forEach((r, i) => {
      const y = TOP + i * 0.44
      if (i % 2 === 0) s.addShape("rect", { x: MX, y, w: 6.6, h: 0.44, fill: { color: "F8FAFC" }, line: { color: "F8FAFC", width: 0 } })
      text(s, r.title, { x: MX + 0.1, y, w: 4.3, h: 0.44, fontSize: 12, valign: "middle" })
      text(s, new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), { x: MX + 4.5, y, w: 2, h: 0.44, fontSize: 12, color: MUTED, valign: "middle", align: "right" })
    })
    if (iv.rows.length > rows.length) text(s, `and ${iv.rows.length - rows.length} more`, { x: MX + 0.1, y: TOP + rows.length * 0.44 + 0.05, w: 4, h: 0.3, fontSize: 11, color: FAINT })
    const x = 7.75
    FOCI.forEach((f, i) => {
      const y = TOP + i * 1.2
      card(s, x, y, W - MX - x, 1.05)
      text(s, FOCUS_LABEL[f], { x: x + 0.25, y: y + 0.18, w: W - MX - x - 0.5, h: 0.3, fontSize: 13, bold: true })
      text(s, FOCUS_TEXT[f], { x: x + 0.25, y: y + 0.5, w: W - MX - x - 0.5, h: 0.45, fontSize: 11, color: MUTED })
    })
    return
  }
  const s = slide({
    eyebrow: eyebrow(g, "interviews"),
    title: outlineEntry(g, "interviews").title,
    section: "Findings",
    notes: iv.issues.slice(0, 8).map((x) => `${x.who}, ${FOCUS_LABEL[x.focus].toLowerCase()}: ${RATING_TEXT[x.rating]}. ${x.text} Recommendation: ${x.recommendation}`).join("\n"),
  })
  // Answers so far, then the matrix of interviews held × focus areas.
  const lw = 2.55
  const fw = 1.05
  const mw = lw + 4 * fw
  const total = iv.inPlace + iv.partial + iv.notInPlace
  s.addText(
    [
      { text: `${total} answers  `, options: { bold: true, color: INK } },
      { text: `${iv.inPlace} in place · ${iv.partial} partly · ${iv.notInPlace} not in place`, options: { color: MUTED } },
    ],
    { x: MX, y: TOP, w: mw, h: 0.26, fontFace: FONT, fontSize: 11.5, margin: 0, valign: "top", isTextBox: true },
  )
  const bar = TOP + 0.36
  let at = MX
  for (const [v, color] of [
    [iv.inPlace, GREEN],
    [iv.partial, AMBER],
    [iv.notInPlace, ROSE],
  ] as const) {
    if (!v || !total) continue
    const ww = (v / total) * mw
    s.addShape("rect", { x: at, y: bar, w: ww, h: 0.12, fill: { color }, line: { color, width: 0 } })
    at += ww
  }
  const headY = TOP + 0.72
  const headH = 0.62
  FOCI.forEach((f, i) => text(s, FOCUS_LABEL[f], { x: MX + lw + i * fw, y: headY, w: fw - 0.06, h: headH, fontSize: 9.5, bold: true, color: MUTED, align: "center", valign: "bottom" }))
  const rows = done.slice(0, 7)
  const rowH = 0.44
  rows.forEach((r, ri) => {
    const y = headY + headH + 0.1 + ri * rowH
    text(s, clip(r.title, 32), { x: MX, y, w: lw - 0.1, h: rowH, fontSize: 11, valign: "middle" })
    FOCI.forEach((f, ci) => {
      const cell = r.cells[f]
      const cx = MX + lw + ci * fw + 0.06
      const color = cell.rating ? RATING_COLOR[cell.rating] : LINE
      s.addShape("roundRect", { x: cx, y: y + 0.06, w: fw - 0.18, h: rowH - 0.12, fill: { color: cell.rating ? tint(color, 0.82) : PANEL }, line: { color: cell.rating ? tint(color, 0.82) : PANEL, width: 0 }, rectRadius: 0.05 })
      text(s, cell.rating ? RATING_TEXT[cell.rating] : cell.total ? "Not asked" : "—", { x: cx, y: y + 0.06, w: fw - 0.18, h: rowH - 0.12, fontSize: 9, bold: !!cell.rating, color: cell.rating ? color : FAINT, align: "center", valign: "middle" })
    })
  })
  const ny = headY + headH + 0.2 + rows.length * rowH
  text(s, `Worst answer per focus area. ${iv.planned - iv.done} interviews not held yet${done.length > rows.length ? `; ${done.length - rows.length} more held, listed in the data workbook` : ""}.`, { x: MX, y: ny, w: mw, h: 0.45, fontSize: 10, color: FAINT })
  // What we heard
  const x = MX + mw + 0.45
  const w = W - MX - x
  const iw = w - 0.44
  text(s, "WHAT WE HEARD, AND WHAT TO DO", { x, y: TOP, w, h: 0.24, fontSize: 9.5, bold: true, color: FAINT, charSpacing: 1.2 })
  const issues = iv.issues.slice(0, 3)
  const ch = (BOTTOM - TOP - 0.38 - 2 * 0.14) / 3
  issues.forEach((it, i) => {
    const y = TOP + 0.38 + i * (ch + 0.14)
    card(s, x, y, w, ch)
    const cwid = chip(s, x + 0.22, y + 0.18, RATING_TEXT[it.rating], RATING_COLOR[it.rating], { size: 9, h: 0.24, solid: true })
    text(s, fit(`${it.who} · ${FOCUS_LABEL[it.focus]}`, iw - cwid - 0.14, 11, 1, true), { x: x + 0.22 + cwid + 0.14, y: y + 0.18, w: iw - cwid - 0.14, h: 0.24, fontSize: 11, bold: true, valign: "middle" })
    const q = fit(it.text, iw, 10.5, 3)
    const qh = textH(q, iw, 10.5)
    text(s, q, { x: x + 0.22, y: y + 0.54, w: iw, h: qh + 0.04, fontSize: 10.5, color: MUTED })
    const room = y + ch - 0.14 - (y + 0.54 + qh + 0.1)
    text(s, fit(`→ ${it.recommendation}`, iw, 10.5, Math.max(1, Math.floor(room / lineH(10.5)))), { x: x + 0.22, y: y + 0.54 + qh + 0.1, w: iw, h: Math.max(0.2, room), fontSize: 10.5, color: INK })
  })
}

const FOCUS_TEXT: Record<(typeof FOCI)[number], string> = {
  governance: "Who is accountable, which policies exist and whether the Board oversees them.",
  practice: "Whether policies are applied at every plant, with procedures, training and records.",
  systems: "How each number is produced, kept and checked before it is reported.",
  availability: "Which data exists today, for which plants and months, and where it is kept.",
}

// ------------------------------------------------------------------- ISSB
function issb(pptx: PptxGenJS, slide: SlideFn, g: GapReport) {
  const s = slide({
    eyebrow: eyebrow(g, "issb"),
    title: outlineEntry(g, "issb").title,
    section: "Findings",
    notes: `ISSB is not mandatory in India today; international investors expect it. ${g.issb.pillars.map((p) => `${p.name}: ${p.covered} covered, ${p.partial} partly, ${p.not} not covered`).join("; ")}.`,
  })
  const labels = g.issb.pillars.map((p) => p.name)
  s.addChart(
    pptx.ChartType.bar,
    [
      { name: "Covered by BRSR", labels, values: g.issb.pillars.map((p) => p.covered) },
      { name: "Partly covered", labels, values: g.issb.pillars.map((p) => p.partial) },
      { name: "Not covered", labels, values: g.issb.pillars.map((p) => p.not) },
    ],
    { ...barChart(), x: MX - 0.1, y: TOP - 0.05, w: 6.5, h: BOTTOM - TOP + 0.05, barGapWidthPct: 50 },
  )
  const x = 7.2
  const w = W - MX - x
  const iw = w - 0.44
  text(s, "NOT COVERED BY BRSR: THE LARGEST GAPS", { x, y: TOP, w, h: 0.24, fontSize: 9.5, bold: true, color: FAINT, charSpacing: 1.2 })
  const list = g.issb.beyond.slice(0, 4)
  const ch = (BOTTOM - TOP - 0.38 - 3 * 0.12) / 4
  list.forEach((it, i) => {
    const y = TOP + 0.38 + i * (ch + 0.12)
    card(s, x, y, w, ch)
    const label = g.priorityLabel[it.priority]
    const chipW = label.length * 9 * 0.0078 + 0.26
    chip(s, x + w - 0.22 - chipW, y + 0.15, label, PRIORITY_COLOR[it.priority], { size: 9, h: 0.24 })
    const tw = iw - chipW - 0.15
    const title = fit(it.title, tw, 12, 2, true)
    const th = lineCount(title, tw, 12, true) * lineH(12)
    text(s, title, { x: x + 0.22, y: y + 0.14, w: tw, h: th + 0.04, fontSize: 12, bold: true })
    const gy = y + 0.14 + th + 0.08
    const room = y + ch - 0.1 - gy
    text(s, fit(`${it.ref} · ${it.gap}`, iw, 10, Math.max(1, Math.floor(room / lineH(10)))), { x: x + 0.22, y: gy, w: iw, h: Math.max(0.2, room), fontSize: 10, color: MUTED })
  })
}

// A fresh object per chart: pptxgenjs converts option values in place.
export const barChart = (): PptxGenJS.IChartOpts => ({
  barDir: "bar",
  barGrouping: "stacked",
  chartColors: [GREEN, AMBER, ROSE],
  catAxisOrientation: "maxMin" as "minMax",
  catAxisLabelFontSize: 11,
  catAxisLabelFontFace: FONT,
  catAxisLabelColor: MUTED,
  catAxisLineShow: false,
  valAxisHidden: true,
  valGridLine: { style: "none" },
  catGridLine: { style: "none" },
  showValue: true,
  dataLabelPosition: "ctr",
  dataLabelColor: WHITE,
  dataLabelFontSize: 10,
  dataLabelFontFace: FONT,
  dataLabelFormatCode: "0;;;",
  showLegend: true,
  legendPos: "t",
  legendFontSize: 11,
  legendFontFace: FONT,
  legendColor: MUTED,
})

// ------------------------------------------------------------------- peer
function peer(slide: SlideFn, g: GapReport) {
  const p = g.peer
  if (!p) return
  const s = slide({
    eyebrow: eyebrow(g, "peer"),
    title: outlineEntry(g, "peer").title,
    section: "Findings",
    notes: `${p.note} Scaled values multiply ${p.short}'s value per ₹ crore of revenue by ${g.clientShort}'s revenue: an order of magnitude only, never ${g.clientShort}'s data.`,
  })
  const rows = p.rows
  const head = (t: string, align: "left" | "right" = "right"): PptxGenJS.TableCell => ({ text: t, options: { bold: true, color: MUTED, fontSize: 10.5, align, valign: "bottom", border: [{ type: "none" }, { type: "none" }, { type: "solid", pt: 1, color: LINE }, { type: "none" }] } })
  const cell = (t: string, o: PptxGenJS.TableCellProps = {}): PptxGenJS.TableCell => ({ text: t, options: { fontSize: 11, color: INK, align: "right", valign: "middle", border: [{ type: "none" }, { type: "none" }, { type: "solid", pt: 0.5, color: LINE }, { type: "none" }], ...o } })
  s.addTable(
    [
      [head("Metric", "left"), head(`${p.short} · filed ${p.fy}`), head(`${g.clientShort} at ${p.short}'s intensity`), head(`${g.clientShort} · its own data`)],
      ...rows.map((r) => [
        cell(r.label, { align: "left" }),
        cell(fmt(r.peer, r.unit), { bold: true }),
        cell(r.scaled !== undefined ? fmt(r.scaled, r.unit) : "Not scaled", { color: r.scaled !== undefined ? MUTED : FAINT, italic: r.scaled !== undefined }),
        cell(r.ours ? `${fmt(r.ours.value, r.ours.unit)}${r.ours.estimate ? " *" : ""}` : "Not shared yet", { color: r.ours ? INK : FAINT, bold: !!r.ours }),
      ]),
    ],
    { x: MX, y: TOP, w: 8.6, colW: [2.9, 1.9, 2.0, 1.8], rowH: Math.min(0.36, (BOTTOM - TOP - 0.5) / (rows.length + 1)), fontFace: FONT, margin: [0.03, 0.08, 0.03, 0.08] },
  )
  const x = 9.6
  const w = W - MX - x
  const notes: [string, string][] = [
    [`${p.plants ?? "—"} plants`, `${p.short}'s filed boundary; assurance: ${p.assurance.toLowerCase()}.`],
    [`${(() => {
      const rev = rows.find((r) => r.id === "revenue")
      return rev?.ours ? `${(rev.ours.value / rev.peer).toLocaleString("en-IN", { maximumFractionDigits: 1 })}×` : "—"
    })()}`, `${g.clientShort}'s revenue relative to ${p.short}'s; scaled values show order of magnitude only.`],
  ]
  notes.forEach(([big, small], i) => {
    const y = TOP + i * 1.5
    card(s, x, y, w, 1.32)
    text(s, big, { x: x + 0.25, y: y + 0.18, w: w - 0.5, h: 0.5, fontSize: 24, bold: true })
    text(s, small, { x: x + 0.25, y: y + 0.72, w: w - 0.5, h: 0.5, fontSize: 10.5, color: MUTED })
  })
  text(s, `* Includes estimates. ${g.clientShort}'s own figures come from the files it has shared; investors will read the first BRSR beside ${p.short}'s line by line.`, { x, y: TOP + 3.1, w, h: 1.2, fontSize: 10, color: FAINT })
}

// -------------------------------------------------------- recommendations
export function recommendations(slide: SlideFn, g: GapReport, head?: Head) {
  const recs = g.recommendations.slice(0, 8)
  const s = slide({
    eyebrow: head?.eyebrow ?? eyebrow(g, "recommendations"),
    title: head?.title ?? outlineEntry(g, "recommendations").title,
    section: head?.section ?? "Recommendations",
    notes: recs.map((r) => `${r.n}. ${r.title}: ${r.action} Owner: ${r.owner}. ${r.when}.`).join("\n"),
  })
  const rowsPer = Math.ceil(recs.length / 2)
  const cw = (CW - 0.25) / 2
  const ch = (BOTTOM - TOP - (rowsPer - 1) * 0.12) / rowsPer
  const iw = cw - 0.92
  recs.forEach((r, i) => {
    const x = MX + Math.floor(i / rowsPer) * (cw + 0.25)
    const y = TOP + (i % rowsPer) * (ch + 0.12)
    card(s, x, y, cw, ch)
    numberCircle(s, x + 0.2, y + 0.18, r.n, r.before ? ROSE : BLUE, 0.34)
    text(s, r.title, { x: x + 0.7, y: y + 0.15, w: iw, h: 0.26, fontSize: 12.5, bold: true })
    const room = ch - 0.44 - 0.38
    const lines = Math.max(1, Math.floor(room / lineH(10.5)))
    text(s, fit(r.action, iw, 10.5, lines), { x: x + 0.7, y: y + 0.44, w: iw, h: lines * lineH(10.5) + 0.04, fontSize: 10.5, color: INK })
    const label = r.before ? `${r.before} ${g.when["Before listing"]}` : `${r.items} items`
    const chipW = chip(s, x + 0.7, y + ch - 0.34, label, r.before ? ROSE : BLUE, { size: 9, h: 0.24 })
    const meta = fit(`${r.owner.split(", ")[0]} · ${r.when}`, iw - chipW - 0.12, 9.5, 1)
    text(s, meta, { x: x + 0.7 + chipW + 0.12, y: y + ch - 0.34, w: iw - chipW - 0.12, h: 0.24, fontSize: 9.5, color: FAINT, valign: "middle" })
  })
}

// ------------------------------------------------------------ how the gaps close
const ROUTE_COLOR: Record<string, string> = { collect: CYAN, document: VIOLET, decide: "EA580C", draft: GREEN, partners: BLUE }

// The loop after the gap analysis, and the five routes a gap closes by.
export function closingLoop(slide: SlideFn, g: GapReport, head?: Head) {
  const c = g.closing
  if (!c.open) return
  const s = slide({
    eyebrow: head?.eyebrow ?? eyebrow(g, "closing"),
    title: head?.title ?? outlineEntry(g, "closing").title,
    section: head?.section ?? "Recommendations",
    notes: `${c.loop.map((x, i) => `${i + 1}. ${x.title}: ${x.text}`).join("\n")}\n\n${c.routes.map((r) => `${r.label} (${r.open} open): ${r.how} Closes when ${r.closesWhen.toLowerCase()} Verified by ${r.verifiedBy.toLowerCase()}`).join("\n")}\n\n${c.cadence.join("\n")}`,
  })
  // The loop: five steps left to right, with the way back drawn underneath.
  const gap = 0.2
  const bw = (CW - 4 * gap) / 5
  const bh = 1.3
  c.loop.forEach((step, i) => {
    const x = MX + i * (bw + gap)
    card(s, x, TOP, bw, bh, i === 1 ? tint(CYAN, 0.88) : PANEL)
    numberCircle(s, x + 0.16, TOP + 0.14, i + 1, i === 1 ? CYAN : INK, 0.3)
    text(s, step.title, { x: x + 0.55, y: TOP + 0.15, w: bw - 0.65, h: 0.28, fontSize: 12, bold: true })
    text(s, fit(step.text, bw - 0.3, 9.5, 4), { x: x + 0.16, y: TOP + 0.5, w: bw - 0.3, h: bh - 0.56, fontSize: 9.5, color: MUTED })
    if (i < 4) text(s, "›", { x: x + bw, y: TOP + bh / 2 - 0.2, w: gap, h: 0.36, fontSize: 18, bold: true, color: FAINT, align: "center", valign: "middle" })
  })
  const back = TOP + bh + 0.14
  const x2 = MX + bw + gap + bw / 2
  const x5 = MX + 4 * (bw + gap) + bw / 2
  s.addShape("line", { x: x2, y: back, w: 0, h: 0.16, line: { color: CYAN, width: 1.5, beginArrowType: "triangle" } })
  s.addShape("line", { x: x2, y: back + 0.16, w: x5 - x2, h: 0, line: { color: CYAN, width: 1.5 } })
  s.addShape("line", { x: x5, y: back, w: 0, h: 0.16, line: { color: CYAN, width: 1.5 } })
  text(s, "Still open after a closed month or the review? It goes back to its owner.", { x: x2 + 0.15, y: back + 0.2, w: x5 - x2 - 0.3, h: 0.24, fontSize: 9.5, color: CYAN, align: "center" })

  // The routes.
  const y0 = back + 0.62
  const head2 = (t: string, align: "left" | "right" = "left"): PptxGenJS.TableCell => ({ text: t, options: { bold: true, color: MUTED, fontSize: 10, align, valign: "bottom", border: [{ type: "none" }, { type: "none" }, { type: "solid", pt: 1, color: LINE }, { type: "none" }] } })
  const cell = (t: string, o: PptxGenJS.TableCellProps = {}): PptxGenJS.TableCell => ({ text: t, options: { fontSize: 10, color: INK, valign: "top", border: [{ type: "none" }, { type: "none" }, { type: "solid", pt: 0.5, color: LINE }, { type: "none" }], ...o } })
  const rowH = (BOTTOM - y0 - 0.32 - (c.follows ? 0.3 : 0)) / c.routes.length
  s.addTable(
    [
      [head2("Route"), head2("Open", "right"), head2("Loops back to"), head2("Closes when"), head2("Verified by")],
      ...c.routes.map((r) => [
        cell(r.label, { bold: true, color: ROUTE_COLOR[r.id] }),
        cell(`${r.open}${r.before ? ` (${r.before} ${g.when["Before listing"]})` : ""}`, { align: "right", bold: true }),
        cell(cap(r.loop)),
        cell(fit(r.closesWhen, 3.9, 10, 2)),
        cell(fit(r.verifiedBy, 2.75, 10, 2), { color: MUTED }),
      ]),
    ],
    { x: MX, y: y0, w: CW, colW: [2.0, 1.95, 2.2, 3.98, CW - 10.13], rowH: [0.32, ...c.routes.map(() => rowH)], fontFace: FONT, margin: [0.04, 0.08, 0.04, 0.08] },
  )
  if (c.follows) text(s, `Plus ${c.follows} ISSB requirement${c.follows === 1 ? "" : "s"} BRSR already covers: ${c.follows === 1 ? "it closes" : "they close"} with the BRSR items ${c.follows === 1 ? "it maps" : "they map"} to.`, { x: MX, y: BOTTOM - 0.22, w: CW, h: 0.22, fontSize: 9, color: FAINT })
}

// Data gaps: which close by monthly collection, which need a metric added, company data or a request.
export function closingData(slide: SlideFn, g: GapReport, head?: Head) {
  const d = g.closing.data
  if (!d.open) return
  const addItems = new Set(d.add.flatMap((x) => x.items)).size
  const s = slide({
    eyebrow: head?.eyebrow ?? eyebrow(g, "closing"),
    title: head?.title ?? `${d.open} data gaps loop back into collection; ${addItems ? `${addItems} need a metric added to the templates first` : "the templates already cover the monthly ones"}`,
    section: head?.section ?? "Recommendations",
    notes: `Monthly collection: ${d.monthly}. Add to the templates: ${d.add.map((x) => `${x.metrics} (${x.items.join(", ")}): ${x.why}`).join(" ")} Company data: ${d.annual.items.join(", ")}${d.annual.fields.length ? ` needs ${d.annual.fields.join(", ")}` : ""}. Data requests: ${d.requests.count}, ${d.requests.owners.map(([o, n]) => `${o} ${n}`).join(", ")}.`,
  })
  const lw = 3.3
  const tiles: [number, string, string, string][] = [
    [d.monthly, "Monthly collection", "Already in the templates: close the months and approve them", CYAN],
    [addItems, "Add a metric", "The templates lack it: add it, then collect it monthly", VIOLET],
    [d.annual.items.length, "Company data", "From the audited financial statements, once a year", GREEN],
    [d.requests.count, "Data request", "Owner sends the data; the answer is drafted and confirmed in review", AMBER],
  ]
  const th = (BOTTOM - TOP - 3 * 0.14) / 4
  tiles.forEach(([v, label, help, color], i) => {
    const y = TOP + i * (th + 0.14)
    card(s, MX, y, lw, th)
    s.addShape("rect", { x: MX, y, w: 0.08, h: th, fill: { color }, line: { color, width: 0 } })
    text(s, String(v), { x: MX + 0.28, y: y + 0.12, w: 0.9, h: 0.5, fontSize: 26, bold: true, color })
    text(s, label, { x: MX + 1.2, y: y + 0.16, w: lw - 1.35, h: 0.26, fontSize: 12, bold: true })
    text(s, fit(help, lw - 1.35, 9.5, 3), { x: MX + 1.2, y: y + 0.44, w: lw - 1.35, h: th - 0.5, fontSize: 9.5, color: MUTED })
  })

  const x = MX + lw + 0.4
  const w = W - MX - x
  let y = TOP
  text(s, "ADD TO THE MONTHLY TEMPLATES", { x, y, w, h: 0.24, fontSize: 10, bold: true, color: VIOLET, charSpacing: 1.2 })
  y += 0.34
  if (!d.add.length) {
    text(s, "Nothing: the templates already carry every metric the open data gaps need.", { x, y, w, h: 0.3, fontSize: 11, color: MUTED })
    y += 0.45
  }
  for (const a of d.add) {
    const body = cap(a.metrics)
    const h1 = textH(body, w - 0.3, 11.5, true)
    const why = `${a.why} Closes ${a.items.join(", ")}.`
    const h2 = textH(why, w - 0.3, 9.5)
    dot(s, x, y + 0.05, 0.13, VIOLET)
    text(s, body, { x: x + 0.3, y, w: w - 0.3, h: h1, fontSize: 11.5, bold: true })
    text(s, why, { x: x + 0.3, y: y + h1 + 0.02, w: w - 0.3, h: h2, fontSize: 9.5, color: MUTED })
    y += h1 + h2 + 0.14
  }
  y += 0.08
  if (d.annual.items.length) {
    text(s, "COMPANY DATA, ONCE A YEAR", { x, y, w, h: 0.24, fontSize: 10, bold: true, color: GREEN, charSpacing: 1.2 })
    y += 0.3
    const t = fit(d.annual.fields.length ? `${d.annual.items.join(", ")}: ${d.annual.fields.map(lower1).join("; ")}.` : `${d.annual.items.join(", ")}: entered; awaiting approval.`, w, 10, 3)
    text(s, t, { x, y, w, h: textH(t, w, 10) + 0.04, fontSize: 10 })
    y += textH(t, w, 10) + 0.2
  }
  if (d.requests.count && y < BOTTOM - 0.6) {
    text(s, "DATA REQUESTS TO OWNERS", { x, y, w, h: 0.24, fontSize: 10, bold: true, color: AMBER, charSpacing: 1.2 })
    y += 0.3
    const t = `${d.requests.owners.map(([o, k]) => `${o} ${k}`).join(" · ")}. For example: ${d.requests.examples.map((e) => lower1(e)).join("; ")}.`
    const lines = Math.max(1, Math.floor((BOTTOM - y) / lineH(10)))
    text(s, fit(t, w, 10, lines), { x, y, w, h: BOTTOM - y, fontSize: 10 })
  }
}
const lower1 = (t: string) => (/^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t)
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

// ------------------------------------------------------------ standardise
export function standardise(slide: SlideFn, g: GapReport, head?: Head) {
  const st = g.standardise
  const s = slide({
    eyebrow: head?.eyebrow ?? eyebrow(g, "standardise"),
    title: head?.title ?? outlineEntry(g, "standardise").title,
    section: head?.section ?? "Recommendations",
    notes: `At every plant: ${st.plants.join(" ")}\n\nCorporate oversight: ${st.corporate.join(" ")}`,
  })
  const cw = (CW - 0.3) / 2
  const cols: [string, string[], string][] = [
    [`THE SAME AT EVERY PLANT (${g.plants.length})`, st.plants, CYAN],
    ["OVERSIGHT FROM CORPORATE", st.corporate, VIOLET],
  ]
  cols.forEach(([label, list, color], ci) => {
    const x = MX + ci * (cw + 0.3)
    card(s, x, TOP, cw, BOTTOM - TOP)
    text(s, label, { x: x + 0.3, y: TOP + 0.25, w: cw - 0.6, h: 0.24, fontSize: 10, bold: true, color, charSpacing: 1.2 })
    const rowH = (BOTTOM - TOP - 0.75) / list.length
    list.forEach((t, i) => {
      const y = TOP + 0.65 + i * rowH
      numberCircle(s, x + 0.3, y, i + 1, color, 0.32)
      text(s, fit(t, cw - 1.1, 12.5, Math.max(1, Math.floor((rowH - 0.1) / lineH(12.5)))), { x: x + 0.78, y: y - 0.01, w: cw - 1.1, h: rowH - 0.08, fontSize: 12.5, color: INK })
    })
  })
}

// ---------------------------------------------------------------- roadmap
export function roadmap(slide: SlideFn, g: GapReport, head?: Head) {
  const ms = g.roadmap
  const horizon = Math.max(...ms.map((x) => x.end))
  const s = slide({
    eyebrow: head?.eyebrow ?? eyebrow(g, "roadmap"),
    title: head?.title ?? outlineEntry(g, "roadmap").title,
    section: head?.section ?? "Recommendations",
    notes: ms.map((x) => `${x.id} ${x.title}, ${x.from} to ${x.to}: ${x.outcome}. ${x.items} items, ${x.before} ${g.when["Before listing"]}.`).join("\n"),
  })
  const lw = 3.6
  const x0 = MX + lw
  const tw = W - MX - x0 - 0.1
  const rowH = 0.92
  const y0 = TOP + 0.42
  const start = new Date(g.generatedAt)
  for (let wk = 0; wk <= horizon; wk += 13) {
    const x = x0 + (wk / horizon) * tw
    s.addShape("line", { x, y: y0 - 0.05, w: 0, h: ms.length * rowH, line: { color: LINE, width: 0.75, dashType: "dash" } })
    const d = new Date(start.getTime() + wk * 7 * 86400000)
    text(s, d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), { x: x - 0.55, y: TOP, w: 1.1, h: 0.26, fontSize: 9.5, color: FAINT, align: "center" })
  }
  ms.forEach((m, i) => {
    const y = y0 + i * rowH
    const color = MS_COLOR[m.id] ?? GREEN
    numberCircle(s, MX, y + 0.08, m.id, color, 0.42)
    text(s, m.title, { x: MX + 0.55, y: y + 0.04, w: lw - 0.7, h: 0.28, fontSize: 12.5, bold: true })
    text(s, clip(m.outcome, 80), { x: MX + 0.55, y: y + 0.33, w: lw - 0.7, h: 0.48, fontSize: 9.5, color: MUTED })
    const bx = x0 + (m.start / horizon) * tw
    const bw = Math.max(0.6, ((m.end - m.start) / horizon) * tw)
    s.addShape("roundRect", { x: bx, y: y + 0.1, w: bw, h: 0.56, fill: { color }, line: { color, width: 0 }, rectRadius: 0.08 })
    const label = `${m.items} items${m.before ? ` · ${m.before} ${g.when["Before listing"]}` : ""}`
    const inside = bw > label.length * 0.075 + 0.3
    const outsideLeft = !inside && bx + bw + 2.7 > W - MX
    text(s, [{ text: `${m.from} – ${m.to}`, options: { fontSize: 9.5, bold: true, breakLine: true } }, { text: label, options: { fontSize: 9.5 } }], {
      x: inside ? bx + 0.14 : outsideLeft ? bx - 2.7 : bx + bw + 0.1,
      y: y + 0.12,
      w: inside ? bw - 0.2 : 2.6,
      h: 0.52,
      color: inside ? WHITE : INK,
      align: outsideLeft ? "right" : "left",
      valign: "middle",
    })
  })
}

// -------------------------------------------------------------- decisions
export function decisions(slide: SlideFn, g: GapReport, head?: Head) {
  const s = slide({
    layout: "dark",
    eyebrow: head?.eyebrow ?? eyebrow(g, "decisions"),
    title: head?.title ?? outlineEntry(g, "decisions").title,
    section: head?.section ?? "Recommendations",
    notes: `Decisions: ${g.decisions.join(" ")}\n\nNext 90 days: ${g.nextSteps.map((x) => `${x.when}: ${x.text}`).join(" ")}`,
  })
  const lw = 5.9
  text(s, "DECISIONS NEEDED", { x: MX, y: TOP, w: lw, h: 0.24, fontSize: 9.5, bold: true, color: "94A3B8", charSpacing: 1.2 })
  const dh = Math.min(0.92, (BOTTOM - TOP - 0.4) / g.decisions.length)
  g.decisions.forEach((d, i) => {
    const y = TOP + 0.42 + i * dh
    numberCircle(s, MX, y, i + 1, MINT, 0.34, NIGHT_TEXT)
    text(s, d, { x: MX + 0.55, y: y - 0.02, w: lw - 0.55, h: dh - 0.1, fontSize: 12.5, color: WHITE })
  })
  const x = MX + lw + 0.7
  const w = W - MX - x
  text(s, "NEXT 90 DAYS", { x, y: TOP, w, h: 0.24, fontSize: 9.5, bold: true, color: "94A3B8", charSpacing: 1.2 })
  s.addShape("line", { x: x + 0.07, y: TOP + 0.5, w: 0, h: (g.nextSteps.length - 1) * 0.9, line: { color: "3A4250", width: 1.5 } })
  g.nextSteps.forEach((st, i) => {
    const y = TOP + 0.42 + i * 0.9
    dot(s, x, y + 0.02, 0.15, MINT)
    text(s, st.when, { x: x + 0.35, y: y - 0.04, w: w - 0.35, h: 0.24, fontSize: 11, bold: true, color: MINT })
    text(s, st.text, { x: x + 0.35, y: y + 0.22, w: w - 0.35, h: 0.6, fontSize: 12, color: WHITE })
  })
}
const NIGHT_TEXT = "0B0F17"

// --------------------------------------------------------------- appendix
function appendix(slide: SlideFn, g: GapReport) {
  const list = g.beforeListing
  if (!list.length) return
  // Paginate by the height each row needs, so pages fill without running over.
  const colW = [0.4, 2.9, 2.75, 3.9, 1.45, 0.733]
  const rowText = (x: (typeof list)[number]) => ({
    gap: `${x.id}  ${clip(x.title, 80)}`,
    today: clip(x.gap || x.how, 110),
    rec: clip(x.recommendation ?? "", 170),
    owner: x.owner.person ? `${x.owner.person} (${x.owner.role})` : x.owner.role,
  })
  const need = (x: (typeof list)[number]) => {
    const t = rowText(x)
    const lines = Math.max(lineCount(t.gap, colW[1] - 0.12, 10, true), lineCount(t.today, colW[2] - 0.12, 10), lineCount(t.rec, colW[3] - 0.12, 10), lineCount(t.owner, colW[4] - 0.12, 10))
    return lines * lineH(10) + 0.11
  }
  const pages: (typeof list)[] = []
  let page: typeof list = []
  let used = 0
  const room = BOTTOM - TOP - 0.3
  for (const x of list) {
    const h = need(x)
    if (page.length && used + h > room) {
      pages.push(page)
      page = []
      used = 0
    }
    page.push(x)
    used += h
  }
  if (page.length) pages.push(page)
  let rank = 0
  pages.forEach((rows, pg) => {
    const s = slide({
      eyebrow: `Appendix · Gap register${pages.length > 1 ? ` · ${pg + 1} of ${pages.length}` : ""}`,
      title: `All ${list.length} gaps to close ${g.when["Before listing"]}, ranked`,
      section: "Appendix",
      notes: "Ranked by score: regulatory weight × 3 + investor relevance × 2 + IPO impact × 3, minus 4 if the item can wait. Every item, with its status, is in the data workbook.",
    })
    const border = [{ type: "none" }, { type: "none" }, { type: "solid", pt: 0.5, color: LINE }, { type: "none" }] as PptxGenJS.TableCellProps["border"]
    const head = (t: string): PptxGenJS.TableCell => ({ text: t, options: { bold: true, color: MUTED, fontSize: 10, valign: "bottom", border: [{ type: "none" }, { type: "none" }, { type: "solid", pt: 1, color: LINE }, { type: "none" }] } })
    const c = (t: string | PptxGenJS.TextProps[], o: PptxGenJS.TableCellProps = {}): PptxGenJS.TableCell => ({ text: t as string, options: { fontSize: 10, color: INK, valign: "top", border, ...o } })
    s.addTable(
      [
        [head("#"), head("Gap"), head("Today"), head("Recommendation"), head("Owner"), head("Effort")],
        ...rows.map((x) => {
          const t = rowText(x)
          rank++
          return [
            c(String(rank), { color: FAINT }),
            c([
              { text: `${x.id}  `, options: { bold: true, color: FAINT } },
              { text: clip(x.title, 80), options: { bold: true } },
            ]),
            c(t.today, { color: MUTED }),
            c(t.rec),
            c(t.owner, { color: MUTED }),
            c(`${x.effort} · ${x.weeks} wk`, { color: MUTED }),
          ]
        }),
      ],
      { x: MX, y: TOP, w: CW, colW, fontFace: FONT, margin: [0.05, 0.06, 0.05, 0.06], autoPage: false },
    )
  })
}

