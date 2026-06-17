"use client"
import { useEffect, useState } from "react"
import { MapPin, ArrowRight, Briefcase, Sparkles, Users, Shield } from "lucide-react"
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
        .select("id, title, client_name, location, job_description, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
      setMandates(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      {/* Hero — dark, full width */}
      <section style={{ background: "linear-gradient(135deg, #0a1f24 0%, #0d2b30 50%, #1a3d35 100%)" }}
        className="relative overflow-hidden">
        {/* Subtle hexagon pattern in background */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L55 20 L55 40 L30 55 L5 40 L5 20 Z' fill='none' stroke='%23028090' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px"
        }} />

        <div className="relative max-w-6xl mx-auto px-8 py-28">
          <div className="max-w-3xl">
            {/* GPS logo large in hero */}
            <div className="flex items-center gap-4 mb-10">
              <img src="/gps-logo.png" alt="GPS" className="w-16 h-16 object-contain" />
              <div className="h-12 w-px bg-white/20" />
              <div>
                <div className="text-white/60 text-sm font-medium tracking-widest uppercase">GPS Talent Network</div>
                <div className="text-white/40 text-xs mt-0.5">Egypt · MENA Region</div>
              </div>
            </div>

            <h1 className="text-6xl font-bold text-white leading-[1.1] mb-6">
              The right role.<br />
              <span style={{ color: "#A8D5D1" }}>Not just any role.</span>
            </h1>
            <p className="text-white/60 text-xl leading-relaxed mb-10 max-w-xl">
              GPS connects professionals across Egypt with opportunities that genuinely match their skills and ambitions. AI-matched. Personally reviewed. Confidential.
            </p>
            <div className="flex items-center gap-4">
              <a href="#roles"
                className="px-8 py-4 rounded-xl font-semibold text-white transition-all text-base"
                style={{ background: "#028090" }}>
                See open roles
              </a>
              <a href="/join"
                className="px-8 py-4 rounded-xl font-semibold transition-all text-base border"
                style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.05)" }}>
                Join the network →
              </a>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16"
          style={{ background: "linear-gradient(to bottom, transparent, #F4F8F7)" }} />
      </section>

      {/* Three pillars */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <div className="grid grid-cols-3 gap-6">
          {[
            {
              icon: Sparkles,
              title: "AI-matched intelligence",
              desc: "Our AI reads every CV deeply — not just keywords. It understands what you actually do and finds roles where you'd genuinely thrive."
            },
            {
              icon: Users,
              title: "Personally reviewed",
              desc: "Every profile is reviewed by our team before we reach out. You'll only hear from us when there's a real reason to talk."
            },
            {
              icon: Shield,
              title: "Completely confidential",
              desc: "Your information is never shared without your explicit consent. Discretion is at the core of how GPS operates."
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "#028090" }}>
                <Icon size={18} className="text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles section */}
      <section id="roles" className="max-w-6xl mx-auto px-8 pb-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Open roles</h2>
            <p className="text-gray-500 mt-1">Active mandates — all reviewed by GPS consultants</p>
          </div>
          <span className="text-sm text-gray-400">{loading ? "..." : mandates.length} active</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading roles...</div>
        ) : mandates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 text-center py-20 shadow-sm">
            <Briefcase size={36} className="mx-auto mb-4 text-gray-200" />
            <p className="text-gray-500 font-medium mb-2">No active roles right now</p>
            <p className="text-gray-400 text-sm mb-8">Join our network and we'll reach out when something fits.</p>
            <a href="/join"
              className="px-8 py-3 rounded-xl font-semibold text-white text-sm"
              style={{ background: "#028090" }}>
              Join GPS Talent Network
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {mandates.map((m, i) => (
              <Link key={m.id} href={`/jobs/${m.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between p-5 hover:shadow-md hover:border-teal/20 transition-all group cursor-pointer block">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
                    style={{ background: "linear-gradient(135deg, #028090, #3D5A4E)" }}>
                    {(i + 1).toString().padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 group-hover:text-teal transition-colors text-base">{m.title}</div>
                    <div className="text-sm text-gray-400 flex items-center gap-3 mt-0.5">
                      {m.location && <span className="flex items-center gap-1"><MapPin size={12} />{m.location}</span>}
                      <span className="text-gray-200">·</span>
                      <span>GPS — Your Trusted HR Partner</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs px-3 py-1 rounded-full font-medium"
                    style={{ background: "#e6f5f3", color: "#028090" }}>
                    Active
                  </span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:translate-x-1"
                    style={{ background: "#028090" }}>
                    <ArrowRight size={14} className="text-white" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Talent network CTA banner */}
      <section className="max-w-6xl mx-auto px-8 pb-24">
        <div className="rounded-3xl overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #028090 0%, #3D5A4E 100%)" }}>
          {/* Hex pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L55 20 L55 40 L30 55 L5 40 L5 20 Z' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px"
          }} />
          <div className="relative flex items-center justify-between px-12 py-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <img src="/gps-logo.png" alt="GPS" className="w-8 h-8 object-contain" />
                <span className="text-white/80 text-sm font-medium tracking-wide">GPS Talent Network</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Don't see the right role?</h3>
              <p className="text-white/70 max-w-lg">
                Join our talent network. GPS works on new mandates every week and always reaches out to our network first — before posting publicly.
              </p>
            </div>
            <a href="/join"
              className="flex-shrink-0 px-8 py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: "white", color: "#028090" }}>
              Join GPS Talent →
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
