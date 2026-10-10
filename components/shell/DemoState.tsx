"use client"

import { createContext, useContext, useMemo, useState } from "react"
import { DEFAULT_ASSUMPTIONS, type PowerAssumptions, type RouteId } from "@/lib/power"

// What the Bengaluru power page decides carries into the heat page: the heat pump runs on
// the plant's blended tariff and green share.
type DemoState = {
  route: RouteId
  setRoute: (r: RouteId) => void
  target: number
  setTarget: (t: number) => void
  assumptions: PowerAssumptions
  setAssumptions: (a: PowerAssumptions) => void
}

const Ctx = createContext<DemoState | null>(null)

export function DemoStateProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<RouteId>("joulewise")
  const [target, setTarget] = useState(0.8333)
  const [assumptions, setAssumptions] = useState<PowerAssumptions>(DEFAULT_ASSUMPTIONS)
  const value = useMemo(() => ({ route, setRoute, target, setTarget, assumptions, setAssumptions }), [route, target, assumptions])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useDemo() {
  const c = useContext(Ctx)
  if (!c) throw new Error("useDemo outside provider")
  return c
}
