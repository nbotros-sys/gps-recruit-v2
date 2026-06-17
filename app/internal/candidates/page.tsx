"use client"
import { useState, useEffect } from "react"
import { Plus, Search, Users, MapPin, Mail, Phone, Tag, X, ChevronRight, Loader2 } from "lucide-react"
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
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "", email: "", phone: "", current_title: "", current_company: "",
    location: "", source: "direct", linkedin_url: "", notes: ""
  })
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from("candidates").select("*").order("created_at", { ascending: false })
    setCandidates(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addCandidate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from("candidates").insert([{ ...form, tags: [] }])
    if (!error) { setShowAdd(false); setForm({ name: "", email: "", phone: "", current_title: "", current_company: "", location: "", source: "direct", linkedin_url: "", notes: "" }); load() }
    setSaving(false)
  }

  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.current_title || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.current_company || "").toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

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

      <div className="flex gap-6">
        {/* List */}
        <div className="flex-1 space-y-2">
          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading candidates...</div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-16">
              <Users size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-4">No candidates yet.</p>
              <button onClick={() => setShowAdd(true)} className="btn-primary">Add your first candidate</button>
            </div>
          ) : (
            filtered.map(c => (
              <button key={c.id} onClick={() => setSelected(c === selected ? null : c)}
                className={`w-full text-left card hover:shadow-md transition-all flex items-center justify-between ${selected?.id === c.id ? "ring-2 ring-teal" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ background: "#028090" }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                    <div className="text-xs text-gray-500">
                      {c.current_title}{c.current_company ? ` @ ${c.current_company}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.location && <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={11} />{c.location}</span>}
                  <span className={`badge ${SOURCE_COLORS[c.source] || SOURCE_COLORS.other}`}>{c.source}</span>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 card self-start sticky top-0 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: "#028090" }}>
                  {selected.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{selected.name}</div>
                  <div className="text-xs text-gray-500">{selected.current_title}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500"><X size={16} /></button>
            </div>
            <div className="space-y-2 text-sm">
              {selected.email && <div className="flex items-center gap-2 text-gray-600"><Mail size={14} className="text-gray-400" />{selected.email}</div>}
              {selected.phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={14} className="text-gray-400" />{selected.phone}</div>}
              {selected.location && <div className="flex items-center gap-2 text-gray-600"><MapPin size={14} className="text-gray-400" />{selected.location}</div>}
              {selected.current_company && <div className="text-gray-600">🏢 {selected.current_company}</div>}
            </div>
            {selected.notes && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Notes</div>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selected.notes}</p>
              </div>
            )}
            {selected.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selected.tags.map((t: string) => (
                  <span key={t} className="badge bg-teal/10 text-teal">{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Add Candidate</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={addCandidate} className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Title</label>
                  <input value={form.current_title} onChange={e => setForm({...form, current_title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Current Company</label>
                  <input value={form.current_company} onChange={e => setForm({...form, current_company: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <input value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                  <select value={form.source} onChange={e => setForm({...form, source: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30">
                    <option value="direct">Direct</option>
                    <option value="referral">Referral</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="wuzzuf">Wuzzuf</option>
                    <option value="bayt">Bayt</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL</label>
                  <input value={form.linkedin_url} onChange={e => setForm({...form, linkedin_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3}
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
