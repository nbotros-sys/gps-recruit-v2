"use client"
import { useEffect, useState } from "react"
import { MapPin, DollarSign, ArrowRight, Users, Brain, Briefcase } from "lucide-react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function JobsPage() {
  const [mandates, setMandates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("mandates")
        .select("id, title, client_name, location, salary_range, job_description, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
      setMandates(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
      {/* Hero */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-teal/10 text-teal text-xs font-semibold px-4 py-2 rounded-full">
          <Brain size={13} /> AI-Matched Recruitment
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight">
          Find the role that's<br />
          <span style={{ color: "#028090" }}>actually right for you</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          GPS doesn't just post jobs. We match Egypt's best professionals to the right opportunities — using AI to go beyond the CV and find the real fit.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="#roles" className="btn-primary px-8 py-3 text-base">See open roles</a>
          <a href="/join" className="btn-secondary px-8 py-3 text-base">Join talent network</a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { value: "AI-first", label: "Every CV read deeply, not just scanned" },
          { value: "Confidential", label: "Your profile shared only with your consent" },
          { value: "Personal", label: "We reach out when the right role appears" },
        ].map(({ value, label }) => (
          <div key={label} className="card text-center py-6">
            <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Roles */}
      <div id="roles" className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Open roles</h2>
          <span className="text-sm text-gray-400">{mandates.length} active</span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading roles...</div>
        ) : mandates.length === 0 ? (
          <div className="card text-center py-16">
            <Briefcase size={36} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 mb-2">No active roles right now.</p>
            <p className="text-gray-400 text-sm mb-6">Join our talent network and we'll reach out when something fits.</p>
            <a href="/join" className="btn-primary">Join the network</a>
          </div>
        ) : (
          <div className="space-y-3">
            {mandates.map(m => (
              <Link key={m.id} href={`/jobs/${m.id}`}
                className="card flex items-center justify-between hover:shadow-md transition-all group cursor-pointer">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "#028090" }}>
                    <Briefcase size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 group-hover:text-teal transition-colors">{m.title}</div>
                    <div className="text-sm text-gray-400 flex items-center gap-3 mt-0.5">
                      {m.location && <span className="flex items-center gap-1"><MapPin size={12} />{m.location}</span>}
                      <span className="text-gray-300">·</span>
                      <span>GPS — Your Trusted HR Partner</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm text-teal font-medium group-hover:underline flex items-center gap-1">
                    Apply <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Talent pool CTA */}
        <div className="rounded-2xl p-8 text-white mt-8"
          style={{ background: "linear-gradient(135deg, #028090 0%, #3D5A4E 100%)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Don't see a match?</h3>
              <p className="text-white/80 text-sm max-w-md">
                Join our talent network. We work on new mandates every week — and we reach out to people in our network first, before posting publicly.
              </p>
            </div>
            <a href="/join"
              className="flex-shrink-0 bg-white text-teal font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              Join the network →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
