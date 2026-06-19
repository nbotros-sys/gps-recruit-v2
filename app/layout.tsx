import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

// next/font downloads Inter at build time and serves it from Vercel
// — zero external font request at runtime, no layout shift
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "GPS Recruitment Platform",
  description: "Internal Recruitment Management System",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Preconnect to Supabase so the first API call is faster */}
        <link rel="preconnect" href="https://jysnwqsldzbbhyjgchvd.supabase.co" />
        <link rel="dns-prefetch" href="https://jysnwqsldzbbhyjgchvd.supabase.co" />
      </head>
      <body className={inter.className}>
        <div className="page-fade">
          {children}
        </div>
      </body>
    </html>
  )
}
