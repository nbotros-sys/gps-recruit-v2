"use client"
import { useState, useEffect } from "react"
import { Plus, Search, Briefcase, MapPin, DollarSign, X, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  on_hold: "bg-amber-100 text-amber-700",
  closed: "bg-gray-100 text-gray-600",
  filled: "bg-blue-100 text-blue-700",
}

const STAGE_COLS = [
  { key: "new", label: "new", color: "text-gray-600" },
  { key: "screening", label: "screen", color: "text-blue-600" },
  { key: "interview", label: "interview", color: "text-purple-600" },
  { key: "shortlisted", label: "shortlist", color: "text-teal" },
  { key: "offered", label: "offered", color: "text-amber-600" },
  { key: "placed", label: "placed", color: "text-green-600" },
]

export default function MandatesPage() {
  const [mandates, setMandates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: "", client_name: "", location: "", salary_range: "", job_description: "", status: "active" })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from("mandates")
      .select("id, title, client_name, client_id, location, salary_range, status, created_at, updated_at, applications(stage)")
      .order("created_at", { ascending: false })
    setMandates(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createMandate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from("mandates").insert([form])
    if (!error) {
      setShowCreate(false)
      setForm({ title: "", client_name: "", location: "", salary_range: "", job_description: "", status: "active" })
      load()
    }
    setSaving(false)
  }

  function stageCounts(apps: any[]) {
    const counts: Record<string, number> = {}
    for (const a of apps || []) counts[a.stage] = (counts[a.stage] || 0) + 1
    return counts
  }

  const filtered = mandates.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    (m.client_name || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mandates</h1>
          <p className="text-gray-500 text-sm mt-0.5">{mandates.length} total</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Mandate
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or client..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-4">No mandates found.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Create your first mandate</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => {
            const counts = stageCounts(m.applications)
            const total = Object.values(counts).reduce((a: number, b: any) => a + b, 0)
            return (
              <Link key={m.id} href={`/internal/mandates/${m.id}`}
                className="card flex items-center justify-between hover:shadow-md transition-all cursor-pointer group py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase size={16} className="text-teal" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 group-hover:text-teal transition-colors">{m.title}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-3 mt-0.5">
                      {m.client_name && <span>{m.client_name}</span>}
                      {m.location && <span className="flex items-center gap-1"><MapPin size={10} />{m.location}</span>}
                      {m.salary_range && <span className="flex items-center gap-1"><DollarSign size={10} />{m.salary_range}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {/* Pipeline mini counts */}
                  {total > 0 && (
                    <div className="flex items-center gap-3">
                      {STAGE_COLS.map((s, i) => (
                        <div key={s.key} className="flex items-center gap-3">
                          <div className="text-center min-w-[28px]">
                            <div className={`text-sm font-semibold ${s.color}`}>{counts[s.key] || 0}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                          </div>
                          {i < STAGE_COLS.length - 1 && <div className="w-px h-5 bg-gray-100" />}
                        </div>
                      ))}
                    </div>
                  )}
                  {total === 0 && <span className="text-xs text-gray-300">No candidates yet</span>}
                  <span className={`badge ${STATUS_COLORS[m.status]} text-xs`}>{m.status}</span>
                  <ChevronRight size={15} className="text-gray-300 group-hover:text-teal transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">New Mandate</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={createMandate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                  <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="e.g. Senior Finance Manager" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <input value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="Client company name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="e.g. Cairo, Egypt" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range</label>
                  <input value={form.salary_range} onChange={e => setForm({...form, salary_range: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="e.g. 25,000 – 35,000 EGP" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Description <span className="text-teal text-xs font-normal ml-1">✦ AI Ready</span>
                </label>
                <textarea required value={form.job_description} onChange={e => setForm({...form, job_description: e.target.value})}
                  rows={6} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
                  placeholder="Paste the full job description. AI will use this to score and rank candidates." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Creating..." : "Create Mandate"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
