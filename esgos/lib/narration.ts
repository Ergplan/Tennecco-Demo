"use client"

// Narration-gated pacing: the agent says one line, and the pipeline waits for
// it to be "spoken" before moving on. In calm pace (default) the demo never
// runs ahead of the voice; brisk pace halves the waits for rehearsals.

import { useStore } from "./store"
import { splitWords, wordTimings } from "./voice"

export function speechMs(text: string) {
  return wordTimings(splitWords(text)).reduce((a, b) => a + b, 0) + 450
}

let token = 0
let scale = 1

// Tests set this to 0 so narration does not wait.
export function setNarrationScale(f: number) {
  scale = f
}

// Cancels any narration in progress (used when a scene unmounts).
export function cancelNarration() {
  token++
}

export async function narrate(text: string, kind: "agent" | "reply" = "agent"): Promise<boolean> {
  const mine = ++token
  const s = useStore.getState()
  s.say(text, kind)
  const pace = s.prefs.pace ?? "calm"
  const ms = (pace === "calm" ? speechMs(text) : speechMs(text) * 0.4) * scale
  await new Promise((r) => setTimeout(r, ms))
  return mine === token
}

export function paceFactor() {
  return (useStore.getState().prefs.pace ?? "calm") === "calm" ? 2 : 1
}
