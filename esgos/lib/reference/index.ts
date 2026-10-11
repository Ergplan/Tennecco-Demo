import raw from "./data.json"
import type { RefEntry, ReferenceData } from "./types"

export const REFERENCE = raw as unknown as ReferenceData

const BY_ID = new Map(REFERENCE.entries.map((e) => [e.id, e]))

export function entry(id: string): RefEntry | undefined {
  return BY_ID.get(id)
}

export function entriesForQuestion(qid: string): RefEntry[] {
  const why = REFERENCE.questions[qid]
  const ids = [...(why?.feeds ?? []), ...(why?.regulations ?? [])]
  const linked = ids.map((id) => BY_ID.get(id)).filter(Boolean) as RefEntry[]
  const tagged = REFERENCE.entries.filter((e) => e.relatedQuestions?.includes(qid) && !ids.includes(e.id))
  return [...linked, ...tagged]
}

// Numbers listed after a keyword: "Indicators 3 and 7" → [3, 7]; "items 1-12" → 1..12.
function numbersAfter(ref: string, keyword: RegExp): number[] {
  const m = ref.match(new RegExp(`${keyword.source}\\s+([0-9][0-9\\s,\\-–and]*)`))
  if (!m) return []
  const out: number[] = []
  for (const part of m[1].split(/,|\band\b/)) {
    const [a, b] = part.split(/[-–]/).map((x) => parseInt(x, 10))
    if (Number.isNaN(a)) continue
    if (b && b >= a) for (let i = a; i <= b; i++) out.push(i)
    else out.push(a)
  }
  return out
}

// Indicator ids in the product (e.g. "P6.E1.fuel", "A.IV.20") map to BRSR refs by section, principle and number.
export function entriesForIndicator(indicatorId: string): RefEntry[] {
  const m = indicatorId.match(/^P(\d)\.(E|L)(\d+)/)
  const a = indicatorId.match(/^([AB])\.(?:[IVX]+\.)?(\d+)/)
  return REFERENCE.entries.filter((e) => {
    if (e.framework !== "BRSR") return false
    const r = e.ref.toLowerCase()
    if (m) {
      const kind = m[2] === "E" ? "essential" : "leadership"
      return r.includes(`principle ${m[1]},`) && r.includes(kind) && numbersAfter(r, /indicators?/).includes(Number(m[3]))
    }
    if (a) return r.startsWith(`section ${a[1].toLowerCase()}`) && numbersAfter(r, /(?:items?|questions?)/).includes(Number(a[2]))
    return false
  })
}

export function searchReference(query: string, framework?: RefEntry["framework"] | null): RefEntry[] {
  const q = query.trim().toLowerCase()
  return REFERENCE.entries.filter((e) => {
    if (framework && e.framework !== framework) return false
    if (!q) return true
    return [e.title, e.ref, e.officialText, e.whyNeeded, e.whatToReport, e.id].some((t) => t?.toLowerCase().includes(q))
  })
}

export const FRAMEWORKS: RefEntry["framework"][] = ["BRSR", "BRSR Core", "GHG Protocol", "Regulation", "Emission factor", "Applicability"]
