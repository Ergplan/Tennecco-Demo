// Word deliverables: the BRSR test report in the SEBI structure, the disclosure
// assumptions and limitations note, and the data collection procedures.

import { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, LevelFormat, PageNumber, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TabStopType, TextRun, VerticalAlign, WidthType, type IStylesOptions } from "docx"
import { METRIC_BY_ID, activeMetrics, activeTopics } from "../collection/model"
import { factorNotes } from "../collection/calc"
import type { Answer } from "./answers"
import { buildTestReport, principleName, type ReportQuestion } from "./testReport"
import { fmtDate, type ReportModel } from "./model"

const INK = "0F172A"
const GREY = "64748B"
const ROSE = "BE123C"
const GREEN = "059669"
const FONT = "Arial"
// A4 with 2 cm side margins: the text block is 11906 − 2 × 1134 DXA wide.
const PAGE = { width: 11906, height: 16838 }
const MARGIN = { top: 1247, bottom: 1247, left: 1134, right: 1134, header: 567, footer: 567 }
const CONTENT_W = PAGE.width - MARGIN.left - MARGIN.right

type Align = (typeof AlignmentType)[keyof typeof AlignmentType]
const p = (text: string, opts: { bold?: boolean; size?: number; color?: string; italics?: boolean; after?: number; before?: number; align?: Align; keepNext?: boolean; indent?: number } = {}) =>
  new Paragraph({
    alignment: opts.align,
    keepNext: opts.keepNext,
    indent: opts.indent ? { left: opts.indent } : undefined,
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 20, color: opts.color, italics: opts.italics, font: FONT })],
  })

const h = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel], pageBreak = false) => new Paragraph({ heading: level, pageBreakBefore: pageBreak, keepNext: true, children: [new TextRun({ text, font: FONT })] })

const STYLES: IStylesOptions = {
  default: { document: { run: { font: FONT, size: 20, color: INK } } },
  paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 34, bold: true, color: INK, font: FONT }, paragraph: { spacing: { before: 0, after: 160 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: INK, space: 4 } } } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, color: INK, font: FONT }, paragraph: { spacing: { before: 360, after: 80 }, outlineLevel: 1 } },
    { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, color: "334155", font: FONT }, paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 2 } },
  ],
}

const NUMBERING = { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] }] }
const bullet = (text: string) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text, size: 20, font: FONT })] })

// Widths as shares of the text block, in DXA on the table and on every cell (PERCENTAGE breaks in Google Docs).
function widthsFor(n: number, shares?: number[], total = CONTENT_W) {
  const s = shares && shares.length === n ? shares : n === 1 ? [100] : n === 2 ? [68, 32] : [40, ...Array(n - 1).fill(60 / (n - 1))]
  const sum = s.reduce((a, b) => a + b, 0)
  const w = s.map((x) => Math.floor((x / sum) * total))
  w[w.length - 1] += total - w.reduce((a, b) => a + b, 0)
  return w
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" }
const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }

const isNum = (t: string) => /^[\d—₹.,\s%×⁰¹²³⁴⁵⁶⁷⁸⁹⁻E+-]+$/.test(t.trim()) && /\d|—/.test(t)
// A column is numeric when every filled cell in it is a number; numbers and their heads align right.
const numericCols = (head: string[], rows: string[][]) => head.map((_, i) => i > 0 && rows.some((r) => r[i]?.trim() && r[i].trim() !== "—") && rows.every((r) => !r[i]?.trim() || isNum(r[i])))

function grid(head: string[], rows: string[][], w: number[], opts: { numeric?: boolean; indent?: number; size?: number }) {
  const num = opts.numeric === false ? head.map(() => false) : numericCols(head, rows)
  const cell = (text: string, i: number, hd = false) =>
    new TableCell({
      borders: { top: hd ? none : border, bottom: border, left: none, right: none },
      width: { size: w[i], type: WidthType.DXA },
      verticalAlign: hd ? VerticalAlign.BOTTOM : VerticalAlign.TOP,
      shading: hd ? { type: ShadingType.CLEAR, color: "auto", fill: "1E293B" } : undefined,
      margins: { top: 50, bottom: 50, left: 90, right: 90 },
      children: [
        new Paragraph({
          alignment: num[i] ? AlignmentType.RIGHT : AlignmentType.LEFT,
          indent: !hd && i === 0 && text.startsWith("  ") ? { left: 200 } : undefined,
          children: [new TextRun({ text: text.trim(), bold: hd, size: opts.size ?? 17, font: FONT, color: hd ? "FFFFFF" : i === 0 && text.startsWith("  ") ? "475569" : INK })],
        }),
      ],
    })
  return new Table({
    width: { size: w.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: w,
    layout: TableLayoutType.FIXED,
    indent: opts.indent ? { size: opts.indent, type: WidthType.DXA } : undefined,
    rows: [new TableRow({ tableHeader: true, cantSplit: true, children: head.map((t, i) => cell(t, i, true)) }), ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, i)) }))],
  })
}

