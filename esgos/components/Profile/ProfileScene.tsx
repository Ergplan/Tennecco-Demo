"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, Copy, SkipForward } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { goTo } from "@/esgos/lib/navigation"
import { gotoProfileSite, nextProfileSite, recordKnownItems } from "@/esgos/lib/pipelines"
import { inBoundary, profileEstimate, profileOrder, sourceState, templateFor } from "@/esgos/lib/selectors"
import { effectiveAnswers, expectedQuestions, formatEstimate, formatShort, nextQuestion, planCopy, QUESTION_LABELS, suppressedFor, type Question } from "@/esgos/lib/questionEngine"
import { fmtAnswer } from "@/esgos/lib/format"
import { getClient } from "@/esgos/lib/clients"
import { peopleFor, personLabel, roleInSentence } from "@/esgos/lib/stakeholders"
import { CATEGORY_ICON } from "../common/icons"
import { AskSomeone, PeopleStrip } from "./AskSomeone"
import { GoogleSiteMap } from "../Map/GoogleSiteMap"
import { mapsConfigured } from "@/esgos/providers/maps"
import { getMode } from "@/esgos/lib/mode"
import type { AnswerValue, DataPoint, Site } from "@/esgos/lib/types"
import { NOT_SURE } from "@/esgos/lib/types"
import { INDICATOR_BY_ID } from "@/esgos/lib/indicators"
import { AgentLine } from "../common/AgentLine"
import { Button, Eyebrow, SceneLayout } from "../common/ui"
import { SourceBadge } from "../common/Value"
import { SiteVisual } from "../Factory/SiteVisual"
import { cn } from "../common/cn"
import { TYPE_ICON } from "../Seed/SeedScene"

const INTRO = "I know where you operate, who owns each site, and how electricity, steam and water flow. Now the few things no meter can tell me."

function KnownBadge({ label, dp }: { label: string; dp: DataPoint }) {
  const setUi = useStore((s) => s.setUi)
  return (
    <button type="button" onClick={() => setUi({ provenance: dp })} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-2.5 pr-1 text-xs hover:border-line-strong" aria-label={`${label} known from ${dp.source}. Show provenance.`}>
      <span className="text-fg">{label}</span>
      <SourceBadge dp={dp} detail={false} />
      <Check size={12} className="mr-1 text-accent" aria-hidden />
    </button>
  )
}

function knownItems(site: Site, dps: DataPoint[]): { label: string; dp: DataPoint }[] {
  const find = (suffix: string) => dps.find((d) => d.id === `dp:${site.id}:${suffix}`)
  const items: { label: string; dp?: DataPoint }[] = [
    { label: "Electricity", dp: find("elec.annual") },
    { label: "Steam", dp: find("steam") },
    { label: "Water", dp: find("water") },
    { label: "DG diesel", dp: find("dg") },
    { label: "Headcount", dp: find("headcount") },
    { label: "Products", dp: find("products") },
    { label: "Fuel purchases", dp: find("fuel.qty") },
    { label: "Waste register", dp: find("waste") },
    { label: "Incidents", dp: find("incidents") },
    { label: "Permit", dp: dps.find((d) => d.scope.siteId === site.id && d.indicator === "P6.E13" && d.source === "vault") },
    { label: "Location confirmed", dp: find("location") },
    { label: "Entity confirmed", dp: find("entity") },
  ]
  return items.filter((i): i is { label: string; dp: DataPoint } => !!i.dp)
}

