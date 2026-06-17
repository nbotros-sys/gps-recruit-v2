"use client"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Briefcase, Users, Building2,
  Zap, Bell, ChevronRight, Menu
} from "lucide-react"

const nav = [
  { href: "/internal/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/internal/mandates", icon: Briefcase, label: "Mandates" },
  { href: "/internal/candidates", icon: Users, label: "Candidates" },
  { href: "/internal/clients", icon: Building2, label: "Clients" },
  { href: "/internal/sourcing", icon: Zap, label: "AI Sourcing" },
]

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-16" : "w-64"} flex-shrink-0 flex flex-col transition-all duration-200 relative`}
        style={{ background: "linear-gradient(175deg, #024a56 0%, #028090 35%, #3D5A4E 100%)" }}
      >
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />

        {/* Logo area */}
        <div className={`relative flex items-center ${collapsed ? "justify-center px-2 py-4" : "px-5 py-5"} border-b border-white/10`}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex-shrink-0 relative">
                <Image src="/gps-logo.png" alt="GPS" fill className="object-contain drop-shadow-sm" />
              </div>
              <div>
                <div className="text-white font-bold text-base leading-tight tracking-wide">GPS</div>
                <div className="text-white/50 text-xs font-medium tracking-wider uppercase">Recruitment</div>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 relative">
              <Image src="/gps-logo.png" alt="GPS" fill className="object-contain" />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="relative flex-1 py-4 px-2 space-y-0.5">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${active
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/8"
                  }
                  ${collapsed ? "justify-center px-2" : ""}
                `}
              >
                <Icon size={17} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
                {!collapsed && active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-light" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Collapse button */}
        <div className="relative p-2 border-t border-white/10">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/8 transition-all w-full text-xs
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <ChevronRight size={15} className={`transition-transform duration-200 ${collapsed ? "rotate-0" : "rotate-180"}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          <div className="text-sm text-gray-400 font-medium">
            {nav.find(n => pathname.startsWith(n.href))?.label || ""}
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-teal transition-colors rounded-lg hover:bg-gray-50">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #028090, #3D5A4E)" }}>
                G
              </div>
              <span className="text-sm text-gray-600 font-medium">GPS Team</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