function table(head: string[], rows: string[][], shares?: number[], opts: { numeric?: boolean; total?: number } = {}) {
  return grid(head, rows, widthsFor(head.length, shares, opts.total), { numeric: opts.numeric })
}

function header(left: string, right: string) {
  return new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1", space: 4 } },
        children: [new TextRun({ text: left, size: 15, color: GREY, font: FONT }), new TextRun({ text: `\t${right}`, size: 15, bold: true, color: ROSE, font: FONT })],
      }),
    ],
  })
}

function footer(text: string) {
  return new Footer({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
        children: [new TextRun({ text, size: 15, color: GREY, font: FONT }), new TextRun({ children: ["\tPage ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 15, color: GREY, font: FONT })],
      }),
    ],
  })
}

const KIND_TEXT: Record<Answer["kind"], [string, string]> = { answered: ["ANSWERED", GREEN], partial: ["PARTLY ANSWERED", "B45309"], placeholder: ["TO COMPLETE", ROSE] }
const INDENT = 420

function questionBlock(q: ReportQuestion) {
  const a = q.answer
  const out: (Paragraph | Table)[] = []
  out.push(
    new Paragraph({
      keepNext: true,
      keepLines: true,
      spacing: { before: 200, after: 40 },
      indent: { left: INDENT, hanging: INDENT },
      children: [new TextRun({ text: `${q.number}.\t`, bold: true, size: 20, font: FONT, color: GREY }), new TextRun({ text: q.text, bold: true, size: 20, font: FONT })],
      tabStops: [{ type: TabStopType.LEFT, position: INDENT }],
    }),
  )
  const [kind, color] = KIND_TEXT[a.kind]
  const tags = [q.core && "BRSR Core", q.leadership && "Leadership", q.drafted && "Drafted in esgOS"].filter(Boolean).join(" · ")
  out.push(
    new Paragraph({
      keepNext: true,
      indent: { left: INDENT },
      spacing: { after: 60 },
      children: [new TextRun({ text: kind, bold: true, size: 14, color, font: FONT }), new TextRun({ text: `${tags ? `  ·  ${tags}` : ""}  ·  ${q.id}  ·  owner: ${q.session}`, size: 14, color: GREY, font: FONT })],
    }),
  )
  if (a.text) out.push(new Paragraph({ indent: { left: INDENT }, spacing: { after: 80 }, keepNext: !!a.table, children: [new TextRun({ text: a.text, size: 20, font: FONT, italics: a.kind === "placeholder", color: a.kind === "placeholder" ? "B45309" : INK })] }))
  if (a.table) {
    const t = a.table
    const shares = t.head.length === 4 ? [46, 18, 22, 14] : t.head.length === 3 ? [50, 20, 30] : undefined
    out.push(tableIndented(t.head, t.rows, shares))
  }
  const meta = [a.source && `Source: ${a.source}`, a.note].filter(Boolean).join(" · ")
  if (meta) out.push(new Paragraph({ indent: { left: INDENT }, spacing: { before: 60, after: 120 }, children: [new TextRun({ text: meta, size: 15, italics: true, color: GREY, font: FONT })] }))
  return out
}

// Answer tables sit under the question text, so they are indented and narrower.
function tableIndented(head: string[], rows: string[][], shares?: number[]) {
  return grid(head, rows, widthsFor(head.length, shares, CONTENT_W - INDENT), { indent: INDENT, size: 16 })
}


// ------------------------------------------------------------------ test report
export function testReportDoc(m: ReportModel) {
  const d = buildTestReport(m)
  const c = m.client
  const pct = (n: number) => `${Math.round((n / d.counts.total) * 100)}%`
  const meta: [string, string][] = [
    ["Status", d.meta.status],
    ["Prepared", `${fmtDate(m.generatedAt)} by ${m.preparedBy}`],
    ...(d.meta.cin ? ([["CIN", d.meta.cin]] as [string, string][]) : []),
    ["Boundary", d.meta.boundary],
    ["Format", "SEBI BRSR (as updated in 2023 and 2025): Sections A, B and C"],
    ["Assurance", "Not assessed or assured. Not approved by the Board. Not for use in any offer document."],
  ]
  const cover: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { before: 0, after: 1600 },
      border: { top: { style: BorderStyle.SINGLE, size: 12, color: ROSE, space: 4 }, bottom: { style: BorderStyle.SINGLE, size: 12, color: ROSE, space: 4 }, left: { style: BorderStyle.SINGLE, size: 12, color: ROSE, space: 6 }, right: { style: BorderStyle.SINGLE, size: 12, color: ROSE, space: 6 } },
      children: [new TextRun({ text: "TEST REPORT · FOR INTERNAL REVIEW ONLY · NOT FOR PUBLICATION OR FOR USE IN ANY OFFER DOCUMENT", bold: true, size: 16, color: ROSE, font: FONT })],
    }),
    p("Business Responsibility and Sustainability Report", { bold: true, size: 56, after: 240 }),
    p(c.legalName, { size: 32, after: 80 }),
    p(`${d.meta.fy} · ${d.meta.period}`, { size: 24, color: GREY, after: 2400 }),
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: GREEN, space: 1 } }, spacing: { after: 240 }, children: [] }),
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, CONTENT_W - 2000],
      layout: TableLayoutType.FIXED,
      rows: meta.map(
        ([k, v]) =>
          new TableRow({
            children: [
              new TableCell({ width: { size: 2000, type: WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none }, margins: { top: 40, bottom: 40 }, children: [p(k, { size: 18, color: GREY, after: 0 })] }),
              new TableCell({ width: { size: CONTENT_W - 2000, type: WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none }, margins: { top: 40, bottom: 40 }, children: [p(v, { size: 18, after: 0 })] }),
            ],
          }),
      ),
    }),
  ]

  const body: (Paragraph | Table)[] = [h("Contents", HeadingLevel.HEADING_1), p("How complete this report is", { bold: true, after: 60 })]
  for (const s of d.sections) {
    body.push(p(s.title, { bold: true, before: 120, after: 40 }))
    for (const g of s.groups) body.push(new Paragraph({ indent: { left: 360 }, spacing: { after: 20 }, children: [new TextRun({ text: g.title, size: 18, color: "334155", font: FONT })] }))
  }
  body.push(p("Assumptions and limitations", { bold: true, before: 120 }))

  body.push(h("How complete this report is", HeadingLevel.HEADING_1, true))
  body.push(p(`${d.counts.answered} of ${d.counts.total} questions (${pct(d.counts.answered)}) are answered from the company's records, ${d.counts.partial} (${pct(d.counts.partial)}) partly, and ${d.counts.placeholder} (${pct(d.counts.placeholder)}) are placeholders that name who completes them.${d.drafts ? ` ${d.drafts} answers were drafted in esgOS; each counts as answered once its owner confirms it in review.` : ""} Every answer names its source. Read the report with the assumptions and limitations at the end.`, { after: 200 }))
  if (d.keyNumbers.length) {
    body.push(h("Key numbers", HeadingLevel.HEADING_2))
    body.push(table(["Measure", "Value", "Unit", "BRSR", "Covers"], d.keyNumbers.map((k) => [k.label, k.value, k.unit, k.ref, k.note ?? ""]), [30, 16, 18, 12, 24]))
  }
  body.push(h("By section", HeadingLevel.HEADING_2))
  body.push(
    table(
      ["Section", "Answered", "Partly", "To complete", "Answered or partly"],
      d.coverage.map((x) => {
        const n = x.answered + x.partial + x.placeholder
        return [x.label, String(x.answered), String(x.partial), String(x.placeholder), `${Math.round(((x.answered + x.partial) / n) * 100)}%`]
      }),
      [32, 17, 17, 17, 17],
    ),
  )
  body.push(h("Review with data owners", HeadingLevel.HEADING_2))
  body.push(p(`${d.review.held} of ${d.review.sessions} review sessions held; ${d.review.signedOff} signed off; ${d.review.openQueries} of ${d.review.queries} queries open. Each session checks accuracy, completeness and consistency with internal documents.`))
  body.push(
    table(
      ["Data owner", "Qs", "Held", "Accuracy", "Completeness", "Consistency", "Signed off"],
      m.review.plan.map((pl) => {
        const s = m.state.reportReview.sessions[pl.owner]
        const ck = (v?: string) => (v === "confirmed" ? "Confirmed" : v === "issues" ? "Issues" : "—")
        return [pl.owner, String(pl.questions.length), s?.heldAt ? s.heldAt.slice(0, 10) : "Not held", ck(s?.checks.accuracy), ck(s?.checks.completeness), ck(s?.checks.consistency), s?.signedOffAt ? `${s.signedOffBy?.split(" (")[0]}, ${s.signedOffAt.slice(0, 10)}` : "No"]
      }),
      [20, 11, 12, 12, 14, 14, 17],
      { numeric: false },
    ),
  )

  for (const s of d.sections) {
    body.push(h(s.title, HeadingLevel.HEADING_1, true))
    body.push(p(s.intro, { color: GREY, after: 160 }))
    let principle = ""
    for (const g of s.groups) {
      const pr = g.id.match(/^(P\d)/)?.[1]
      if (pr && pr !== principle) {
        principle = pr
        body.push(h(`Principle ${pr.slice(1)}`, HeadingLevel.HEADING_2))
        body.push(p(principleName(pr), { italics: true, color: "475569", after: 80 }))
      }
      body.push(h(pr ? g.title.split(" · ")[1] : g.title, pr ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2))
      for (const q of g.questions) body.push(...questionBlock(q))
    }
  }

  body.push(h("Assumptions and limitations", HeadingLevel.HEADING_1, true))
  body.push(p("Every assumption and limitation behind the numbers and statements above, what it does to the disclosure and what removes it.", { color: GREY, after: 160 }))
  body.push(table(["Area", "Assumption or limitation", "Effect", "What removes it", "Owner"], d.assumptions.map((a) => [a.area, a.assumption, a.effect, a.remove, a.owner]), [14, 32, 20, 22, 12], { numeric: false }))

  const marker = `${c.shortName} · BRSR test report ${m.fy}`
  return new Document({
    creator: "esgOS",
    title: `BRSR test report ${m.fy} — ${c.legalName}`,
    description: "Test report for internal review",
    styles: STYLES,
    numbering: NUMBERING,
    sections: [
      { properties: { page: { size: PAGE, margin: { ...MARGIN, top: 1700 } } }, children: cover },
      { properties: { page: { size: PAGE, margin: MARGIN } }, headers: { default: header(marker, "TEST REPORT · INTERNAL") }, footers: { default: footer("For internal review only · not for publication") }, children: body },
    ],
  })
}

