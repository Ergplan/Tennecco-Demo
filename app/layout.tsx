import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "jouleWise × Tenneco India — Electricity, Heat and ESG",
  description:
    "Interactive demo prepared by jouleWise for Tenneco India: group footprint, site ESG data, a path to 100% green power at the Bengaluru plant, process heat pumps and one ESG platform for every entity.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#001d34",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" data-theme="light">
      <body>{children}</body>
    </html>
  )
}
