// PowerPoint deliverables beyond the gap analysis: the implementation roadmap,
// the board and management summary, and the board presentation of the BRSR test
// report. Same design system and model as the gap analysis deck.

import type PptxGenJS from "pptxgenjs"
import type { ReadinessItem } from "../readiness/types"
import { answerAll } from "./answers"
import { fmtN, type ReportModel } from "./model"
import { PRIORITIES, buildGapReport, outlineEntry, type GapReport } from "./gapReport"
import { MS_COLOR, PRIORITY_COLOR, barChart, closingData, closingLoop, decisions, executiveSummary, priorityGaps, roadmap, standardise, type SlideFn } from "./gapDeck"
import { AMBER, BOTTOM, CW, FAINT, FONT, GREEN, INK, LINE, MINT, MUTED, MX, PANEL, ROSE, TOP, W, WHITE, card, chip, fit, lineCount, lineH, newDeck, numberCircle, text, tint } from "./deckKit"
import { CHECKS, sessionStatus } from "../reportReview"

// The gap analysis deck has its own module.
export { gapAnalysisDeck } from "./gapDeck"

function cover(slide: SlideFn, o: { kicker: string; title: string; subtitle: string; meta: string; section: string; notes: string; warning?: string }) {
  const s = slide({ layout: "cover", section: o.section, notes: o.notes })
  text(s, o.kicker, { x: MX, y: 1.45, w: 8.3, h: 0.3, fontSize: 11, bold: true, color: MINT, charSpacing: 1.5 })
  s.addText(o.title, { placeholder: "title" })
  s.addText(o.subtitle, { placeholder: "subtitle" })
  text(s, o.meta, { x: MX, y: 4.78, w: 8.3, h: 0.3, fontSize: 12, color: "94A3B8" })
  if (o.warning) {
    s.addShape("roundRect", { x: MX, y: 5.4, w: 6.6, h: 0.5, fill: { color: "3B0D17" }, line: { color: "9F1239", width: 1 }, rectRadius: 0.06 })
    text(s, o.warning, { x: MX + 0.2, y: 5.4, w: 6.3, h: 0.5, fontSize: 11, bold: true, color: "FDA4AF", valign: "middle" })
  }
  return s
}

const meta = (g: GapReport) => `${g.date} · Prepared by ${g.preparedBy} · Draft for discussion`
const owner = (x: ReadinessItem) => x.owner.person ?? x.owner.role
const n2 = (n: number) => String(n).padStart(2, "0")
const BORDER = [{ type: "none" }, { type: "none" }, { type: "solid", pt: 0.5, color: LINE }, { type: "none" }] as PptxGenJS.TableCellProps["border"]
const HEAD_BORDER = [{ type: "none" }, { type: "none" }, { type: "solid", pt: 1, color: LINE }, { type: "none" }] as PptxGenJS.TableCellProps["border"]