function AnswerControl({ q, site, onAnswer }: { q: Question; site: Site; onAnswer: (v: AnswerValue) => void }) {
  const [multi, setMulti] = useState<string[]>([])
  const [num, setNum] = useState("")
  const [unit, setUnit] = useState(q.units?.[0] ?? "")
  const [text, setText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMulti([])
    setNum("")
    setText("")
    if (q.type === "number" || q.type === "text") setTimeout(() => inputRef.current?.focus(), 250)
  }, [q.id, site.id, q.type])

  // Keyboard: 1–9 pick options, Y/N for yes/no.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return
      if (q.type === "boolean") {
        if (e.key === "y") onAnswer(true)
        if (e.key === "n") onAnswer(false)
      }
      const n = Number(e.key)
      if (q.options && n >= 1 && n <= q.options.length) {
        if (q.type === "singleSelect") onAnswer(q.options[n - 1])
        if (q.type === "multiSelect") setMulti((m) => (m.includes(q.options![n - 1]) ? m.filter((x) => x !== q.options![n - 1]) : [...m, q.options![n - 1]]))
      }
      if (e.key === "Enter" && q.type === "multiSelect" && multi.length) onAnswer(multi)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [q, multi, onAnswer])

  const card = "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left text-[15px] transition-colors"

  if (q.type === "boolean") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Yes", v: true, k: "Y" },
          { label: "No", v: false, k: "N" },
        ].map((o) => (
          <motion.button key={o.label} type="button" whileTap={{ scale: 0.97 }} onClick={() => onAnswer(o.v)} className={cn(card, "border-line-strong bg-surface py-5 hover:border-accent/50 hover:bg-accent/[0.05]")}>
            <span className="text-lg font-medium">{o.label}</span>
            <kbd className="text-[10px] text-faint">{o.k}</kbd>
          </motion.button>
        ))}
      </div>
    )
  }
  if (q.type === "singleSelect") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options!.map((o, i) => (
          <motion.button key={o} type="button" whileTap={{ scale: 0.98 }} onClick={() => onAnswer(o)} className={cn(card, "border-line-strong bg-surface hover:border-accent/50 hover:bg-accent/[0.05]")}>
            <span>{o}</span>
            <kbd className="text-[10px] text-faint">{i + 1}</kbd>
          </motion.button>
        ))}
      </div>
    )
  }
  if (q.type === "multiSelect") {
    return (
      <div>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Choose all that apply">
          {q.options!.map((o, i) => {
            const on = multi.includes(o)
            return (
              <motion.button
                key={o}
                type="button"
                whileTap={{ scale: 0.97 }}
                aria-pressed={on}
                onClick={() => setMulti((m) => (on ? m.filter((x) => x !== o) : [...m, o]))}
                className={cn(card, on ? "border-accent/60 bg-accent/[0.08]" : "border-line-strong bg-surface hover:border-line-strong hover:bg-surface-2")}
              >
                <span>{o}</span>
                {on ? <Check size={15} className="text-accent" /> : <kbd className="text-[10px] text-faint">{i + 1}</kbd>}
              </motion.button>
            )
          })}
        </div>
        <Button variant="primary" className="mt-4" disabled={!multi.length} onClick={() => onAnswer(multi)}>
          Continue <ArrowRight size={15} />
        </Button>
      </div>
    )
  }
  if (q.type === "number") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const v = Number(num.replace(/,/g, ""))
          if (Number.isFinite(v) && v > 0) onAnswer({ value: v, unit })
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <label htmlFor="num-answer" className="sr-only">
          Value
        </label>
        <input id="num-answer" ref={inputRef} inputMode="decimal" value={num} onChange={(e) => setNum(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="e.g. 18,400" className="h-12 w-44 rounded-2xl border border-line-strong bg-surface px-4 text-lg tnum outline-none focus:border-accent/60" />
        <label htmlFor="unit-answer" className="sr-only">
          Unit
        </label>
        <select id="unit-answer" value={unit} onChange={(e) => setUnit(e.target.value)} className="h-12 rounded-2xl border border-line-strong bg-surface px-3 text-sm">
          {q.units?.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <Button variant="primary" type="submit" size="lg" disabled={!num.trim()}>
          Continue <ArrowRight size={15} />
        </Button>
      </form>
    )
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) onAnswer(text.trim())
      }}
    >
      <label htmlFor="text-answer" className="sr-only">
        Answer
      </label>
      <input id="text-answer" ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} className="h-12 w-full rounded-2xl border border-line-strong bg-surface px-4 text-[15px] outline-none focus:border-accent/60" />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {q.suggestions?.map((sug) => (
          <button key={sug} type="button" onClick={() => setText(sug)} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-fg">
            {sug}
          </button>
        ))}
      </div>
      <Button variant="primary" type="submit" className="mt-3" disabled={!text.trim()}>
        Continue <ArrowRight size={15} />
      </Button>
    </form>
  )
}

