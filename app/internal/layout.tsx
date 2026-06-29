"use client"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Briefcase, Users, Building2, Zap, Bell, ChevronRight, Search, Database, GitMerge, Settings, LogOut, Activity } from "lucide-react"
import { createClient } from "@/lib/supabase"

const nav = [
  { href: "/internal/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/internal/mandates", icon: Briefcase, label: "Mandates" },
  { href: "/internal/candidates", icon: Users, label: "Candidates" },
  { href: "/internal/database", icon: Database, label: "Import CVs" },
  { href: "/internal/candidates/duplicates", icon: GitMerge, label: "Duplicates" },
  { href: "/internal/search", icon: Search, label: "AI Search" },
  { href: "/internal/clients", icon: Building2, label: "Clients" },
  { href: "/internal/sourcing", icon: Zap, label: "AI Sourcing" },
  { href: "/internal/activity", icon: Activity, label: "Activity" },
  { href: "/internal/settings", icon: Settings, label: "Settings" },
]

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingTaskCount, setPendingTaskCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [nr, tr] = await Promise.all([
          fetch("/api/notifications"),
          fetch("/api/tasks"),
        ])
        const nd = await nr.json()
        const td = await tr.json()
        setUnreadCount((nd.notifications || []).filter((n: any) => !n.read).length)
        setPendingTaskCount((td.tasks || []).filter((t: any) => !t.done).length)
      } catch {}
    }
    fetchCounts()
    const interval = setInterval(fetchCounts, 60000)
    return () => clearInterval(interval)
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push("/internal/login")
  }

  // Login page gets a completely clean full-screen render — no sidebar, no header
  if (pathname === "/internal/login") {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <aside className={`${collapsed ? "w-16" : "w-60"} flex-shrink-0 flex flex-col transition-all duration-200`}
        style={{ background: "#0d2b30" }}>
        <div className={`flex items-center ${collapsed ? "justify-center py-4 px-2" : "px-5 py-4"} border-b border-white/5`}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 flex-shrink-0">
                <Image src="/gps-logo.png" alt="GPS" fill sizes="40px" className="object-contain" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm tracking-wide">GPS</div>
                <div className="text-white/35 text-[10px] tracking-widest uppercase font-medium">Recruitment</div>
              </div>
            </div>
          ) : (
            <div className="relative w-9 h-9">
              <Image src="/gps-logo.png" alt="GPS" fill sizes="36px" className="object-contain" />
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
                  ${collapsed ? "justify-center" : ""}
                  ${active ? "bg-white/10 text-white font-medium" : "text-white/45 hover:text-white/80 hover:bg-white/5"}`}>
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-2 border-t border-white/5">
          <button onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/5 transition-all w-full text-xs ${collapsed ? "justify-center" : ""}`}>
            <ChevronRight size={14} className={`transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
          <p className="text-sm font-medium text-gray-400">
            {nav.find(n => pathname.startsWith(n.href))?.label}
          </p>
          <div className="flex items-center gap-3">
            <Link href="/internal/activity" className="relative p-2 text-gray-400 hover:text-teal rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
              <Bell size={17} />
              {(unreadCount + pendingTaskCount) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount + pendingTaskCount}
                </span>
              )}
            </Link>
            <div className="w-px h-4 bg-gray-200" />
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ background: "#028090" }}>
                G
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
