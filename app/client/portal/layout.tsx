import type { ReactNode } from "react"
import { Manrope, IBM_Plex_Mono } from "next/font/google"

// Fonts scoped to this route only — does not affect the rest of the app,
// which continues using Inter via the root layout.
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" })
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], display: "swap", variable: "--font-plex-mono" })

export default function ClientPortalLayout({ children }: { children: ReactNode }) {
  return <div className={`${manrope.variable} ${plexMono.variable}`}>{children}</div>
}
