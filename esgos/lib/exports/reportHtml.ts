// The BRSR test report as a printable page (Save as PDF from the browser's print
// dialog): A4, a cover, contents, the summary, every section and the assumptions,
// with the internal-use marker and page numbers on every page.

import type { Answer } from "./answers"
import type { ReportQuestion, TestReportDoc } from "./testReport"
import { principleName } from "./testReport"

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
const KIND = { answered: "Answered", partial: "Partly answered", placeholder: "To complete" }

function answer(a: Answer) {
  const out: string[] = []
  if (a.text) out.push(`<p class="${a.kind === "placeholder" ? "ph" : "ans"}">${esc(a.text)}</p>`)
  if (a.table)
    out.push(
      `<table><thead><tr>${a.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${a.table.rows
        .map((r) => `<tr${r[0].startsWith("  ") ? ' class="sub"' : ""}>${r.map((c, i) => `<td${i > 0 && /^[\d—₹.,\s%×⁰¹²³⁴⁵⁶⁷⁸⁹⁻-]+$/.test(c) ? ' class="num"' : ""}>${esc(c.trim())}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`,
    )
  if (!a.text && !a.table) out.push(`<p class="ph">[To be completed]</p>`)
  const meta = [a.source && `Source: ${a.source}`, a.note].filter(Boolean).join(" · ")
  if (meta) out.push(`<p class="meta">${esc(meta)}</p>`)
  return out.join("")
}

function question(q: ReportQuestion) {
  const tags = [q.core && "BRSR Core", q.leadership && "Leadership"].filter(Boolean) as string[]
  return `<section class="q"><div class="qh"><span class="qn">${esc(q.number)}.</span><span class="qt">${esc(q.text)}</span></div><div class="qm"><span class="k ${q.answer.kind}">${KIND[q.answer.kind]}</span>${tags.map((t) => `<span class="tag">${t}</span>`).join("")}<span class="own">${esc(q.id)} · owner: ${esc(q.session)}</span></div>${answer(q.answer)}</section>`
}

export function reportHtml(d: TestReportDoc): string {
  const pct = (n: number) => `${Math.round((n / d.counts.total) * 100)}%`
  const contents = d.sections
    .map((s) => `<li><b>${esc(s.title)}</b><ol>${s.groups.map((g) => `<li>${esc(g.title)}</li>`).join("")}</ol></li>`)
    .join("")
  const coverage = d.coverage
    .map((c) => {
      const t = c.answered + c.partial + c.placeholder
      return `<tr><td>${esc(c.label)}</td><td class="num">${c.answered}</td><td class="num">${c.partial}</td><td class="num">${c.placeholder}</td><td><div class="bar"><span class="a" style="width:${(c.answered / t) * 100}%"></span><span class="p" style="width:${(c.partial / t) * 100}%"></span></div></td></tr>`
    })
    .join("")
  const sections = d.sections
    .map(
      (s) =>
        `<h1 class="sec">${esc(s.title)}</h1><p class="intro">${esc(s.intro)}</p>${s.groups
          .map((g) => {
            const p = g.id.match(/^(P\d)/)?.[1]
            return `<h2>${esc(g.title)}</h2>${p && g.id.endsWith("essential") ? `<p class="pr">${esc(principleName(p))}</p>` : ""}${g.questions.map(question).join("")}`
          })
          .join("")}`,
    )
    .join("")
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(d.meta.shortName)} BRSR test report ${esc(d.meta.fy)}</title>
<style>
@page { size: A4; margin: 18mm 16mm 20mm; @top-left { content: "${esc(d.meta.shortName)} · BRSR test report ${esc(d.meta.fy)}"; font: 8pt Arial, sans-serif; color: #64748b } @top-right { content: "TEST REPORT · INTERNAL"; font: bold 8pt Arial, sans-serif; color: #be123c } @bottom-left { content: "For internal review only · not for publication"; font: 8pt Arial, sans-serif; color: #64748b } @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt Arial, sans-serif; color: #64748b } }
@page :first { @top-left { content: none } @top-right { content: none } @bottom-left { content: none } @bottom-right { content: none } }
* { box-sizing: border-box }
body { font: 10pt/1.45 Arial, Helvetica, sans-serif; color: #0f172a; margin: 0 }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always }
.cover .mark { border: 1.5pt solid #be123c; color: #be123c; font-weight: bold; letter-spacing: .08em; font-size: 9pt; padding: 6pt 10pt; display: inline-block }
.cover h1 { font-size: 30pt; line-height: 1.1; margin: 40mm 0 6mm; font-weight: 700; letter-spacing: -.01em }
.cover .co { font-size: 16pt; margin: 0 }
.cover .fy { font-size: 12pt; color: #475569; margin: 2mm 0 0 }
.cover dl { display: grid; grid-template-columns: 34mm 1fr; gap: 2mm 6mm; font-size: 9pt; color: #334155 }
.cover dt { color: #64748b }
.cover .rule { height: 3pt; background: linear-gradient(90deg,#059669,#0891b2,#2563eb); margin-bottom: 6mm }
h1.sec { font-size: 18pt; margin: 0 0 2mm; page-break-before: always; border-bottom: 2pt solid #0f172a; padding-bottom: 2mm }
.intro { color: #475569; margin: 0 0 6mm }
h2 { font-size: 12.5pt; margin: 8mm 0 1mm; color: #0f172a; page-break-after: avoid }
.pr { color: #475569; font-style: italic; margin: 0 0 3mm; font-size: 9pt }
.q { margin: 0 0 5mm; page-break-inside: avoid }
.qh { display: flex; gap: 2mm; font-weight: bold }
.qn { min-width: 7mm; color: #475569 }
.qm { margin: 1mm 0 1.5mm 9mm; display: flex; gap: 2mm; align-items: center; font-size: 7.5pt }
.k { padding: .5pt 4pt; border-radius: 2pt; font-weight: bold }
.k.answered { background: #d1fae5; color: #065f46 } .k.partial { background: #fef3c7; color: #92400e } .k.placeholder { background: #ffe4e6; color: #9f1239 }
.tag { border: .5pt solid #cbd5e1; padding: .5pt 4pt; border-radius: 2pt; color: #475569 }
.own { color: #64748b; margin-left: auto }
.q p, .q table { margin-left: 9mm }
.q table { width: calc(100% - 9mm) }
.ans { margin: 0 0 1.5mm } .ph { margin: 0 0 1.5mm; color: #b45309; font-style: italic }
.meta { font-size: 7.5pt; color: #64748b; margin: 1mm 0 0 9mm }
table { border-collapse: collapse; font-size: 8.5pt; margin: 1mm 0 }
th { background: #1e293b; color: #fff; text-align: left; padding: 2.5pt 4pt; font-weight: bold }
td { border-bottom: .5pt solid #e2e8f0; padding: 2.5pt 4pt; vertical-align: top }
td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap }
tr.sub td:first-child { padding-left: 12pt; color: #475569 }
.toc { page-break-after: always } .toc ol { margin: 1mm 0 3mm; color: #334155 } .toc > ol > li { margin-bottom: 2mm }
.summary { page-break-after: always }
.kn { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin: 4mm 0 6mm }
.kn div { border-top: 2pt solid #059669; padding-top: 2mm } .kn b { font-size: 15pt; display: block } .kn span { font-size: 8pt; color: #64748b }
.bar { height: 5pt; background: #ffe4e6; display: flex; width: 50mm } .bar .a { background: #059669 } .bar .p { background: #f59e0b }
.assume td:first-child { width: 28mm; font-weight: bold }
</style></head><body>
<div class="cover"><div><span class="mark">TEST REPORT · FOR INTERNAL REVIEW ONLY · NOT FOR PUBLICATION</span><h1>Business Responsibility and Sustainability Report</h1><p class="co">${esc(d.meta.company)}</p><p class="fy">${esc(d.meta.fy)} · ${esc(d.meta.period)}</p></div>
<div><div class="rule"></div><dl><dt>Status</dt><dd>${esc(d.meta.status)}</dd><dt>Prepared</dt><dd>${day(d.meta.prepared)} by ${esc(d.meta.preparedBy)}</dd>${d.meta.cin ? `<dt>CIN</dt><dd>${esc(d.meta.cin)}</dd>` : ""}<dt>Boundary</dt><dd>${esc(d.meta.boundary)}</dd><dt>Format</dt><dd>SEBI BRSR (as updated in 2023 and 2025): Sections A, B and C</dd><dt>Assurance</dt><dd>Not assessed or assured. Not approved by the Board. Not for use in any offer document.</dd></dl></div></div>
<div class="toc"><h1 class="sec" style="page-break-before:auto">Contents</h1><ol><li><b>How complete this report is</b></li>${contents}<li><b>Assumptions and limitations</b></li></ol></div>
<div class="summary"><h1 class="sec" style="page-break-before:auto">How complete this report is</h1>
<p>${d.counts.answered} of ${d.counts.total} questions (${pct(d.counts.answered)}) are answered from the company's records, ${d.counts.partial} (${pct(d.counts.partial)}) partly, and ${d.counts.placeholder} (${pct(d.counts.placeholder)}) are placeholders naming who completes them. ${d.drafts ? `${d.drafts} answers were drafted in esgOS and are confirmed by their owners in review.` : ""} Every answer names its source.</p>
${d.keyNumbers.length ? `<h2>Key numbers</h2><div class="kn">${d.keyNumbers.map((k) => `<div><b>${esc(k.value)} <small>${esc(k.unit)}</small></b><span>${esc(k.label)} · ${esc(k.ref)}${k.note ? ` · ${esc(k.note)}` : ""}</span></div>`).join("")}</div>` : ""}
<h2>By section</h2><table><thead><tr><th>Section</th><th>Answered</th><th>Partly</th><th>To complete</th><th></th></tr></thead><tbody>${coverage}</tbody></table>
<h2>Review with data owners</h2><p>${d.review.held} of ${d.review.sessions} sessions held; ${d.review.signedOff} signed off; ${d.review.openQueries} of ${d.review.queries} queries open. Each session checks accuracy, completeness and consistency with internal documents.</p>
<table><thead><tr><th>Data owner</th><th>Questions</th><th>Status</th><th>Signed off</th></tr></thead><tbody>${d.review.rows.map((r) => `<tr><td>${esc(r.owner)}</td><td class="num">${r.questions}</td><td>${esc(r.status)}</td><td>${esc(r.signedOff ?? "—")}</td></tr>`).join("")}</tbody></table></div>
${sections}
<h1 class="sec">Assumptions and limitations</h1><p class="intro">Read with every answer above. Each one names what it does to the disclosure and what removes it.</p>
<table class="assume"><thead><tr><th>Area</th><th>Assumption or limitation</th><th>Effect</th><th>What removes it</th><th>Owner</th></tr></thead><tbody>${d.assumptions.map((a) => `<tr><td>${esc(a.area)}</td><td>${esc(a.assumption)}</td><td>${esc(a.effect)}</td><td>${esc(a.remove)}</td><td>${esc(a.owner)}</td></tr>`).join("")}</tbody></table>
</body></html>`
}

// Print through a hidden frame so the app itself is not printed.
export function printReport(d: TestReportDoc) {
  const frame = document.createElement("iframe")
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"
  document.body.appendChild(frame)
  const doc = frame.contentDocument!
  doc.open()
  doc.write(reportHtml(d))
  doc.close()
  setTimeout(() => {
    frame.contentWindow!.focus()
    frame.contentWindow!.print()
    setTimeout(() => frame.remove(), 60_000)
  }, 300)
}