function SiteSummary({ site, onNext }: { site: Site; onNext: () => void }) {
  const state = useStore()
  const profile = state.profiles[site.id]
  const clearAnswer = useStore((s) => s.clearAnswer)
  const reopenSite = useStore((s) => s.reopenSite)
  const setUi = useStore((s) => s.setUi)
  const ss = sourceState(state, site)
  const inferred = suppressedFor(site, ss)
  const openTasks = state.tasks.filter((t) => t.siteId === site.id && t.status === "open")
  if (profile?.status === "skipped") {
    return (
      <div className="space-y-4">
        <p className="text-lg font-medium">{site.name} was skipped.</p>
        <p className="text-sm text-muted">
          {openTasks.length} question{openTasks.length === 1 ? "" : "s"} went to {site.ownerRole ?? "the site owner"}.
        </p>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => reopenSite(site.id)}>
            Answer now
          </Button>
          <Button onClick={onNext}>Next site</Button>
        </div>
      </div>
    )
  }
  const rows = Object.entries(profile?.answers ?? {})
  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">
        {site.name} understood <span className="text-accent">✓</span>
      </p>
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {inferred.map(({ question, inferred: inf }) => {
          const dp = state.dataPoints.find((d) => d.id === `dp:${site.id}:q:${question.id}`)
          return (
            <li key={question.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="text-muted">{QUESTION_LABELS[question.id]}</span>
              {dp ? (
                <button type="button" onClick={() => setUi({ provenance: dp })} className="flex items-center gap-2 text-right">
                  <span>{fmtAnswer(inf.value)}</span>
                  <SourceBadge dp={dp} detail={false} />
                </button>
              ) : (
                <span>{fmtAnswer(inf.value)}</span>
              )}
            </li>
          )
        })}
        {rows.map(([qid, v]) => {
          const dp = state.dataPoints.find((d) => d.id === `dp:${site.id}:q:${qid}`)
          const copied = profile?.answeredBy[qid]?.copiedFrom
          return (
            <li key={qid} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="text-muted">
                {QUESTION_LABELS[qid] ?? qid}
                {copied && <span className="ml-1 text-[11px] text-faint">· copied</span>}
              </span>
              <span className="flex items-center gap-2 text-right">
                {dp ? (
                  <button type="button" onClick={() => setUi({ provenance: dp })} className="flex items-center gap-2">
                    <span>{fmtAnswer(v)}</span>
                    <SourceBadge dp={dp} detail={false} />
                  </button>
                ) : (
                  <span className={v === NOT_SURE ? "text-amber" : ""}>
                    {v === NOT_SURE ? `Sent to ${state.tasks.find((t) => t.siteId === site.id && t.questionId === qid)?.assignee?.name ?? "the site owner"}` : fmtAnswer(v)}
                  </span>
                )}
                <button type="button" onClick={() => clearAnswer(site.id, qid)} className="rounded-md px-1.5 text-xs text-faint hover:bg-surface-2 hover:text-fg" aria-label={`Change answer for ${QUESTION_LABELS[qid] ?? qid}`}>
                  Change
                </button>
              </span>
            </li>
          )
        })}
      </ul>
      <Button onClick={onNext}>
        Next site <ArrowRight size={14} />
      </Button>
    </div>
  )
}

