// Runtime mode flags read from the URL: ?demo=true, ?seed=paste, ?reset=true, ?client=<id>, ?pace=, ?theme=day|night.
// Demo mode makes timing deterministic and keeps speech muted by default.

export type SeedMode = "default" | "paste"

export type RuntimeMode = {
  demo: boolean
  seedMode: SeedMode
  reset: boolean
  client: string | null
  pace: "calm" | "brisk" | null
  theme: "dark" | "light" | null
}

let current: RuntimeMode = { demo: false, seedMode: "default", reset: false, client: null, pace: null, theme: null }

export function readModeFromUrl(): RuntimeMode {
  if (typeof window === "undefined") return current
  const params = new URLSearchParams(window.location.search)
  current = {
    demo: params.get("demo") === "true",
    seedMode: params.get("seed") === "paste" ? "paste" : "default",
    reset: params.get("reset") === "true",
    client: params.get("client"),
    pace: params.get("pace") === "brisk" ? "brisk" : params.get("pace") === "calm" ? "calm" : null,
    theme: ["day", "light"].includes(params.get("theme") ?? "") ? "light" : ["night", "dark"].includes(params.get("theme") ?? "") ? "dark" : null,
  }
  return current
}

export function getMode(): RuntimeMode {
  return current
}

let speed = 1
export function setPipelineSpeed(factor: number) {
  speed = factor
}

// Deterministic delay used by mock providers to emit pipeline events.
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.round(ms * speed)))
}

export function stableHash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
