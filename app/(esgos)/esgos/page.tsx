"use client"

import dynamic from "next/dynamic"

// esgOS is fully client-side (its state lives in localStorage), so skip SSR.
const App = dynamic(() => import("@/esgos/components/App"), {
  ssr: false,
  loading: () => <div className="h-dvh bg-bg" />,
})

export default function Page() {
  return <App />
}
