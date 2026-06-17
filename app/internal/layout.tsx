"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Briefcase, Users, Building2,
  Zap, Bell, ChevronRight, Menu, X, LogOut
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
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-16" : "w-64"} flex-shrink-0 flex flex-col transition-all duration-200`}
        style={{ background: "linear-gradient(160deg, #028090 0%, #3D5A4E 100%)" }}
      >
        {/* Logo area */}
        <div className={`flex items-center ${collapsed ? "justify-center px-2" : "px-5"} py-5 border-b border-white/10`}>
          {!collapsed && (
            <div>
              <div className="text-white font-bold text-lg leading-tight">GPS</div>
              <div className="text-teal-light text-xs font-medium">Recruitment Platform</div>
            </div>
          )}
          {collapsed && <div className="text-white font-bold text-lg">G</div>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-link ${active ? "active" : "text-white/70 hover:text-white"} ${collapsed ? "justify-center px-2" : ""}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t border-white/10">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`sidebar-link text-white/50 hover:text-white w-full ${collapsed ? "justify-center px-2" : ""}`}
          >
            <ChevronRight size={18} className={`transition-transform ${collapsed ? "rotate-0" : "rotate-180"}`} />
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-teal transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ background: "#028090" }}>
              G
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
