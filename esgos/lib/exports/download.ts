// Build a deliverable from the current state and save it in the browser. Used by
// Plan → Deliverables and by the export button on the gap analysis results page.
// The heavy libraries load only when a file is asked for.

import { actorUser, useStore } from "../store"
import { getClient } from "../clients"

export type DeliverableKind = "gap" | "roadmap" | "board" | "templates" | "procedures" | "report" | "workbook" | "assumptions" | "testdeck"
export type DeliverableFormat = "pptx" | "xlsx" | "docx"

export const MIME: Record<DeliverableFormat, string> = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

export async function buildDeliverable(kind: DeliverableKind): Promise<Blob> {
  const state = useStore.getState()
  const { buildReportModel } = await import("./model")
  const m = buildReportModel(state, actorUser())
  if (kind === "gap" || kind === "roadmap" || kind === "board" || kind === "testdeck") {
    const [decks, kit] = await Promise.all([import("./pptx"), import("./deckKit")])
    const pptx = kind === "gap" ? decks.gapAnalysisDeck(m) : kind === "roadmap" ? decks.roadmapDeck(m) : kind === "board" ? decks.boardDeck(m) : decks.testReportDeck(m)
    return kit.packDeck(pptx, "blob")
  }
  if (kind === "templates" || kind === "workbook") {
    const x = await import("./xlsx")
    const wb = kind === "templates" ? x.templatesWorkbook(m) : x.dataWorkbook(m)
    const buf = await wb.xlsx.writeBuffer()
    return new Blob([buf], { type: MIME.xlsx })
  }
  const [{ Packer }, d] = await Promise.all([import("docx"), import("./docx")])
  const doc = kind === "report" ? d.testReportDoc(m) : kind === "assumptions" ? d.assumptionsDoc(m) : d.proceduresDoc(m)
  return Packer.toBlob(doc)
}

function save(blob: Blob, name: string) {
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

// Builds, saves and logs the file; returns its name.
export async function downloadDeliverable(kind: DeliverableKind, format: DeliverableFormat, slug: string): Promise<string> {
  const blob = await buildDeliverable(kind)
  const name = `${getClient().id}-${slug}-${new Date().toISOString().slice(0, 10)}.${format}`
  save(blob, name)
  useStore.getState().log("export deliverable", name, undefined, { bytes: blob.size })
  return name
}
