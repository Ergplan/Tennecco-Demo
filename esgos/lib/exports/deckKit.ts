// The deck design system: theme, slide layouts with real title placeholders,
// and the few building blocks every slide is composed from (cards, chips,
// status dots, numbered circles, stacked bars). Colours follow the app's day
// mode, so a deck reads as the same product as the page it was exported from.

import PptxGenJS from "pptxgenjs"
import type { Status } from "../readiness/types"

export const FONT = "Arial"
export const W = 13.333
export const H = 7.5
export const MX = 0.6
export const CW = W - 2 * MX
export const TOP = 1.78
export const BOTTOM = 6.92

export const INK = "0B0F17"
export const MUTED = "46505F"
export const FAINT = "7D8796"
export const LINE = "E1E5EB"
export const PANEL = "F3F5F8"
export const WHITE = "FFFFFF"
export const GREEN = "059669"
export const AMBER = "D97706"
export const ROSE = "E11D48"
export const CYAN = "0891B2"
export const BLUE = "2563EB"
export const VIOLET = "7C3AED"
export const MINT = "5AD2A4"
export const NIGHT = "0B0F17"

export const STATUS_COLOR: Record<Status, string> = { now: GREEN, sync: AMBER, open: ROSE }

// Written into the deck's theme, so shapes and text the consultant adds in
// PowerPoint pick up the same palette and fonts.
export const DECK_THEME = {
  name: "esgOS",
  colors: { dk1: INK, lt1: WHITE, dk2: MUTED, lt2: PANEL, accent1: GREEN, accent2: AMBER, accent3: ROSE, accent4: CYAN, accent5: BLUE, accent6: VIOLET, hlink: BLUE, folHlink: VIOLET },
}

// Mix a colour with white: amount 0 is the colour, 1 is white.
export function tint(hex: string, amount: number) {
  const n = parseInt(hex, 16)
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  const r = mix((n >> 16) & 255)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0").toUpperCase()
}

// Cut at a word boundary so text never runs past its box.
export function clip(s: string, n: number) {
  const t = s.replace(/\s+/g, " ").trim()
  if (t.length <= n) return t
  const cut = t.slice(0, n - 1)
  const at = cut.lastIndexOf(" ")
  return `${(at > n * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.(–-]+$/, "")}…`
}

// Greedy word wrap with Arial's average advance, so a layout can place the
// next block under the last line instead of guessing a fixed height.
export function lineCount(value: string, w: number, size: number, bold = false) {
  const perLine = Math.max(8, Math.floor(w / (size * (bold ? 0.0073 : 0.0066))))
  let lines = 1
  let used = 0
  for (const word of value.split(/\s+/).filter(Boolean)) {
    const len = word.length
    if (!used) used = len
    else if (used + 1 + len <= perLine) used += 1 + len
    else {
      lines++
      used = len
    }
  }
  return lines
}
export const lineH = (size: number) => (size * 1.2) / 72
export const textH = (value: string, w: number, size: number, bold = false) => lineCount(value, w, size, bold) * lineH(size)

// The longest word-boundary cut of the text that fits in maxLines.
export function fit(value: string, w: number, size: number, maxLines: number, bold = false) {
  const t = value.replace(/\s+/g, " ").trim()
  if (lineCount(t, w, size, bold) <= maxLines) return t
  const words = t.split(" ")
  for (let k = words.length - 1; k > 0; k--) {
    const c = `${words.slice(0, k).join(" ").replace(/[\s,;:.(–-]+$/, "")}…`
    if (lineCount(c, w, size, bold) <= maxLines) return c
  }
  return clip(t, 12)
}

// fit() for text that follows a bold label ("Today", "Action") in the same box.
export function fitAfter(label: string, value: string, w: number, size: number, maxLines: number) {
  return fit(`${label} ${value}`, w, size, maxLines).slice(label.length + 1)
}

export type Slide = PptxGenJS.Slide
type TextOpts = PptxGenJS.TextPropsOptions

