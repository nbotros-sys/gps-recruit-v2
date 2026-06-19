"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Briefcase, Users, TrendingUp, Building2, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase"

export default function Dashboard() {
  const [stats, setStats] = useState({ mandates: 0, candidates: 0, placements: 0, clients: 0 })
  const [pipeline, setPipeline] = useState<Record<string, number>>({})
  const [recentMandates, setRecentMandates] = useState<any[]>([])
  const [recentCandidates, setRecentCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [
        { count: mc }, { count: cc }, { count: pc }, { count: lc },
        { data: pd }, { data: mandates }, { data: candidates }
      ] = await Promise.all([
        supabase.from("mandates").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("candidates").select("*", { count: "exact", head: true }),
        supabase.from("applications").select("*", { count: "exact", head: true }).eq("stage", "placed"),
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("applications").select("stage"),
        supabase.from("mandates").select("id, title, client_name, status").order("created_at", { ascending: false }).limit(5),
        supabase.from("candidates").select("id, name, current_title, current_company, source").order("created_at", { ascending: false }).limit(6),
      ])
      setStats({ mandates: mc || 0, candidates: cc || 0, placements: pc || 0, clients: lc || 0 })
      const mc = { count: (mdRaw || []).length }
      const cc = { count: (cdRaw || []).length }
      const pc = { count: (pdRaw2 || []).length }
      const lc = { count: (clRaw || []).length }
      const counts: Record<string, number> = {}
      for (const a of pd || []) counts[a.stage] = (counts[a.stage] || 0) + 1
      setPipeline(counts)
      setRecentMandates(mandates || [])
      setRecentCandidates(candidates || [])
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: "Active Mandates", value: stats.mandates, icon: Briefcase, color: "bg-teal/10 text-teal", href: "/internal/mandates" },
    { label: "Total Candidates", value: stats.candidates, icon: Users, color: "bg-forest/10 text-forest", href: "/internal/candidates" },
    { label: "Placements", value: stats.placements, icon: TrendingUp, color: "bg-purple-100 text-purple-600", href: "/internal/candidates" },
    { label: "Active Clients", value: stats.clients, icon: Building2, color: "bg-amber-100 text-amber-600", href: "/internal/clients" },
  ]
  const stages = ["new", "screening", "interview", "shortlisted", "offered", "placed"]
  const stageColors: Record<string, string> = {
    new: "bg-gray-100 text-gray-600", screening: "bg-blue-100 text-blue-700",
    interview: "bg-purple-100 text-purple-700", shortlisted: "bg-teal/10 text-teal",
    offered: "bg-amber-100 text-amber-700", placed: "bg-green-100 text-green-700",
  }
  const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-100 text-green-700", on_hold: "bg-amber-100 text-amber-700",
    closed: "bg-gray-100 text-gray-500", filled: "bg-blue-100 text-blue-700",
  }
  const total = Object.values(pipeline).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">GPS Recruitment — live overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/internal/mandates" className="btn-primary text-sm">+ New Mandate</Link>
          <Link href="/internal/candidates" className="btn-secondary text-sm">+ Add Candidate</Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="card flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}><Icon size={20} /></div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{loading ? "—" : value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Pipeline Overview</h2>
          <span className="text-xs text-gray-400">{total} candidates in pipeline</span>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {stages.map(stage => {
            const count = pipeline[stage] || 0
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={stage} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{loading ? "—" : count}</div>
                <span className={`badge ${stageColors[stage]} capitalize mt-1 text-xs`}>{stage}</span>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Mandates</h2>
            <Link href="/internal/mandates" className="text-teal text-xs flex items-center gap-1 hover:underline">View all <ArrowRight size={12} /></Link>
          </div>
          {recentMandates.length === 0 ? (
            <div className="text-center py-8"><p className="text-gray-400 text-sm">No mandates yet</p></div>
          ) : (
            <div className="space-y-1">
              {recentMandates.map(m => (
                <Link key={m.id} href={`/internal/mandates/${m.id}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase size={13} className="text-teal" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-teal truncate transition-colors">{m.title}</div>
                      {m.client_name && <div className="text-xs text-gray-400">{m.client_name}</div>}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_COLORS[m.status] || "bg-gray-100"} text-xs flex-shrink-0 ml-2`}>{m.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Candidates</h2>
            <Link href="/internal/candidates" className="text-teal text-xs flex items-center gap-1 hover:underline">View all <ArrowRight size={12} /></Link>
          </div>
          {recentCandidates.length === 0 ? (
            <div className="text-center py-8"><p className="text-gray-400 text-sm">No candidates yet</p></div>
          ) : (
            <div className="space-y-1">
              {recentCandidates.map(c => (
                <Link key={c.id} href={`/internal/candidates/${c.id}`}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: "#028090" }}>
                    {c.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 group-hover:text-teal truncate transition-colors">{c.name}</div>
                    {c.current_title && <div className="text-xs text-gray-400 truncate">{c.current_title}{c.current_company ? ` @ ${c.current_company}` : ""}</div>}
                  </div>
                  <span className="text-xs text-gray-300 flex-shrink-0">{c.source}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
