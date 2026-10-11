"use client"

// Draft a BRSR answer where the data or the practice is known but not yet
// written. The draft goes into the test report as a partly answered question,
// and becomes answered once its owner signs off their review session.

import { Check } from "lucide-react"
import { useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { draftConfirmed } from "@/esgos/lib/closure"
import { Button } from "../common/ui"

export function DraftEditor({ id, ownerRole, rows = 4 }: { id: string; ownerRole?: string; rows?: number }) {
  const draft = useStore((s) => s.drafts[id])
  const review = useStore((s) => s.reportReview)
  const saveDraft = useStore((s) => s.saveDraft)
  const [text, setText] = useState(draft?.text ?? "")
  const confirmed = draftConfirmed(id, ownerRole, draft, review)
  const dirty = text !== (draft?.text ?? "")
  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={rows}
        aria-label={`Draft answer for ${id}`}
        placeholder="Write the answer as it will read in the report: what is done, since when, where the evidence is."
        className="w-full rounded-md border border-line-strong bg-bg px-2.5 py-2 text-xs leading-relaxed outline-none placeholder:text-faint focus:border-fg/60"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
        <Button size="sm" disabled={!dirty} onClick={() => saveDraft(id, text)}>
          <Check size={12} /> Save draft
        </Button>
        {draft && !dirty && (
          <span className={confirmed ? "text-accent" : "text-muted"}>
            {confirmed ? "Confirmed by the owner in review" : `Drafted by ${draft.by.split(" (")[0]} on ${new Date(draft.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}; to be confirmed in the review`}
          </span>
        )}
      </div>
    </div>
  )
}