// ------------------------------------------------------- assumptions and limitations
export function assumptionsDoc(m: ReportModel) {
  const c = m.client
  const areas = [...new Set(m.assumptions.map((a) => a.area))]
  const children: (Paragraph | Table)[] = [
    p("Disclosure assumptions and limitations", { bold: true, size: 36, after: 80 }),
    p(`${c.legalName} · BRSR test report ${m.fy}`, { size: 24, color: GREY, after: 300 }),
    p("This note lists every assumption and limitation behind the numbers and statements in the BRSR test report, what each one does to the disclosure, and what removes it. Management should read it with the test report and keep it with the working papers for the assessment or assurance provider.", { after: 200 }),
    h("Summary", HeadingLevel.HEADING_2),
    table(
      ["Area", "Assumptions"],
      areas.map((a) => [a, String(m.assumptions.filter((x) => x.area === a).length)]),
      [70, 30],
    ),
  ]
  for (const area of areas) {
    children.push(h(area, HeadingLevel.HEADING_2))
    children.push(
      table(
        ["Assumption or limitation", "Effect on the disclosure", "What removes it", "Owner"],
        m.assumptions.filter((x) => x.area === area).map((a) => [a.assumption, a.effect, a.remove, a.owner]),
        [36, 26, 26, 12],
      ),
    )
  }
  return new Document({
    creator: "esgOS",
    title: `Assumptions and limitations — ${c.legalName}`,
    styles: STYLES,
    numbering: NUMBERING,
    sections: [{ properties: { page: { size: PAGE, margin: MARGIN } }, headers: { default: header(`${c.shortName} · assumptions and limitations ${m.fy}`, "INTERNAL") }, footers: { default: footer("For internal review only · not for publication") }, children }],
  })
}