export type DeckMeta = { title: string; client: string; date: string; footer: string; author: string; company: string }

export const LAYOUT = { cover: "Cover", content: "Content", dark: "Dark content" } as const

export function newDeck(meta: DeckMeta) {
  const pptx = new PptxGenJS()
  pptx.layout = "LAYOUT_WIDE"
  pptx.author = meta.author
  pptx.company = meta.company.replace(/&/g, "&amp;")
  pptx.title = meta.title
  pptx.subject = `${meta.client} · ${meta.title}`
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT }

  const footer = (color: string) => ({ text: { text: meta.footer, options: { x: MX, y: 7.08, w: 10, h: 0.24, fontFace: FONT, fontSize: 9, color, margin: 0, valign: "middle" as const } } })
  const eyebrow = (color: string) => ({
    placeholder: { options: { name: "eyebrow", type: "body" as const, x: MX, y: 0.36, w: CW, h: 0.26, fontFace: FONT, fontSize: 10.5, bold: true, color, charSpacing: 1.5, margin: 0, align: "left" as const, valign: "top" as const }, text: "" },
  })
  const title = (color: string) => ({
    placeholder: { options: { name: "title", type: "title" as const, x: MX, y: 0.64, w: CW, h: 0.98, fontFace: FONT, fontSize: 24, bold: true, color, margin: 0, align: "left" as const, valign: "top" as const }, text: "" },
  })

  pptx.defineSlideMaster({
    title: LAYOUT.cover,
    background: { color: NIGHT },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: MX, y: 2.05, w: 8.3, h: 1.95, fontFace: FONT, fontSize: 36, bold: true, color: WHITE, margin: 0, align: "left", valign: "bottom" }, text: "" } },
      { placeholder: { options: { name: "subtitle", type: "body", x: MX, y: 4.2, w: 8.3, h: 0.5, fontFace: FONT, fontSize: 18, color: "CBD5E1", margin: 0, align: "left", valign: "top" }, text: "" } },
      footer("94A3B8"),
    ],
  })
  pptx.defineSlideMaster({
    title: LAYOUT.content,
    background: { color: WHITE },
    margin: [0.5, MX, 0.6, MX],
    objects: [eyebrow(GREEN), title(INK), footer(FAINT)],
    slideNumber: { x: W - MX - 0.6, y: 7.08, w: 0.6, h: 0.24, fontFace: FONT, fontSize: 9, color: FAINT, align: "right" },
  })
  pptx.defineSlideMaster({
    title: LAYOUT.dark,
    background: { color: NIGHT },
    objects: [eyebrow(MINT), title(WHITE), footer("94A3B8")],
    slideNumber: { x: W - MX - 0.6, y: 7.08, w: 0.6, h: 0.24, fontFace: FONT, fontSize: 9, color: "94A3B8", align: "right" },
  })

  let section = ""
  const slide = (opts: { layout?: keyof typeof LAYOUT; eyebrow?: string; title?: string; section: string; notes?: string }): Slide => {
    if (opts.section !== section) {
      pptx.addSection({ title: opts.section })
      section = opts.section
    }
    const s = pptx.addSlide({ masterName: LAYOUT[opts.layout ?? "content"], sectionTitle: opts.section })
    if (opts.eyebrow) s.addText(opts.eyebrow.toUpperCase(), { placeholder: "eyebrow" })
    if (opts.title) s.addText(clip(opts.title, 125), { placeholder: "title" })
    if (opts.notes) s.addNotes(opts.notes)
    return s
  }
  return { pptx, slide }
}

// ---------------------------------------------------------------- blocks

export function text(s: Slide, value: string | PptxGenJS.TextProps[], opts: TextOpts & { x: number; y: number; w: number; h: number }) {
  s.addText(value, { fontFace: FONT, fontSize: 12, color: INK, margin: 0, valign: "top", isTextBox: true, ...opts })
}

export function card(s: Slide, x: number, y: number, w: number, h: number, fill = PANEL, name?: string) {
  s.addShape("roundRect", { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, rectRadius: 0.06, objectName: name })
}

