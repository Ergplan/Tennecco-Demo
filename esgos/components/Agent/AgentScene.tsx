"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Check, FileText, Landmark, RotateCcw, ShieldCheck, Factory, ShieldAlert, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import { useStore } from "@/esgos/lib/store"
import { goTo } from "@/esgos/lib/navigation"
import { STAGES, STAGE_LABELS, type Stage } from "@/esgos/lib/types"
import { CLIENTS, availableClients, getClient, type ClientId } from "@/esgos/lib/clients"
import { cancelNarration, narrate } from "@/esgos/lib/narration"
import { AgentLine } from "../common/AgentLine"
import { OrgForm } from "./OrgForm"
import { STAGE_HUE, STAGE_ICON, SECTOR_ICON, tint } from "../common/icons"
import { firstName, roleForOwner } from "@/esgos/lib/org"
import type { Stakeholder } from "@/esgos/lib/types"
import { Button, Eyebrow } from "../common/ui"
import { cn } from "../common/cn"

type JourneyStep = {
  stage: Stage
  title: string
  does: string
  needs: string
  who: string
  minutes: number
  narration: string
}

// Before listing there is no filed BRSR: the footprint comes from public records
// and the client's own files, and every gap is ranked against the listing.
function preIpoSteps(): JourneyStep[] {
  return [
    {
      stage: "seed",
      title: "Footprint",
      does: "Maps every plant named in pollution-board, rating-agency and GST records and in your energy file, then finds each on Google Maps.",
      needs: "Confirm the plants I flag; import the full site list for the rest.",
      who: "ESG lead",
      minutes: 3,
      narration: "Step one, your footprint. With no BRSR filed yet, I map plants from public records and the energy file you shared. Your ESG lead confirms the few I flag.",
    },
    {
      stage: "boundary",
      title: "Boundary",
      does: "Lays out the listing entity and its group companies, and places each plant under its owner.",
      needs: "Decide the first BRSR's boundary: the listing entity alone, or consolidated.",
      who: "Company secretary · CFO",
      minutes: 2,
      narration: "Step two, the reporting boundary. I lay out the listing entity and its group companies. Your company secretary decides what the first BRSR covers.",
    },
    {
      stage: "connect",
      title: "Data layer",
      does: "Reads your energy file plant by plant, flags estimated months, and links HR, ERP, EHS and documents.",
      needs: "Upload the exports from the templates; replace estimates with bills.",
      who: "Energy manager · IT / ERP owner",
      minutes: 3,
      narration: "Step three, the data layer. I read your energy file plant by plant and flag every estimated month. Your energy manager and ERP owner fill the rest.",
    },
    {
      stage: "profile",
      title: "Site profiles",
      does: "Asks only what no source can answer — a few questions per plant.",
      needs: "Answer, or forward a question to the colleague who knows.",
      who: "Plant heads · EHS · HR",
      minutes: 6,
      narration: "Step four, site profiles. I ask only what no source can answer. Plant heads answer, or pass a question to the right colleague.",
    },
    {
      stage: "gaps",
      title: "IPO readiness",
      does: "Checks every BRSR question, BRSR Core and the ISSB S1 and S2 requirements, and ranks each gap against the listing.",
      needs: "Review what must be ready before listing and what can follow.",
      who: "ESG lead · CFO",
      minutes: 2,
      narration: "Step five, readiness. I check every BRSR question and the ISSB requirements, and rank each gap by what the listing needs.",
    },
    {
      stage: "plan",
      title: "Roadmap",
      does: "Puts every gap on a milestone roadmap with effort, dependencies and an owner, benchmarked against a listed peer.",
      needs: "Approve the roadmap; owners receive their tasks.",
      who: "CFO · IPO steering committee",
      minutes: 2,
      narration: "Step six, the roadmap. Every gap gets an owner, a milestone and an effort estimate. Your CFO approves it.",
    },
  ]
}

