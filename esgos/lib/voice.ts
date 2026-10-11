// VoiceAgent: browser speech synthesis with simulated word timing.
// Captions are always visible; speech is optional and muted by default.
// Word timing is simulated from sentence length so illumination works with
// or without audio, and identically in every browser.

export interface VoiceAgent {
  readonly supported: boolean
  speak(text: string, opts: { muted: boolean; onWord: (index: number) => void; onEnd: () => void }): void
  stop(): void
}

export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

// Milliseconds each word is "spoken" for: ~170 wpm base, longer words and
// punctuation pauses take more time.
export function wordTimings(words: string[]): number[] {
  return words.map((w) => {
    const base = 210 + Math.min(w.length, 12) * 22
    const pause = /[.!?…]$/.test(w) ? 260 : /[,;:—]$/.test(w) ? 140 : 0
    return base + pause
  })
}

class BrowserVoice implements VoiceAgent {
  private timers: ReturnType<typeof setTimeout>[] = []
  private token = 0
  private finish: (() => void) | null = null

  get supported() {
    return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined"
  }

  stop() {
    this.token++
    this.timers.forEach(clearTimeout)
    this.timers = []
    // A line interrupted by another finishes its captions instantly.
    const finish = this.finish
    this.finish = null
    finish?.()
    try {
      if (this.supported) window.speechSynthesis.cancel()
    } catch {
      // Speech errors never interrupt the demo.
    }
  }

  speak(text: string, opts: { muted: boolean; onWord: (index: number) => void; onEnd: () => void }) {
    this.stop()
    const token = this.token
    this.finish = opts.onEnd
    const words = splitWords(text)
    const timings = wordTimings(words)
    const run = () => {
      if (token !== this.token) return
      let t = 0
      words.forEach((_, i) => {
        this.timers.push(setTimeout(() => token === this.token && opts.onWord(i), t))
        t += timings[i]
      })
      this.timers.push(
        setTimeout(() => {
          if (token !== this.token) return
          this.finish = null
          opts.onEnd()
        }, t),
      )
    }
    if (opts.muted || !this.supported) {
      run()
      return
    }
    try {
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 1.02
      u.pitch = 1
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find((v) => /en-IN/i.test(v.lang)) ?? voices.find((v) => /en-GB|en-US/i.test(v.lang))
      if (preferred) u.voice = preferred
      let started = false
      u.onstart = () => {
        if (started) return
        started = true
        run()
      }
      // Some browsers never fire onstart; fall back so captions still illuminate.
      this.timers.push(
        setTimeout(() => {
          if (!started) {
            started = true
            run()
          }
        }, 450),
      )
      window.speechSynthesis.speak(u)
    } catch {
      run()
    }
  }
}

export const voice: VoiceAgent = new BrowserVoice()