// --------------------------------------------------------------------- roadmap
export function roadmapDeck(m: ReportModel) {
  const g = buildGapReport(m)
  const { pptx, slide } = newDeck({ title: "Implementation roadmap", client: g.clientShort, date: g.date, footer: `${g.clientShort} · Implementation roadmap · ${g.date} · Draft for discussion`, author: g.preparedBy, company: g.legalName })
  const s0 = cover(slide, { kicker: "IMPLEMENTATION ROADMAP · BRSR AND ISSB", title: "Implementation roadmap", subtitle: `${g.legalName} · ${g.fy}`, meta: meta(g), section: "Roadmap", notes: outlineEntry(g, "roadmap").title })
  g.roadmap.forEach((ms, i) => {
    const y = 1.6 + i * 0.82
    numberCircle(s0, 9.6, y, ms.id, MS_COLOR[ms.id] ?? GREEN, 0.5)
    text(s0, ms.title, { x: 10.25, y: y + 0.02, w: 2.6, h: 0.26, fontSize: 12, bold: true, color: WHITE })
    text(s0, `${ms.from} – ${ms.to}`, { x: 10.25, y: y + 0.28, w: 2.6, h: 0.22, fontSize: 10, color: "94A3B8" })
  })

  roadmap(slide, g, { eyebrow: "01 · Roadmap at a glance", section: "Roadmap" })

  g.roadmap.forEach((ms, i) => milestone(slide, g, ms, n2(i + 2)))

  // Ownership by priority
  {
    const owners = [...new Set(m.open.map((x) => x.owner.role))]
      .map((role) => ({ role, person: m.open.find((x) => x.owner.role === role && x.owner.person)?.owner.person, cells: PRIORITIES.map((p) => m.open.filter((x) => x.owner.role === role && x.priority === p).length) }))
      .map((o) => ({ ...o, total: o.cells.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.cells[0] - a.cells[0] || b.total - a.total)
    const top = owners.slice(0, 10)
    const who = (o?: (typeof top)[number]) => o?.person ?? o?.role ?? ""
    const s = slide({
      eyebrow: `${n2(g.roadmap.length + 2)} · Ownership`,
      title: top.length >= 2 ? `${who(top[0])} and ${who(top[1])} own most of what must close ${g.when["Before listing"]}` : "Ownership of the open items",
      section: "Ownership",
      notes: owners.map((o) => `${o.person ? `${o.person} (${o.role})` : o.role}: ${o.cells.map((v, i) => `${v} ${g.priorityLabel[PRIORITIES[i]].toLowerCase()}`).join(", ")}`).join(". "),
    })
    const labelW = 3.6
    const totalW = 1.0
    const gap = 0.07
    const colW = (CW - labelW - totalW - 4 * gap) / 3
    const rowH = Math.min(0.42, (BOTTOM - TOP - 0.45) / Math.max(1, top.length) - gap)
    const max = Math.max(1, ...top.flatMap((o) => o.cells))
    PRIORITIES.forEach((p, i) => text(s, g.priorityLabel[p], { x: MX + labelW + gap + i * (colW + gap), y: TOP, w: colW, h: 0.3, fontSize: 12, bold: true, color: PRIORITY_COLOR[p], align: "center" }))
    text(s, "Total", { x: MX + labelW + gap + 3 * (colW + gap), y: TOP, w: totalW, h: 0.3, fontSize: 12, bold: true, align: "center" })
    top.forEach((o, r) => {
      const y = TOP + 0.42 + r * (rowH + gap)
      text(s, fit(o.person ? `${o.person} · ${o.role}` : o.role, labelW - 0.1, 11.5, 1), { x: MX, y, w: labelW - 0.1, h: rowH, fontSize: 11.5, valign: "middle" })
      o.cells.forEach((v, i) => {
        const x = MX + labelW + gap + i * (colW + gap)
        const col = PRIORITY_COLOR[PRIORITIES[i]]
        const fill = v ? tint(col, 0.88 - 0.6 * Math.min(1, v / max)) : PANEL
        s.addShape("rect", { x, y, w: colW, h: rowH, fill: { color: fill }, line: { color: fill, width: 0 } })
        text(s, v ? String(v) : "–", { x, y, w: colW, h: rowH, fontSize: 13, bold: true, color: v ? (v / max > 0.45 ? WHITE : col) : FAINT, align: "center", valign: "middle" })
      })
      const tx = MX + labelW + gap + 3 * (colW + gap)
      s.addShape("rect", { x: tx, y, w: totalW, h: rowH, fill: { color: PANEL }, line: { color: PANEL, width: 0 } })
      text(s, String(o.total), { x: tx, y, w: totalW, h: rowH, fontSize: 13, bold: true, align: "center", valign: "middle" })
    })
  }

  // Key dependencies
  {
    const deps = new Map<string, number>()
    for (const x of m.open) for (const d of x.dependsOn) deps.set(d, (deps.get(d) ?? 0) + 1)
    const top = [...deps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
    const s = slide({
      eyebrow: `${n2(g.roadmap.length + 3)} · Key dependencies`,
      title: top.length ? `${top[0][0]}: ${top[0][1]} items wait on it` : "Key dependencies",
      section: "Ownership",
      notes: top.map(([d, v]) => `${d}: ${v} items`).join(". "),
    })
    const labels = top.map(([d]) => (d.length > 62 ? `${d.slice(0, 60)}…` : d))
    s.addChart("bar", [{ name: "Items waiting", labels, values: top.map(([, v]) => v) }], { ...barChart(), x: MX - 0.1, y: TOP, w: CW + 0.1, h: BOTTOM - TOP, barGrouping: "clustered", chartColors: [INK], showLegend: false, dataLabelPosition: "outEnd", dataLabelColor: INK, barGapWidthPct: 55 })
  }

  // How the work on the roadmap closes each gap, and loops back into collection.
  const k = g.roadmap.length + 4
  closingLoop(slide, g, { eyebrow: `${n2(k)} · How the gaps close`, section: "Closing the gaps" })
  closingData(slide, g, { eyebrow: `${n2(k + 1)} · Data gaps`, section: "Closing the gaps" })
  const extra = (g.closing.open ? 1 : 0) + (g.closing.data.open ? 1 : 0)
  standardise(slide, g, { eyebrow: `${n2(k + extra)} · Plants and corporate oversight`, section: "Ways of working" })
  decisions(slide, g, { eyebrow: `${n2(k + extra + 1)} · Decisions and next steps`, section: "Ways of working" })
  return pptx
}

function milestone(slide: SlideFn, g: GapReport, ms: GapReport["roadmap"][number], num: string) {
  const list = [...ms.list].sort((a, b) => b.score - a.score)
  const s = slide({
    eyebrow: `${num} · ${ms.id} ${ms.title}`,
    title: `${ms.id}: ${ms.outcome.charAt(0).toLowerCase()}${ms.outcome.slice(1)}`,
    section: "Milestones",
    notes: `${ms.id} ${ms.title}, ${ms.from} to ${ms.to}. ${ms.items} items, ${ms.before} ${g.when["Before listing"]}. ${list
      .slice(0, 8)
      .map((x) => `${x.id} ${x.title}: ${x.recommendation ?? ""}`)
      .join(" ")}`,
  })
  const color = MS_COLOR[ms.id] ?? GREEN
  const lw = 3.55
  card(s, MX, TOP, lw, BOTTOM - TOP)
  numberCircle(s, MX + 0.25, TOP + 0.25, ms.id, color, 0.5)
  text(s, `${ms.from} – ${ms.to}`, { x: MX + 0.9, y: TOP + 0.27, w: lw - 1.1, h: 0.24, fontSize: 11, bold: true })
  text(s, `Weeks ${ms.start}–${ms.end}`, { x: MX + 0.9, y: TOP + 0.52, w: lw - 1.1, h: 0.22, fontSize: 10, color: MUTED })
  const stats: [string, string, string][] = [
    [String(ms.items), "items", INK],
    [String(ms.before), g.when["Before listing"], ms.before ? ROSE : FAINT],
  ]
  stats.forEach(([v, l, c], k) => {
    text(s, v, { x: MX + 0.25 + k * 1.6, y: TOP + 0.95, w: 1.5, h: 0.5, fontSize: 26, bold: true, color: c })
    text(s, l, { x: MX + 0.25 + k * 1.6, y: TOP + 1.45, w: 1.5, h: 0.3, fontSize: 10, color: MUTED })
  })
  const deps = new Map<string, number>()
  for (const x of list) for (const d of x.dependsOn) deps.set(d, (deps.get(d) ?? 0) + 1)
  text(s, "DEPENDS ON", { x: MX + 0.25, y: TOP + 1.95, w: lw - 0.5, h: 0.22, fontSize: 9, bold: true, color: FAINT, charSpacing: 1.2 })
  ;[...deps.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([d, v], k) => text(s, fit(`${d} (${v})`, lw - 0.5, 10.5, 2), { x: MX + 0.25, y: TOP + 2.22 + k * 0.48, w: lw - 0.5, h: 0.44, fontSize: 10.5 }))
  const owners = new Map<string, number>()
  for (const x of list) owners.set(owner(x), (owners.get(owner(x)) ?? 0) + 1)
  text(s, "OWNERS", { x: MX + 0.25, y: TOP + 3.75, w: lw - 0.5, h: 0.22, fontSize: 9, bold: true, color: FAINT, charSpacing: 1.2 })
  ;[...owners.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .forEach(([o, v], k) => text(s, fit(`${o} · ${v}`, lw - 0.5, 10.5, 1), { x: MX + 0.25, y: TOP + 4.02 + k * 0.27, w: lw - 0.5, h: 0.26, fontSize: 10.5 }))
  // Items, as many as fit, highest-ranked first.
  const x0 = MX + lw + 0.35
  const tw = W - MX - x0
  const colW = [3.1, 3.4, 1.0, tw - 7.5]
  const head = (t: string): PptxGenJS.TableCell => ({ text: t, options: { bold: true, color: MUTED, fontSize: 10, valign: "bottom", border: HEAD_BORDER } })
  const c = (t: string | PptxGenJS.TextProps[], o: PptxGenJS.TableCellProps = {}): PptxGenJS.TableCell => ({ text: t as string, options: { fontSize: 10, color: INK, valign: "top", border: BORDER, ...o } })
  let used = 0.35
  const rows: ReadinessItem[] = []
  for (const x of list) {
    const rec = fit(x.recommendation ?? "", colW[1] - 0.12, 10, 3)
    const h = Math.max(lineCount(`${x.id}  ${x.title}`, colW[0] - 0.12, 10, true), lineCount(rec, colW[1] - 0.12, 10), lineCount(g.priorityLabel[x.priority], colW[2] - 0.12, 10)) * lineH(10) + 0.12
    if (used + h > BOTTOM - TOP - 0.35) break
    rows.push(x)
    used += h
  }
  s.addTable(
    [
      [head("Item"), head("Recommendation"), head("Priority"), head("Effort")],
      ...rows.map((x) => [
        c([
          { text: `${x.id}  `, options: { bold: true, color: FAINT } },
          { text: x.title, options: { bold: true } },
        ]),
        c(fit(x.recommendation ?? "", colW[1] - 0.12, 10, 3)),
        c(g.priorityLabel[x.priority], { color: PRIORITY_COLOR[x.priority], bold: true }),
        c(`${x.effort} · ${x.weeks} wk`, { color: MUTED }),
      ]),
    ],
    { x: x0, y: TOP, w: tw, colW, fontFace: FONT, margin: [0.05, 0.06, 0.05, 0.06], autoPage: false },
  )
  if (list.length > rows.length) text(s, `${list.length - rows.length} more items in this milestone are in the data workbook (Gap register).`, { x: x0, y: BOTTOM - 0.25, w: tw, h: 0.25, fontSize: 9.5, color: FAINT })
}

// ---------------------------------------------------------------- board summary
export function boardDeck(m: ReportModel) {
  const g = buildGapReport(m)
  const { pptx, slide } = newDeck({ title: "Board and management summary", client: g.clientShort, date: g.date, footer: `${g.clientShort} · ESG readiness: board summary · ${g.date} · Draft for discussion`, author: g.preparedBy, company: g.legalName })
  cover(slide, { kicker: "BOARD AND MANAGEMENT SUMMARY", title: "ESG readiness: where we stand and what we need", subtitle: `${g.legalName} · ${g.fy}`, meta: meta(g), section: "Summary", notes: g.headline })
  executiveSummary(slide, g, { eyebrow: "01 · Where we stand", section: "Summary" })
  boardDecisions(slide, g)
  priorityGaps(slide, g, { eyebrow: "03 · What must be done first", section: "Priorities" })
  roadmap(slide, g, { eyebrow: "04 · Roadmap", section: "Priorities" })
  closingLoop(slide, g, { eyebrow: "05 · How the gaps close", section: "Priorities" })
  risks(slide, g, g.closing.open ? "06" : "05")
  decisions(slide, g, { eyebrow: `${g.closing.open ? "07" : "06"} · Next 90 days`, title: "What happens next, and what we need from the Board", section: "Next steps" })
  return pptx
}

function boardDecisions(slide: SlideFn, g: GapReport) {
  const s = slide({ eyebrow: "02 · Decisions needed from the Board", title: `${g.decisions.length} decisions start the governance milestone`, section: "Summary", notes: g.decisions.join(" ") })
  const cw = (CW - 0.25) / 2
  const rowsPer = Math.ceil(g.decisions.length / 2)
  const ch = (BOTTOM - TOP - (rowsPer - 1) * 0.15) / rowsPer
  g.decisions.forEach((d, i) => {
    const x = MX + Math.floor(i / rowsPer) * (cw + 0.25)
    const y = TOP + (i % rowsPer) * (ch + 0.15)
    card(s, x, y, cw, ch)
    numberCircle(s, x + 0.3, y + ch / 2 - 0.22, i + 1, INK, 0.44)
    text(s, fit(d, cw - 1.2, 14, Math.max(1, Math.floor((ch - 0.3) / lineH(14)))), { x: x + 0.95, y: y + 0.15, w: cw - 1.2, h: ch - 0.3, fontSize: 14, valign: "middle" })
  })
}

function risks(slide: SlideFn, g: GapReport, num: string) {
  const list: [string, string, string][] = [
    [g.preIpo ? "Offer document and diligence" : "Regulator and exchange queries", g.preIpo ? "ESG questions in IPO diligence that cannot be answered with Board-approved policies and records." : "Queries on BRSR answers that cannot be traced to Board-approved policies and records.", ROSE],
    ["BRSR Core assessment", `Estimated energy and emissions that an assessment or assurance provider cannot trace: ${g.stats.coreReady} of ${g.stats.coreTotal} Core KPIs are traceable today.`, ROSE],
    ["Peer comparison", g.peer ? `Investors will read the first BRSR beside ${g.peer.short}'s; inconsistent plant data makes intensity ratios hard to defend.` : "Investors compare intensity ratios with listed peers; inconsistent plant data makes them hard to defend.", AMBER],
    ["International investors", `ISSB expectations BRSR does not cover: ${g.stats.issbNot} requirements need new work, including climate scenarios and Scope 3.`, AMBER],
  ]
  const s = slide({ eyebrow: `${num} · Risks if not addressed`, title: "Four risks if the gaps stay open", section: "Priorities", notes: list.map(([t, d]) => `${t}: ${d}`).join(" ") })
  const cw = (CW - 0.25) / 2
  const ch = (BOTTOM - TOP - 0.2) / 2
  list.forEach(([t, d, color], i) => {
    const x = MX + (i % 2) * (cw + 0.25)
    const y = TOP + Math.floor(i / 2) * (ch + 0.2)
    card(s, x, y, cw, ch, tint(color, 0.93))
    chip(s, x + 0.3, y + 0.3, color === ROSE ? "High" : "Medium", color, { size: 9.5, h: 0.26, solid: true })
    text(s, t, { x: x + 0.3, y: y + 0.72, w: cw - 0.6, h: 0.36, fontSize: 16, bold: true })
    text(s, fit(d, cw - 0.6, 13, 4), { x: x + 0.3, y: y + 1.15, w: cw - 0.6, h: ch - 1.3, fontSize: 13, color: MUTED })
  })
}

// -------------------------------------------------------- test report board deck
export function testReportDeck(m: ReportModel) {
  const g = buildGapReport(m)
  const a = answerAll(m)
  const { pptx, slide } = newDeck({ title: "BRSR test report: management and board presentation", client: g.clientShort, date: g.date, footer: `${g.clientShort} · BRSR test report · ${g.date} · Test report · internal use only · not for publication`, author: g.preparedBy, company: g.legalName })
  cover(slide, {
    kicker: "BRSR TEST REPORT · MANAGEMENT AND BOARD PRESENTATION",
    title: "BRSR test report: what it shows and what is left",
    subtitle: `${g.legalName} · ${g.fy}`,
    meta: `${g.date} · Prepared by ${g.preparedBy}`,
    section: "Test report",
    notes: `${a.answered} answered, ${a.partial} partly, ${a.placeholder} placeholders of ${a.rows.length} questions.`,
    warning: "TEST REPORT · INTERNAL USE ONLY · NOT FOR PUBLICATION",
  })

  // Coverage
  {
    const s = slide({
      eyebrow: "01 · What the test report covers",
      title: `${a.answered} of ${a.rows.length} questions answered from records; ${a.placeholder} are placeholders naming their owner`,
      section: "Test report",
      notes: "Every numbered question in the SEBI format, populated from what has been gathered so far.",
    })
    const stats: [number, string, string][] = [
      [a.answered, "answered from records", GREEN],
      [a.partial, "partly answered", AMBER],
      [a.placeholder, "placeholders with an owner", ROSE],
      [a.rows.length, "questions in total", INK],
    ]
    const cw = (CW - 3 * 0.22) / 4
    stats.forEach(([v, l, c], i) => {
      const x = MX + i * (cw + 0.22)
      card(s, x, TOP, cw, 1.25)
      text(s, String(v), { x: x + 0.25, y: TOP + 0.15, w: cw - 0.5, h: 0.6, fontSize: 32, bold: true, color: c })
      text(s, l, { x: x + 0.25, y: TOP + 0.8, w: cw - 0.5, h: 0.3, fontSize: 11, color: MUTED })
    })
    const sections = ["A", "B", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9"]
    const by = (k: string) => sections.map((x) => a.rows.filter((r) => (r.entry.principle ?? r.entry.section) === x && r.answer.kind === k).length)
    s.addChart(
      "bar",
      [
        { name: "Answered", labels: sections, values: by("answered") },
        { name: "Partly", labels: sections, values: by("partial") },
        { name: "Placeholder", labels: sections, values: by("placeholder") },
      ],
      { ...barChart(), barDir: "col", catAxisOrientation: "minMax", x: MX - 0.1, y: TOP + 1.45, w: CW + 0.1, h: BOTTOM - TOP - 1.45, barGapWidthPct: 45 },
    )
  }

  // Key numbers
  {
    const c = m.collection.collected
    const w = m.collection.withEstimates
    const rows: [string, number, number, string][] = [
      ["Total energy (P6 E1)", c.totalGJ, w.totalGJ, "GJ"],
      ["Electricity", c.electricityGJ, w.electricityGJ, "GJ"],
      ["Fuels", c.fuelGJ, w.fuelGJ, "GJ"],
      [w.scope1Parts.mobile || w.scope1Parts.fugitive ? "Scope 1 (P6 E7)" : "Scope 1, stationary fuels (P6 E7)", c.scope1, w.scope1, "tCO2e"],
      ...(w.scope1Parts.mobile ? [["  of which company vehicles", c.scope1Parts.mobile, w.scope1Parts.mobile, "tCO2e"] as [string, number, number, string]] : []),
      ...(w.scope1Parts.fugitive ? [["  of which refrigerant leaks", c.scope1Parts.fugitive, w.scope1Parts.fugitive, "tCO2e"] as [string, number, number, string]] : []),
      ["Scope 2, location-based (P6 E7)", c.scope2, w.scope2, "tCO2e"],
      ["Water withdrawal (P6 E3)", c.waterWithdrawal, w.waterWithdrawal, "kL"],
      ["Waste generated (P6 E9)", c.waste, w.waste, "t"],
      ["LTIFR (P3 E11)", c.ltifr ?? 0, w.ltifr ?? 0, "per million hours"],
      ...(w.ltifrEmployees !== undefined ? [["  employees", c.ltifrEmployees ?? 0, w.ltifrEmployees, "per million hours"] as [string, number, number, string]] : []),
      ...(w.ltifrWorkers !== undefined ? [["  workers", c.ltifrWorkers ?? 0, w.ltifrWorkers, "per million hours"] as [string, number, number, string]] : []),
    ]
    const months = m.collection.closed.length
    const s = slide({
      eyebrow: "02 · Key numbers",
      title: `Key numbers from ${months} closed month${months === 1 ? "" : "s"}, with and without estimates`,
      section: "Test report",
      notes: rows.map(([l, v1, v2, u]) => `${l}: ${v1 ? fmtN(v1, v1 < 10 ? 2 : 0) : "not collected"} collected, ${v2 ? fmtN(v2, v2 < 10 ? 2 : 0) : "—"} including estimates, ${u}`).join(". "),
    })
    const head = (t: string, align: "left" | "right" = "right"): PptxGenJS.TableCell => ({ text: t, options: { bold: true, color: MUTED, fontSize: 11, align, valign: "bottom", border: HEAD_BORDER } })
    const cell = (t: string, o: PptxGenJS.TableCellProps = {}): PptxGenJS.TableCell => ({ text: t, options: { fontSize: 12.5, color: INK, align: "right", valign: "middle", border: BORDER, ...o } })
    s.addTable(
      [[head("Measure", "left"), head("Collected"), head("Including estimates"), head("Unit", "left")], ...rows.map(([l, v1, v2, u]) => {
        const sub = l.startsWith("  ")
        return [cell(sub ? `    ${l.trim()}` : l, { align: "left", color: sub ? MUTED : INK, fontSize: sub ? 11 : 12.5 }), cell(v1 ? fmtN(v1, v1 < 10 ? 2 : 0) : "Not collected", { bold: !!v1 && !sub, color: v1 ? INK : FAINT }), cell(v2 ? fmtN(v2, v2 < 10 ? 2 : 0) : "—", { color: MUTED }), cell(u, { align: "left", color: MUTED })]
      })],
      { x: MX, y: TOP, w: 8.6, colW: [3.6, 1.8, 2.0, 1.2], rowH: Math.min(0.48, (BOTTOM - TOP) / (rows.length + 1)), fontFace: FONT, margin: [0.03, 0.1, 0.03, 0.1] },
    )
    const x = 9.6
    const cw = W - MX - x
    const comp = m.collection.completeness
    card(s, x, TOP, cw, 2.0)
    text(s, `${Math.round(comp.share * 100)}%`, { x: x + 0.25, y: TOP + 0.2, w: cw - 0.5, h: 0.6, fontSize: 32, bold: true, color: comp.share >= 0.9 ? GREEN : comp.share >= 0.5 ? AMBER : ROSE })
    text(s, `of required monthly values collected; ${fmtN(comp.est)} estimates and ${fmtN(comp.missing)} missing are left out of the first column.`, { x: x + 0.25, y: TOP + 0.85, w: cw - 0.5, h: 1.0, fontSize: 11, color: MUTED })
    text(s, "Factors: IPCC 2006 fuel defaults; CEA grid emission factor v21.0 (0.71 tCO2/MWh). Read with the assumptions and limitations note.", { x, y: TOP + 2.25, w: cw, h: 1.0, fontSize: 10, color: FAINT })
  }

  // Review with data owners
  {
    const sum = m.review.summary
    const s = slide({
      eyebrow: "03 · Review with data owners",
      title: sum.held ? `${sum.signedOff} of ${sum.sessions} review sessions signed off; ${sum.openQueries} quer${sum.openQueries === 1 ? "y" : "ies"} open` : `${sum.sessions} review sessions planned with data owners; none held yet`,
      section: "Test report",
      notes: "Each session checks accuracy, completeness and consistency with internal documents for the owner's questions, raises queries and is signed off when they are resolved.",
    })
    const head = (t: string, align: "left" | "center" = "center"): PptxGenJS.TableCell => ({ text: t, options: { bold: true, color: MUTED, fontSize: 10, align, valign: "bottom", border: HEAD_BORDER } })
    const cell = (t: string, o: PptxGenJS.TableCellProps = {}): PptxGenJS.TableCell => ({ text: t, options: { fontSize: 10.5, color: INK, align: "center", valign: "middle", border: BORDER, ...o } })
    const ck = (v?: string): PptxGenJS.TableCell => cell(v === "confirmed" ? "Confirmed" : v === "issues" ? "Issues" : "—", { color: v === "confirmed" ? GREEN : v === "issues" ? ROSE : FAINT, bold: !!v })
    const plan = m.review.plan
    const rowH = Math.min(0.38, (BOTTOM - TOP - 0.45) / (plan.length + 1))
    s.addTable(
      [
        [head("Data owner", "left"), head("Questions"), head("Held"), ...CHECKS.map((c) => head(c.id === "consistency" ? "Consistency" : c.label)), head("Open queries"), head("Status")],
        ...plan.map((p) => {
          const ss = m.state.reportReview.sessions[p.owner]
          const st = sessionStatus(ss)
          return [
            cell(p.owner, { align: "left" }),
            cell(String(p.questions.length)),
            cell(ss?.heldAt ? ss.heldAt.slice(0, 10) : "Not held", { color: ss?.heldAt ? INK : FAINT }),
            ...CHECKS.map((c) => ck(ss?.checks[c.id])),
            cell(String(ss?.queries.filter((q) => !q.resolvedAt).length ?? 0)),
            cell(st === "signed off" ? "Signed off" : st === "issues" ? "Issues" : st === "held" ? "Held" : "Not held", { bold: true, color: st === "signed off" ? GREEN : st === "issues" ? ROSE : st === "held" ? AMBER : FAINT }),
          ]
        }),
      ],
      { x: MX, y: TOP, w: CW, colW: [3.0, 1.05, 1.3, 1.25, 1.35, 1.35, 1.2, CW - 10.5], rowH, fontFace: FONT, margin: [0.02, 0.06, 0.02, 0.06] },
    )
  }

  // Assumptions
  {
    const list = m.assumptions.slice(0, 6)
    const s = slide({
      eyebrow: "04 · Assumptions and limitations",
      title: `${m.assumptions.length} assumptions and limitations sit behind the numbers`,
      section: "Test report",
      notes: m.assumptions.map((x) => `${x.area}: ${x.assumption} What removes it: ${x.remove}`).join("\n"),
    })
    const cw = (CW - 2 * 0.22) / 3
    const ch = (BOTTOM - TOP - 0.2) / 2
    list.forEach((x, i) => {
      const cx = MX + (i % 3) * (cw + 0.22)
      const cy = TOP + Math.floor(i / 3) * (ch + 0.2)
      card(s, cx, cy, cw, ch)
      text(s, x.area.toUpperCase(), { x: cx + 0.22, y: cy + 0.2, w: cw - 0.44, h: 0.22, fontSize: 9, bold: true, color: FAINT, charSpacing: 1.2 })
      const body = fit(x.assumption, cw - 0.44, 11, 5)
      text(s, body, { x: cx + 0.22, y: cy + 0.5, w: cw - 0.44, h: lineCount(body, cw - 0.44, 11) * lineH(11) + 0.05, fontSize: 11 })
      text(s, fit(`→ ${x.remove}`, cw - 0.44, 10, 3), { x: cx + 0.22, y: cy + ch - 0.72, w: cw - 0.44, h: 0.6, fontSize: 10, color: GREEN })
    })
  }

  // Before the real filing
  {
    const sum = m.review.summary
    const steps = [
      `Replace ${fmtN(m.collection.completeness.est)} estimated values with source documents and fill ${fmtN(m.collection.completeness.missing)} missing ones.`,
      `Complete the ${a.placeholder} placeholder answers; each names its owner.`,
      sum.signedOff === sum.sessions ? "Keep the review cycle with data owners for the real filing." : `Finish the review with data owners: ${sum.sessions - sum.signedOff} sessions to sign off, ${sum.openQueries} queries open.`,
      "Use audited revenue for the reporting year to compute intensity ratios.",
      "Run a BRSR Core pre-assessment with the chosen independent provider, then take the report to the Board.",
    ]
    const s = slide({ layout: "dark", eyebrow: "05 · Before the real filing", title: "Five steps from test report to filing", section: "Next steps", notes: steps.join(" ") })
    steps.forEach((t, i) => {
      const y = TOP + i * 0.98
      numberCircle(s, MX, y, i + 1, MINT, 0.44, "0B0F17")
      text(s, t, { x: MX + 0.7, y: y + 0.02, w: CW - 0.7, h: 0.8, fontSize: 15, color: WHITE })
    })
  }
  return pptx
}