function journeySteps(publicData: boolean, preIpo = false): JourneyStep[] {
  if (preIpo) return preIpoSteps()
  return [
    {
      stage: "seed",
      title: "Footprint",
      does: publicData ? `Maps every plant and office named in your filed BRSR${getClient().publicGst.length ? ", company filings and public GST records" : " and company filings"}, then finds each on Google Maps.` : "Maps every plant and office from ergOS, GST registrations and any list you paste.",
      needs: publicData ? "Confirm the sites I flag; import the full site list for the rest." : "Confirm the two or three sites I flag.",
      who: "ESG lead",
      minutes: 3,
      narration: publicData
        ? "Step one, your footprint. I map every plant and office from what you've already filed. Your ESG lead confirms the few I flag."
        : "Step one, your footprint. I map every plant and office from sources you already have. Your ESG lead confirms the few I flag.",
    },
    {
      stage: "boundary",
      title: "Boundary",
      does: publicData ? "Lays out the group companies listed in your filed BRSR and places each site under its owner." : "Builds the group from MCA records and places each site under its legal entity.",
      needs: publicData ? "Keep the standalone basis or consolidate; settle sites the filings disagree on." : "Confirm the reporting entity and how subsidiaries and joint ventures are treated.",
      who: "Company secretary",
      minutes: 2,
      narration: publicData
        ? "Step two, the reporting boundary. I lay out the group companies from your filed BRSR. Your company secretary confirms standalone or consolidated."
        : "Step two, the reporting boundary. I build the group from registry records. Your company secretary confirms which entities are in.",
    },
    {
      stage: "connect",
      title: "Energy layer",
      does: publicData ? "Your filing has company totals only. Plant data comes from ergOS meters or your HR, ERP and EHS exports." : "Activates ergOS meters plant by plant and links HR, ERP, EHS and documents read-only.",
      needs: publicData ? "Connect read-only, or import exports from the templates." : "Approve read-only connections; confirm each plant's meter feed.",
      who: "Energy manager · IT / ERP owner",
      minutes: 3,
      narration: publicData
        ? "Step three, the data layer. Your filing has company totals only, so plant data comes from meters or system exports. Your energy manager and ERP owner provide them."
        : "Step three, the energy layer. I connect meters and systems, read-only. Your energy manager and ERP owner approve the links.",
    },
    {
      stage: "profile",
      title: "Site profiles",
      does: "Asks only what no source can answer — a few questions per site.",
      needs: "Answer, or forward a question to the colleague who knows.",
      who: "Plant heads · EHS · HR",
      minutes: 6,
      narration: "Step four, site profiles. I ask only what no source can answer. Plant heads answer, or pass a question to the right colleague.",
    },
    {
      stage: "gaps",
      title: "Coverage",
      does: "Checks every BRSR and BRSR Core indicator against your sources.",
      needs: "Review what is producible now and what is open.",
      who: "ESG lead",
      minutes: 1,
      narration: "Step five, coverage. I check every BRSR indicator against your sources and show exactly what's producible now.",
    },
    {
      stage: "plan",
      title: "Plan",
      does: "Builds the collection plan and a draft Principle 6 table with provenance.",
      needs: "Approve the plan; owners receive their tasks.",
      who: "CFO · ESG committee",
      minutes: 1,
      narration: "Step six, the plan. Every open item goes to a named owner. Your CFO approves it.",
    },
  ]
}

// "Company secretary · CFO" → the named people for those roles, where the gate recorded them.
function namedOwners(who: string, people: Stakeholder[]) {
  return who
    .split("·")
    .map((w) => w.trim())
    .map((w) => {
      const role = roleForOwner(w)
      const p = role ? people.find((x) => !x.siteId && x.role === role && !x.vacant) : undefined
      return p ? `${w} (${p.name})` : w
    })
    .join(" · ")
}

function StepCard({ step, index, state, onClick, people }: { step: JourneyStep; index: number; state: "active" | "done" | "idle" | "current"; onClick?: () => void; people: Stakeholder[] }) {
  const Icon = STAGE_ICON[step.stage]
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.5 }}
      className={cn(
        "flex h-full flex-col rounded-lg border p-4 text-left transition-colors",
        state === "active" ? "border-fg bg-surface-2" : state === "current" ? "border-fg/60 bg-surface" : state === "done" ? "border-line bg-surface/40" : "border-line bg-transparent hover:bg-surface/60",
      )}
      aria-current={state === "active" || state === "current" ? "step" : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ color: STAGE_HUE[step.stage], backgroundColor: tint(STAGE_HUE[step.stage], state === "active" || state === "current" ? 22 : 12) }}>
            <Icon size={15} />
          </span>
          <span className="font-mono text-[11px] text-faint">0{index + 1}</span>
        </span>
        {state === "done" ? <Check size={14} className="text-accent" /> : <span className="font-mono text-[11px] text-faint">~{step.minutes} min</span>}
      </div>
      <div className="mt-3 text-lg font-medium tracking-tight">{step.title}</div>
      <p className="mt-1 text-[13px] leading-snug text-muted">{step.does}</p>
      <div className="mt-auto pt-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">From you</div>
        <p className="mt-1 text-[13px] leading-snug">{step.needs}</p>
        <p className="mt-1 text-xs text-muted">{namedOwners(step.who, people)}</p>
      </div>
    </motion.button>
  )
}