export function ProfileScene() {
  const state = useStore()
  const { profiles, activeProfileSite, profileIntroDone, dataPoints, tasks, understood, connect } = state
  const { setProfileIntroDone, setActiveProfileSite, answer, notSure, back, completeSite, skipSite, acceptCopy, declineCopy, say, ensureProfile, setUi } = state
  const [showUnderstood, setShowUnderstood] = useState<string | null>(null)
  const order = useMemo(() => profileOrder(state), [state])
  const site = order.find((s) => s.id === activeProfileSite)
  const profile = site ? profiles[site.id] : undefined
  const ss = site ? sourceState(state, site) : undefined
  const answers = profile?.answers ?? {}
  const q = site && ss && profile?.status !== "done" && profile?.status !== "skipped" ? nextQuestion(site, ss, answers) : undefined
  const tmpl = site && !profile?.copyOffer && !profile?.history.length && !Object.keys(answers).length ? templateFor(state, site) : undefined
  const copyPlan = tmpl ? planCopy(tmpl.target, tmpl.template) : undefined
  const est = profileEstimate(state)
  const sentToPlants = tasks.filter((t) => t.origin !== "plan").length
  const allDone = order.length > 0 && order.every((s) => ["done", "skipped"].includes(profiles[s.id]?.status ?? ""))

  useEffect(() => {
    if (!profileIntroDone) say(INTRO)
    else if (!activeProfileSite && !allDone) setActiveProfileSite(nextProfileSite())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Record the known items (inferred answers) when a site opens.
  useEffect(() => {
    if (site) {
      ensureProfile(site.id)
      recordKnownItems(site)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site?.id])

  // Copy-profile offer is spoken by the agent.
  useEffect(() => {
    if (site && tmpl && copyPlan) say(`${site.name} looks like ${tmpl.template.site.name}. Reuse its profile and ask only about differences?`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site?.id, !!tmpl])

  // Site complete → "understood" moment → next site.
  useEffect(() => {
    if (!site || !profile || q || tmpl || showUnderstood) return
    if (profile.status === "done" || profile.status === "skipped") return
    completeSite(site.id)
    say(`${site.name} understood.`)
    setShowUnderstood(site.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site?.id, q?.id, !!tmpl, profile?.status])

  useEffect(() => {
    if (!showUnderstood) return
    const t = setTimeout(() => {
      setShowUnderstood(null)
      const next = nextProfileSite(showUnderstood)
      if (next) setActiveProfileSite(next)
      else {
        setActiveProfileSite(undefined)
        say(`All ${order.length} sites understood. Let's see what that unlocks.`)
      }
    }, 1100)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUnderstood])

  const doAnswer = useCallback(
    (v: AnswerValue) => {
      if (!site || !q) return
      answer(site.id, q.id, v)
    },
    [site, q, answer],
  )

  const [asking, setAsking] = useState(false)
  const [showKnown, setShowKnown] = useState(false)
  useEffect(() => setAsking(false), [site?.id, q?.id])

  const doNotSure = (assigneeId?: string) => {
    if (!site || !q) return
    const indicator = q.id === "output" ? "P6.E1.intensity" : q.unlocks[0] ?? "context"
    notSure(site.id, q.id, q.text(site), indicator, q.ownerRole === "Office admin" ? "Office admin" : q.category === "people" ? "HR manager" : q.ownerRole, assigneeId)
    const person = assigneeId ? state.stakeholders.find((x) => x.id === assigneeId) : undefined
    say(person ? `Sent to ${personLabel(person)}. Next question.` : `Sent to the ${roleInSentence(q.ownerRole)} at ${site.name}. Next question.`)
    setAsking(false)
  }

  const doSkip = useCallback(() => {
    if (!site || !ss) return
    const pend = expectedQuestions(site, ss, profiles[site.id]?.answers ?? {})
    skipSite(
      site.id,
      pend.map((x) => ({ id: x.id, text: x.text(site), indicator: x.unlocks[0] ?? "context", ownerRole: x.ownerRole, assigneeId: peopleFor(x, site.id, state.stakeholders)[0]?.person.id })),
    )
    const named = new Set(pend.map((x) => peopleFor(x, site.id, state.stakeholders)[0]?.person.name).filter(Boolean))
    say(`${pend.length} question${pend.length === 1 ? "" : "s"} sent to ${named.size ? [...named].join(", ") : site.ownerRole ?? "the site owner"}.`)
    const next = nextProfileSite(site.id)
    setActiveProfileSite(next)
  }, [site, ss, profiles, skipSite, say, setActiveProfileSite])

  useEffect(() => {
    const onSkip = () => doSkip()
    window.addEventListener("esgos:skip-site", onSkip)
    return () => window.removeEventListener("esgos:skip-site", onSkip)
  }, [doSkip])

  // Presenter shortcut (demo mode only): press D to give the scripted answer.
  useEffect(() => {
    if (!getMode().demo) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      // The numeric answer field never takes letters, so D still works while it has focus.
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && t.id !== "num-answer"
      if (typing || e.key.toLowerCase() !== "d" || e.metaKey || e.ctrlKey) return
      if (t.id === "num-answer") e.preventDefault()
      if (!site) return
      const client = getClient()
      if (client.scriptSkip.includes(site.id) && profiles[site.id]?.status !== "done") {
        doSkip()
        return
      }
      if (tmpl && copyPlan) {
        if (site.id === "site-muzaffarnagar") declineCopy(site.id)
        else acceptCopy(site.id, tmpl.template.site.id, copyPlan.copy)
        return
      }
      if (!q) return
      let v: AnswerValue | undefined = client.demoAnswers[site.id]?.[q.id]
      // Off-script on the fictional sample: fall back to a plausible answer so the walkthrough never stalls.
      if (v === undefined && client.kind === "sample") {
        if (q.type === "boolean") v = false
        else if (q.type === "number") v = { value: 1000, unit: q.units?.[0] ?? "" }
        else if (q.type === "multiSelect") v = q.options?.[0] ? [q.options[0]] : undefined
        else v = q.options?.[0] ?? q.suggestions?.[0]
      }
      if (v === undefined) return
      if (v === NOT_SURE) doNotSure(peopleFor(q, site.id, state.stakeholders)[0]?.person.id)
      else answer(site.id, q.id, v)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const eff = site && ss ? effectiveAnswers(site, ss, answers) : {}
  const nodes = site
    ? {
        boiler: eff.boilers === true,
        water: eff.waterSource !== undefined && eff.waterSource !== NOT_SURE,
        waste: (eff.wasteStreams !== undefined && eff.wasteStreams !== NOT_SURE) || eff.officeEwaste !== undefined,
        people: eff.contractors !== undefined || !!dataPoints.find((d) => d.id === `dp:${site.id}:headcount`),
      }
    : {}
  const asked = profile?.history.length ?? 0
  const expected = site && ss ? expectedQuestions(site, ss, answers).length : 0
  const total = asked + expected
  const known = site ? knownItems(site, dataPoints) : []
  const Icon = site ? TYPE_ICON[site.type] : null
  const entity = site ? state.entities.find((e) => e.id === site.legalEntityId) : undefined

  if (!profileIntroDone) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          <AgentLine />
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setProfileIntroDone()
                setActiveProfileSite(nextProfileSite())
              }}
            >
              Start with {order[0]?.name ?? "the first site"} <ArrowRight size={16} />
            </Button>
            <span className="text-sm text-muted">
              {formatEstimate(est.seconds)} · {inBoundary(state).length} sites
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SceneLayout
      visual={
        <div className="absolute inset-0 flex">
          <nav aria-label="Sites" className="scrollbar-thin hidden w-56 shrink-0 overflow-y-auto border-r border-line p-3 md:block">
            <Eyebrow className="px-2 pb-2">Sites</Eyebrow>
            <ul className="space-y-0.5">
              {order.map((s) => {
                const st = profiles[s.id]?.status ?? "pending"
                const active = s.id === site?.id
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => gotoProfileSite(s.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm", active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg")}
                    >
                      <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", st === "done" ? "bg-accent/15 text-accent" : st === "skipped" ? "text-amber" : active ? "border border-accent" : "border border-line-strong")}>
                        {st === "done" && <Check size={10} />}
                        {st === "skipped" && <SkipForward size={10} />}
                      </span>
                      <span className="truncate">{s.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div className="scrollbar-thin relative flex min-w-0 flex-1 flex-col overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8 sm:px-10 lg:py-12">
              {site && tmpl && copyPlan ? (
                <motion.div key={`copy-${site.id}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-accent/30 bg-accent/[0.05] p-5">
                  <AgentLine />
                  <div className="mt-4 flex items-baseline gap-3 text-sm">
                    <span className="text-muted line-through">{formatShort(copyPlan.secondsBefore)}</span>
                    <ArrowRight size={13} className="text-faint" />
                    <span className="text-xl font-medium text-accent">{formatShort(copyPlan.secondsAfter)}</span>
                    <span className="text-muted">
                      · {copyPlan.ask.length} question{copyPlan.ask.length === 1 ? "" : "s"} differ
                    </span>
                  </div>
                  {copyPlan.reasons.length > 0 && <p className="mt-1 text-xs text-muted">Different here: {copyPlan.reasons.join(", ")}.</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={() => {
                        acceptCopy(site.id, tmpl.template.site.id, copyPlan.copy)
                        say(`Reused ${tmpl.template.site.name}'s answers. ${copyPlan.ask.length ? "Just the differences now." : "Nothing differs."}`)
                      }}
                    >
                      <Copy size={14} /> Reuse {tmpl.template.site.name}&apos;s answers
                    </Button>
                    <Button onClick={() => declineCopy(site.id)}>Ask everything</Button>
                  </div>
                </motion.div>
              ) : site && q ? (
                <div className="flex flex-1 flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-faint">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      {(() => {
                        const I = CATEGORY_ICON[q.category]
                        return <I size={12} aria-hidden />
                      })()}
                      Question {Math.min(asked + 1, total)} of {total} at {site.name}
                    </span>
                    <span>{q.unlocks.length ? `Unlocks ${q.unlocks.map((u) => INDICATOR_BY_ID[u]?.id ?? u).join(", ")}` : "Context"}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                    <motion.div className="h-full bg-accent" animate={{ width: `${total ? (asked / total) * 100 : 0}%` }} />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={`${site.id}-${q.id}`} initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="mt-6">
                      <AgentLine variant="question" text={q.text(site)} id={`${site.id}-${q.id}`} />
                      {q.mandatory?.(site, ss!, eff) && q.hint && <p className="mt-2 text-xs text-amber">{q.hint}</p>}
                      <button type="button" onClick={() => setUi({ reference: { questionId: q.id } })} className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted underline-offset-4 hover:text-fg hover:underline">
                        <BookOpen size={12} /> Why is this needed?
                      </button>
                      {asking ? (
                        <AskSomeone q={q} site={site} onSend={(id) => doNotSure(id)} onCancel={() => setAsking(false)} />
                      ) : (
                        <div className="mt-6">
                          <AnswerControl q={q} site={site} onAnswer={doAnswer} />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                    <Button variant="ghost" size="sm" disabled={!asked} onClick={() => back(site.id)}>
                      <ArrowLeft size={14} /> Back
                    </Button>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={doSkip}>
                        Skip site
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setAsking(true)} disabled={asking}>
                        <CircleHelp size={14} /> Not sure — ask someone
                      </Button>
                    </div>
                  </div>
                </div>
              ) : site && profile && (profile.status === "done" || profile.status === "skipped") && !showUnderstood ? (
                <SiteSummary
                  site={site}
                  onNext={() => {
                    const next = nextProfileSite(site.id)
                    setActiveProfileSite(next)
                    if (!next) say(`All ${order.length} sites understood. Let's see what that unlocks.`)
                  }}
                />
              ) : (
                <div className="flex flex-1 flex-col gap-4">
                  <AgentLine />
                  {allDone && (
                    <div className="mt-auto">
                      <Button variant="primary" className="w-full" onClick={() => goTo("gaps")}>
                        Check my BRSR coverage <ArrowRight size={15} />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {!allDone && site && (
                <button type="button" onClick={() => goTo("gaps")} className="text-left text-xs text-faint hover:text-muted">
                  Check coverage now — unanswered sites stay open
                </button>
              )}
            </div>
            <AnimatePresence>
              {showUnderstood && (
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-x-0 top-10 mx-auto w-fit rounded-full border border-accent/40 bg-elev px-5 py-2.5 text-lg font-medium shadow-2xl">
                  {order.find((s) => s.id === showUnderstood)?.name} understood <span className="text-accent">✓</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      }
      panel={
        <div className="flex min-h-full flex-col gap-5 p-6">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{formatEstimate(est.seconds)}</span>
            <span className={cn("rounded-full px-2.5 py-1", sentToPlants ? "bg-amber/10 text-amber" : "bg-surface-2")}>
              {sentToPlants} item{sentToPlants === 1 ? "" : "s"} sent to plants
            </span>
          </div>

          <section aria-label="Site" className="rounded-lg border border-line bg-surface/60 p-4">
            {site ? (
              <>
                <div className="mx-auto w-full max-w-[300px]">
                  <SiteVisual type={site.type} phase="building" muted={connect.siteStatus[site.id] !== "connected"} meters={connect.validated[site.id] ?? []} profile={nodes} documents={!!dataPoints.find((d) => d.scope.siteId === site.id && d.source === "vault")} title={`${site.name}`} />
                </div>
                <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted">
                  {Icon && <Icon size={14} />} {site.name} · {entity?.name ?? site.city}
                </div>
                {mapsConfigured() && (
                  <div className="mt-3 h-40 w-full overflow-hidden rounded-lg">
                    <GoogleSiteMap key={site.id} sites={[site]} focusId={site.id} theme={state.prefs.theme} followArrivals={false} compact />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <Check size={28} className="mx-auto text-accent" />
                <p className="mt-3 text-lg font-medium">Every site is understood.</p>
              </div>
            )}
          </section>

          {site && (
            <div>
              <Eyebrow>
                {site.name} · {site.type}
              </Eyebrow>
              {known.length > 0 && (
                <div className="mt-2">
                  <button type="button" onClick={() => setShowKnown((v) => !v)} aria-expanded={showKnown} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg">
                    <Check size={12} className="text-accent" /> {known.length} things already known from your sources
                    <ChevronDown size={12} className={cn("transition-transform", showKnown && "rotate-180")} />
                  </button>
                  {showKnown && (
                    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Already known">
                      {known.map((k) => (
                        <KnownBadge key={k.label} label={k.label} dp={k.dp} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              <PeopleStrip siteId={site.id} siteName={site.name} />
            </div>
          )}

        </div>
      }
    />
  )
}