// ------------------------------------------------------------- procedures
export function proceduresDoc(m: ReportModel) {
  const c = m.client
  const st = m.state
  const personAt = (role: string, siteId: string) => {
    const p = st.stakeholders.find((x) => x.siteId === siteId && x.role === role && !x.vacant) ?? st.stakeholders.find((x) => !x.siteId && x.role === role && !x.vacant)
    return p ? `${p.name} (${role})` : `${role} (to be named)`
  }
  const esg = st.stakeholders.find((x) => !x.siteId && x.role === "ESG lead" && !x.vacant)?.name ?? "ESG lead"
  const children: (Paragraph | Table)[] = [
    p("BRSR data collection: implementation procedures", { bold: true, size: 36, after: 80 }),
    p(`${c.legalName} · applies from ${m.fy}`, { size: 24, color: GREY, after: 300 }),
    h("1. Purpose and scope", HeadingLevel.HEADING_2),
    p(`These procedures set how BRSR data is collected every month from each of ${m.sites.length} sites (${m.plants.length} plants), consolidated and reviewed, so the annual BRSR can be produced from records and an assessment or assurance provider can trace every number to its source. They go with the data collection templates (Excel).`),
    h("2. Roles", HeadingLevel.HEADING_2),
    table(
      ["Role", "Responsibility"],
      [
        [`ESG lead (${esg})`, "Owns the procedure and templates; issues the monthly requests; consolidates; runs the checks; closes each month."],
        ["Plant data owners", "Enter their plant's values by the 10th of the following month with the evidence named in the template."],
        ["Reviewer (finance or EHS head)", "Checks values against evidence, approves or returns them (maker-checker)."],
        ["Company secretary", "Keeps the policy, governance and Section A records current."],
        ["Internal audit", "Tests the procedure and a sample of values each year before the assessment or assurance."],
      ],
      [30, 70],
    ),
    h("3. Monthly cycle", HeadingLevel.HEADING_2),
    ...[
      "Day 1: the ESG lead issues the month's request to every named data owner (esgOS sends it with the template).",
      "By day 10: owners enter values with the source (bill, meter, ERP, HRMS, register) and attach or name the evidence. An estimate is allowed only with a note on how it was made; it stays marked as an estimate.",
      "By day 15: reviewers check each value against its evidence and approve it or send it back.",
      "By day 20: the ESG lead runs the checks (month-on-month changes above 30%, missing evidence, kWh ÷ kVAh outside 0.85 to 1.00), resolves them and closes the month.",
      "Quarterly: the ESG lead reports completeness, estimates and open checks to the ESG committee.",
      "Annually: the year is consolidated into the BRSR data workbook; the test report and, later, the published BRSR are drafted from it.",
    ].map(bullet),
    h("4. Metrics, owners and evidence", HeadingLevel.HEADING_2),
  ]
  const METRICS = activeMetrics(m.state.collection)
  for (const topic of activeTopics(m.state.collection)) {
    children.push(h(topic, HeadingLevel.HEADING_3))
    children.push(
      table(
        ["Metric", "Unit", "Owner", "Evidence to keep", "BRSR"],
        METRICS.filter((x) => x.topic === topic).map((x) => [x.label + (x.optional ? " (where applicable)" : ""), x.unit, x.owner, x.evidence, x.brsr.join(", ")]),
        [32, 10, 16, 28, 14],
      ),
    )
  }
  children.push(h("Company data, once a year", HeadingLevel.HEADING_3))
  children.push(p("Finance enters the company's figures for the year from the audited financial statements and ledgers (revenue, paid-up capital, net worth, net profit, CSR, purchases, trade payables, MSME purchases, well-being spend, R&D and capex). A reviewer approves them. They answer Section A, the BRSR Core ratios (days payable, MSME sourcing, well-being spend) and every intensity per rupee of turnover."))
  children.push(h("5. Named data owners by site", HeadingLevel.HEADING_2))
  const roles = [...new Set(METRICS.map((x) => x.owner))]
  children.push(table(["Site", "Role", "Named owner"], m.sites.flatMap((s) => roles.filter((r) => METRICS.some((x) => x.owner === r && x.siteTypes.includes(s.type))).map((r) => [s.name, r, personAt(r, s.id).replace(` (${r})`, "")])), [40, 25, 35], { numeric: false }))
  children.push(h("6. Calculation guidance", HeadingLevel.HEADING_2))
  for (const t of [
    ...factorNotes(m.state.collection),
    "Total energy (P6 E1) = electricity (grid and renewable) + fuels, in GJ. Renewable (A, B) and non-renewable (D, E) are reported separately.",
    "Scope 2 (P6 E7) = grid kWh ÷ 1,000 × CEA grid factor. Renewable electricity bought under open access or generated captively counts as zero only with settlement statements.",
    "LTIFR (P3 E11) = lost-time injuries × 1,000,000 ÷ person-hours worked, for employees and workers separately.",
    "Intensity = metric ÷ revenue from operations in rupees (and adjusted for purchasing power parity), and per tonne of production.",
    `Electricity bills give kWh and kVAh; report kWh. ${METRIC_BY_ID["elec.kvah"].help ?? ""}`,
  ])
    children.push(bullet(t))
  children.push(h("7. Controls and evidence", HeadingLevel.HEADING_2))
  for (const t of [
    "Maker-checker: the person who enters a value cannot approve it.",
    "Every approved value names its evidence; evidence is filed by site, month and metric and kept for the period the company's document retention policy sets for statutory records.",
    "Changes after a month is closed are logged with the reason and the approver.",
    "Estimates are flagged and listed in the assumptions and limitations note; the target is no estimates in BRSR Core metrics.",
    "Internal audit tests the procedure each year before the assessment or assurance.",
  ])
    children.push(bullet(t))
  children.push(h("8. Closing the gaps", HeadingLevel.HEADING_2))
  children.push(p("Every gap in the gap analysis has an owner, a due date from its roadmap milestone and one of five routes. Each route loops back to where the evidence lives, and every change re-runs the readiness assessment in esgOS."))
  children.push(
    table(
      ["Route", "What happens", "Closes when", "Verified by"],
      [
        ["Collect the data", "The metric goes into these templates (added where they lack it, e.g. refrigerants, vehicle fuel, surface water, employees' safety hours), the company data, or a data request to its owner.", "Values are collected and approved for every plant and month, or the owner's data is received and confirmed.", "The reviewer, value by value. A data gap cannot be ticked off."],
        ["Adopt the document", "The policy or procedure is drafted or fixed, approved (by the Board for policies) and filed.", "The document review finds it adequate.", "The reviewer, in the document review."],
        ["Board decision", "A proposal goes to the ESG committee and the Board; the decision is minuted.", "The minutes are on file.", "The ESG lead, against the minutes."],
        ["Draft the disclosure", "The answer is drafted in the test report from current practice and the documents it relies on.", "The question's owner confirms it in the test report review.", "The data owner, at sign-off."],
        ["Partner programme", "Partners above 2% of purchases or sales are sent a short BRSR Core questionnaire.", "Partner data is received and checked.", "The ESG lead."],
      ],
      [16, 38, 26, 20],
      { numeric: false },
    ),
  )
  for (const t of [
    "Monthly: the ESG lead reviews the closing tracker (Plan → Close gaps) with the ESG committee: items closed, overdue and awaiting verification.",
    "After each closed month and each document review the assessment re-runs; a gap the data or the review still shows goes back to its owner.",
    "Quarterly: progress since the gap analysis (BRSR questions ready then and now) goes to the Board.",
    "Before the test report: every Before-listing item is closed or has an agreed date and owner.",
  ])
    children.push(bullet(t))
  return new Document({
    creator: "esgOS",
    title: `BRSR data collection procedures — ${c.legalName}`,
    styles: STYLES,
    numbering: NUMBERING,
    sections: [{ properties: { page: { size: PAGE, margin: MARGIN } }, headers: { default: header(`${c.shortName} · BRSR data collection procedures`, "INTERNAL") }, footers: { default: footer(`Applies from ${m.fy}`) }, children }],
  })
}
