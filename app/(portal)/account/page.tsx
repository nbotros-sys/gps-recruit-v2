"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, CheckCircle, Clock, MessageSquare, Briefcase, LogOut } from "lucide-react"

const CANDIDATE_STAGES: Record<string, { label: string; color: string; desc: string }> = {
  new: { label: "Received", color: "bg-gray-100 text-gray-600", desc: "Your application has been received and is in our queue." },
  screening: { label: "Under Review", color: "bg-blue-100 text-blue-700", desc: "A GPS consultant is reviewing your profile." },
  interview: { label: "Interview", color: "bg-purple-100 text-purple-700", desc: "We'd like to speak with you. Expect a call soon." },
  shortlisted: { label: "Shortlisted", color: "bg-teal/10 text-teal", desc: "You've been shortlisted for this role." },
  offered: { label: "Offer Stage", color: "bg-amber-100 text-amber-700", desc: "An offer is being prepared." },
  placed: { label: "Placed", color: "bg-green-100 text-green-700", desc: "Congratulations — you've been placed!" },
  rejected: { label: "On Hold", color: "bg-gray-100 text-gray-500", desc: "We're keeping your profile on file for future opportunities." },
}

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [candidate, setCandidate] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = "/login"; return }
      setUser(user)

      // Find candidate by email
      const { data: cand } = await supabase
        .from("candidates")
        .select("*")
        .eq("email", user.email)
        .single()

      if (cand) {
        setCandidate(cand)
        const { data: apps } = await supabase
          .from("applications")
          .select("*, mandate:mandates(title, location)")
          .eq("candidate_id", cand.id)
          .order("created_at", { ascending: false })
        setApplications(apps || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = "/jobs"
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <LogOut size={15} /> Sign out
        </button>
      </div>

      {/* Applications */}
      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 space-y-4">
          <Briefcase size={32} className="mx-auto text-gray-200" />
          <p className="text-gray-500 font-medium">No active applications</p>
          <p className="text-gray-400 text-sm">
            {candidate ? "You're in our talent network. We'll reach out when the right role appears." : "Apply to a role or join our talent network."}
          </p>
          <a href="/jobs"
            className="inline-block px-6 py-2.5 rounded-xl font-semibold text-white text-sm"
            style={{ background: "#028090" }}>
            Browse open roles
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => {
            const stage = CANDIDATE_STAGES[app.stage] || CANDIDATE_STAGES.new
            return (
              <div key={app.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{app.mandate?.title}</h3>
                    {app.mandate?.location && <p className="text-sm text-gray-400 mt-0.5">📍 {app.mandate.location}</p>}
                  </div>
                  <span className={`badge ${stage.color} text-xs font-semibold`}>{stage.label}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full mb-3">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${(["new","screening","interview","shortlisted","offered","placed"].indexOf(app.stage) + 1) / 6 * 100}%`,
                    background: "#028090"
                  }} />
                </div>
                <p className="text-sm text-gray-500">{stage.desc}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Talent network status */}
      {candidate && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#e6f5f3" }}>
              <CheckCircle size={16} style={{ color: "#028090" }} />
            </div>
            <h3 className="font-semibold text-gray-900">You're in the GPS Talent Network</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your profile is active. GPS consultants will reach out when a role matches your background. You don't need to do anything — we'll come to you.
          </p>
        </div>
      )}
    </div>
  )
}
