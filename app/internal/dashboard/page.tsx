"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Briefcase, Users, Building2, TrendingUp, ArrowRight, Clock, CheckCircle, AlertCircle } from "lucide-react"

const stats = [
  { label: "Active Mandates", value: "0", icon: Briefcase, color: "bg-teal/10 text-teal" },
  { label: "Total Candidates", value: "0", icon: Users, color: "bg-forest/10 text-forest" },
  { label: "Placements (MTD)", value: "0", icon: TrendingUp, color: "bg-purple-100 text-purple-600" },
  { label: "Active Clients", value: "0", icon: Building2, color: "bg-amber-100 text-amber-600" },
]

const quickActions = [
  { label: "New Mandate", href: "/internal/mandates", color: "btn-primary" },
  { label: "Add Candidate", href: "/internal/candidates", color: "btn-secondary" },
  { label: "AI Sourcing", href: "/internal/sourcing", color: "btn-secondary" },
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back — here's what's happening today.</p>
        </div>
        <div className="flex gap-2">
          {quickActions.map(a => (
            <Link key={a.href} href={a.href} className={a.color}>{a.label}</Link>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Active Mandates */}
        <div className="col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Active Mandates</h2>
            <Link href="/internal/mandates" className="text-teal text-sm flex items-center gap-1 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="text-center py-10 text-gray-400">
            <Briefcase size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No mandates yet.</p>
            <Link href="/internal/mandates" className="btn-primary mt-3 inline-block">Create your first mandate</Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-center py-10 text-gray-400">
            <Clock size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No activity yet.</p>
          </div>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Pipeline Overview</h2>
        <div className="grid grid-cols-6 gap-3">
          {["New", "Screening", "Interview", "Shortlisted", "Offered", "Placed"].map((stage, i) => (
            <div key={stage} className="text-center">
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-xs text-gray-500 mt-1">{stage}</div>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-teal" style={{ width: "0%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