export function dot(s: Slide, x: number, y: number, d: number, color: string, hollow = false) {
  s.addShape("ellipse", { x, y, w: d, h: d, fill: hollow ? { color: WHITE, transparency: 100 } : { color }, line: { color, width: hollow ? 1 : 0 } })
}

// A rounded label: tinted fill, text in the full colour.
export function chip(s: Slide, x: number, y: number, label: string, color: string, opts: { size?: number; h?: number; solid?: boolean } = {}) {
  const size = opts.size ?? 10
  const h = opts.h ?? 0.26
  const w = label.length * size * 0.0078 + 0.26
  s.addShape("roundRect", { x, y, w, h, fill: { color: opts.solid ? color : tint(color, 0.86) }, line: { color: opts.solid ? color : tint(color, 0.86), width: 0 }, rectRadius: h / 2 })
  s.addText(label, { x, y, w, h, fontFace: FONT, fontSize: size, bold: true, color: opts.solid ? WHITE : color, align: "center", valign: "middle", margin: 0, isTextBox: true })
  return w
}

export function numberCircle(s: Slide, x: number, y: number, n: number | string, color: string, d = 0.34, textColor = WHITE) {
  s.addShape("ellipse", { x, y, w: d, h: d, fill: { color }, line: { color, width: 0 } })
  s.addText(String(n), { x, y, w: d, h: d, fontFace: FONT, fontSize: d >= 0.34 ? 12 : 10, bold: true, color: textColor, align: "center", valign: "middle", margin: 0, isTextBox: true })
}

// In place, needs work and open as one bar.
export function statusBar(s: Slide, x: number, y: number, w: number, h: number, t: { now: number; sync: number; open: number }, empty = LINE) {
  const total = t.now + t.sync + t.open
  if (!total) {
    s.addShape("rect", { x, y, w, h, fill: { color: empty }, line: { color: empty, width: 0 } })
    return
  }
  let at = x
  for (const [n, color] of [
    [t.now, GREEN],
    [t.sync, AMBER],
    [t.open, ROSE],
  ] as const) {
    if (!n) continue
    const ww = (n / total) * w
    s.addShape("rect", { x: at, y, w: ww, h, fill: { color }, line: { color, width: 0 } })
    at += ww
  }
}

export function legend(s: Slide, x: number, y: number, items: [string, string, boolean?][], color = MUTED) {
  let at = x
  for (const [label, c, hollow] of items) {
    dot(s, at, y + 0.05, 0.14, c, hollow)
    const w = label.length * 0.075 + 0.2
    text(s, label, { x: at + 0.2, y, w, h: 0.24, fontSize: 10.5, color, valign: "middle" })
    at += w + 0.35
  }
}

// ---------------------------------------------------------------- file

function themeXml(xml: string) {
  const slots = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"] as const
  const scheme = `<a:clrScheme name="${DECK_THEME.name}">${slots.map((k) => `<a:${k}><a:srgbClr val="${DECK_THEME.colors[k]}"/></a:${k}>`).join("")}</a:clrScheme>`
  return xml.replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme).replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, head: string) => `${head}${DECK_THEME.name}"`)
}

export const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

// pptxgenjs ignores compression when an output type is given and always writes
// Office's palette, so the file is reopened once to set both.
export async function packDeck(pptx: PptxGenJS, type: "blob"): Promise<Blob>
export async function packDeck(pptx: PptxGenJS, type: "uint8array"): Promise<Uint8Array>
export async function packDeck(pptx: PptxGenJS, type: "blob" | "uint8array") {
  const raw = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer
  const { default: JSZip } = await import("jszip")
  const zip = await JSZip.loadAsync(raw)
  const part = zip.file("ppt/theme/theme1.xml")
  if (part) zip.file("ppt/theme/theme1.xml", themeXml(await part.async("string")))
  return type === "blob" ? zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: PPTX_MIME }) : zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })
}
