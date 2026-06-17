"use client"
import { useState, useEffect } from "react"
import { Plus, Search, Users, MapPin, Mail, Phone, Tag, X, ChevronRight, Loader2, Star } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import type { Candidate } from "@/lib/types"

const SOURCE_COLORS: Record<string, string> = {
  direct: "bg-teal/10 text-teal",
  referral: "bg-purple-100 text-purple-700",
  linkedin: "bg-blue-100 text-blue-700",
  wuzzuf: "bg-amber-100 text-amber-700",
  bayt: "bg-green-100 text-green-700",
  other: "bg-gray-100 text-gray-600",
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "", email: "", phone: "", current_title: "", current_company: "",
    location: "", source: "direct", linkedin_url: "", notes: ""
  })
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from("candidates")
      .select("*, applications(id, stage, ai_score, mandate:mandates(title))")
      .order("created_at", { ascending: false })
    setCandidates(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addCandidate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from("candidates").insert([{ ...form, tags: [] }])
    if (!error) {
      setShowAdd(false)
      setForm({ name: "", email: "", phone: "", current_title: "", current_company: "", location: "", source: "direct", linkedin_url: "", notes: "" })
      load()
    }
    setSaving(false)
  }

  const filtered = candidates.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.current_title?.toLowerCase().includes(search.toLowerCase()) ||
    c.current_company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const bestScore = (c: any) => {
    const scores = (c.applications || []).map((a: any) => a.ai_score).filter(Boolean)
    return scores.length > 0 ? Math.max(...scores) : null
  }
  const scoreColor = (s: number) => s >= 70 ? "#028090" : s >= 50 ? "#d97706" : "#9ca3af"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 text-sm mt-0.5">{candidates.length} in database</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Candidate
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, title, company or email..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
        </div>
      </div>

      {/* Candidate list — each row links to full profile */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 mb-4">No candidates yet.</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary">Add your first candidate</button>
          </div>
        ) : (
          filtered.map(c => {
            const score = bestScore(c)
            const mandateCount = c.applications?.length || 0
            return (
              <Link key={c.id} href={`/internal/candidates/${c.id}`}
                className="card flex items-center justify-between hover:shadow-md transition-all cursor-pointer group py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #028090, #3D5A4E)" }}>
                    {c.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 group-hover:text-teal transition-colors">{c.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {c.current_title}{c.current_company ? ` @ ${c.current_company}` : ""}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {c.email && <span className="text-xs text-gray-400">{c.email}</span>}
                      {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                      {c.location && <span className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin size={10} />{c.location}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {mandateCount > 0 && (
                    <span className="text-xs text-gray-400">{mandateCount} mandate{mandateCount > 1 ? "s" : ""}</span>
                  )}
                  {score && (
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-semibold" style={{ color: scoreColor(score) }}>{score}</span>
                    </div>
                  )}
                  <span className={`badge ${SOURCE_COLORS[c.source] || SOURCE_COLORS.other} text-xs`}>{c.source}</span>
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-teal transition-colors" />
                </div>
              </Link>
            )
          })
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Add Candidate</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={addCandidate} className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Full Name *", key: "name", required: true },
                  { label: "Email *", key: "email", required: true, type: "email" },
                  { label: "Phone", key: "phone" },
                  { label: "Current Title", key: "current_title" },
                  { label: "Current Company", key: "current_company" },
                  { label: "Location", key: "location" },
                  { label: "LinkedIn URL", key: "linkedin_url" },
                ].map(({ label, key, required, type }) => (
                  <div key={key} className={key === "linkedin_url" ? "col-span-2" : ""}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      required={required} type={type || "text"}
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                  <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30">
                    <option value="direct">Direct</option>
                    <option value="referral">Referral</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="wuzzuf">Wuzzuf</option>
                    <option value="bayt">Bayt</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Add Candidate"}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
