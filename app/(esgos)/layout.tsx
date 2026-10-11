import type { Metadata, Viewport } from "next"
import "./globals.css"

// esgOS runs as its own app under /esgos, with its own stylesheet, so its theme never
// mixes with the Tenneco walkthrough's. The walkthrough embeds it on the esgOS step.
export const metadata: Metadata = {
  title: "esgOS · Tenneco India",
  description: "esgOS, the AI-first ESG operating system, on Tenneco Clean Air India's public disclosures.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f5f8",
}

export default function EsgosLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" data-theme="light" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
