"use client"

// Chooses the live Google map when a Maps key is configured, otherwise the
// built-in India outline (works offline).

import { useState } from "react"
import { mapsConfigured } from "@/esgos/providers/maps"
import { useStore } from "@/esgos/lib/store"
import type { Site, SiteType } from "@/esgos/lib/types"
import { IndiaMap } from "../Seed/IndiaMap"
import { GoogleSiteMap } from "./GoogleSiteMap"

export function SiteMap(props: { sites: Site[]; focusId?: string | null; filter?: SiteType | null; onSelect?: (id: string) => void; scanning?: boolean; followArrivals?: boolean }) {
  const theme = useStore((s) => s.prefs.theme)
  const [fallback, setFallback] = useState(!mapsConfigured())
  if (fallback) return <IndiaMap sites={props.sites} filter={props.filter} focusId={props.focusId} onSelect={props.onSelect} scanning={props.scanning} />
  return <GoogleSiteMap {...props} theme={theme} onUnavailable={() => setFallback(true)} />
}