export function AgentScene() {
  const say = useStore((s) => s.say)
  const maxStage = useStore((s) => s.maxStage)
  const journeyIntroDone = useStore((s) => s.journeyIntroDone)
  const setJourneyIntroDone = useStore((s) => s.setJourneyIntroDone)
  const reset = useStore((s) => s.reset)
  const clientId = useStore((s) => s.clientId)
  const org = useStore((s) => s.orgByClient?.[s.clientId])
  const people = useStore((s) => s.stakeholders)
  const orgOpen = useStore((s) => s.ui.orgOpen)
  const setUi = useStore((s) => s.setUi)
  const client = getClient()
  const SectorIcon = SECTOR_ICON[client.sector]
  const publicData = client.kind === "public"
  const steps = journeySteps(publicData, !!client.preIpo)
  const returning = maxStage !== "agent"
  const [view, setView] = useState<"home" | "gate" | "journey">("home")
  const [afterGate, setAfterGate] = useState<"journey" | "resume">("journey")
  const gate = view === "gate" || (orgOpen && !org)
  const [active, setActive] = useState(-1)
  const [narrated, setNarrated] = useState(false)
  const nextStage = returning ? maxStage : "seed"

  useEffect(() => {
    const hi = org ? `, ${firstName(org.you.name)}` : ""
    if (returning) say(`Welcome back${hi}. ${client.name}'s journey is at ${STAGE_LABELS[maxStage].toLowerCase()}.`)
    else say(`Let's start your ESG journey${hi}.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  // The agent walks through the journey one card at a time, then waits.
  useEffect(() => {
    if (view !== "journey") return
    let alive = true
    ;(async () => {
      await narrate(`Here's the journey for ${client.name}. Six steps, about fifteen minutes.`)
      for (let i = 0; i < steps.length; i++) {
        if (!alive) return
        setActive(i)
        const ok = await narrate(steps[i].narration)
        if (!ok || !alive) return
      }
      if (!alive) return
      setActive(-1)
      setNarrated(true)
      setJourneyIntroDone()
      await narrate("Ready when you are. We start with your footprint.")
    })()
    return () => {
      alive = false
      cancelNarration()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  const start = () => {
    if (org) return setView("journey")
    setAfterGate("journey")
    setView("gate")
    say(`Before we start: who's who at ${client.shortName}?`)
  }

  const resume = () => {
    if (org) return goTo(nextStage)
    setAfterGate("resume")
    setView("gate")
    say(`Before we continue: who's who at ${client.shortName}?`)
  }

  const gateSaved = () => {
    setUi({ orgOpen: false })
    const name = firstName(useStore.getState().orgByClient?.[clientId]?.you.name ?? "")
    if (afterGate === "resume") {
      say(`Thanks, ${name}.`)
      goTo(nextStage)
      return
    }
    say(`Thanks, ${name}. Here's how we'll work.`)
    setView("journey")
  }

  const begin = () => {
    cancelNarration()
    setJourneyIntroDone()
    goTo("seed")
  }

  const switchClient = (id: ClientId) => {
    if (id === clientId) return
    const url = new URL(window.location.href)
    url.searchParams.set("client", id)
    window.history.replaceState(null, "", url.toString())
    reset(undefined, id)
  }

  const stageIdx = (s: Stage) => STAGES.indexOf(s)

  return (
    <div className="relative flex h-full flex-col overflow-y-auto px-6 py-10 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Eyebrow>{client.kind === "public" ? "Client · public disclosures" : "Sample client"}</Eyebrow>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Client">
            {availableClients().map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={c.id === clientId}
                onClick={() => switchClient(c.id)}
                className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs", c.id === clientId ? "border-fg text-fg" : "border-line text-muted hover:text-fg")}
              >
                {(() => {
                  const I = SECTOR_ICON[c.sector]
                  return <I size={12} />
                })()}
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <h1 className="mt-4 flex items-center gap-2 text-[13px] text-muted">
          <SectorIcon size={14} />
          {client.legalName}
          {client.listed ? ` · ${client.listed.exchange}: ${client.listed.symbol}` : ""} · {client.group.fiscalYear}
        </h1>

        <div className="mt-8">
          <AgentLine variant="hero" />
        </div>

        <AnimatePresence mode="wait">
          {gate && (
            <motion.div key="gate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8">
              <div className="mb-5 max-w-2xl">
                <p className="text-sm leading-relaxed text-muted">
                  I&apos;ll address every question, gap and request to a named person, and record your name on each confirmation. About a minute.
                </p>
              </div>
              <OrgForm onSaved={gateSaved} />
            </motion.div>
          )}

          {!gate && view === "home" && !returning && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-10">
              <Button variant="primary" size="lg" onClick={start}>
                Start your ESG journey <ArrowRight size={16} />
              </Button>
              <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
                Ask less. Discover more. Confirm intelligently. esgOS starts from what {client.name} already has — {client.preIpo ? "public records, GST registrations and the files it has shared" : publicData ? (client.publicGst.length ? "its filed BRSR, company filings and public GST records" : "its filed BRSR, prospectus and company filings") : "metered sites, GST registrations and its site list"} — and asks only what no source can answer.
              </p>
              {client.preIpo && (
                <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-4 border-t border-line pt-6 sm:grid-cols-4">
                  <div>
                    <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint"><FileText size={11} /> BRSR</dt>
                    <dd className="mt-1 text-sm">Not filed yet</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint"><Landmark size={11} /> Status</dt>
                    <dd className="mt-1 text-sm">{client.preIpo.plannedListing ?? "Unlisted"}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint"><Factory size={11} /> Revenue</dt>
                    <dd className="mt-1 text-sm">{client.preIpo.revenueCr ? `₹${client.preIpo.revenueCr.value.toLocaleString("en-IN")} cr · ${client.preIpo.revenueCr.fy}` : "Not public"}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint"><ShieldCheck size={11} /> Listed peer</dt>
                    <dd className="mt-1 text-sm">{CLIENTS[client.preIpo.peerId]?.name ?? client.preIpo.peerId}</dd>
                  </div>
                </dl>
              )}
              {publicData && client.lastBrsr && (
                <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-4 border-t border-line pt-6 sm:grid-cols-4">
                  <div>
                    <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint"><FileText size={11} /> Last filed</dt>
                    <dd className="mt-1 text-sm">BRSR {client.lastBrsr.fy}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint"><Landmark size={11} /> Boundary</dt>
                    <dd className="mt-1 text-sm">Standalone</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint"><Factory size={11} /> Footprint filed</dt>
                    <dd className="mt-1 text-sm">
                      {client.lastBrsr.counts?.plants} plants · {client.lastBrsr.counts?.offices} offices
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{client.lastBrsr.assurance?.provider ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />} Assurance</dt>
                    <dd className="mt-1 text-sm">{client.lastBrsr.assurance?.provider ?? "None in the filing"}</dd>
                  </div>
                </dl>
              )}
            </motion.div>
          )}

          {!gate && view === "journey" && (
            <motion.div key="journey" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-10">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {steps.map((s, i) => (
                  <StepCard key={s.stage} step={s} index={i} state={i === active ? "active" : "idle"} onClick={() => setActive(i)} people={people} />
                ))}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button variant="primary" size="lg" onClick={begin}>
                  Begin with your footprint <ArrowRight size={16} />
                </Button>
                {!narrated && (
                  <Button variant="ghost" onClick={begin}>
                    Skip the walkthrough
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {!gate && returning && (
            <motion.div key="back" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {steps.map((s, i) => {
                  const st = stageIdx(s.stage) < stageIdx(maxStage) ? "done" : s.stage === maxStage ? "current" : "idle"
                  return <StepCard key={s.stage} step={s} index={i} state={st} onClick={() => goTo(s.stage)} people={people} />
                })}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button variant="primary" size="lg" onClick={resume}>
                  Resume · {STAGE_LABELS[nextStage]} <ArrowRight size={16} />
                </Button>
                <Button variant="ghost" onClick={() => reset()}>
                  <RotateCcw size={14} /> Start over
                </Button>
                {org && (
                  <Button variant="ghost" onClick={() => setUi({ orgOpen: true })}>
                    <UserRound size={14} /> {org.you.name} · organisation details
                  </Button>
                )}
              </div>
              {!journeyIntroDone && <p className="mt-4 text-xs text-faint">Progress is saved in this browser, so the next run starts where you left off.</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
