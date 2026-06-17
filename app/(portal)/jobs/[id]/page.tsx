"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { MapPin, ArrowLeft, CheckCircle, Loader2, Upload, X, Clock, Shield, Users } from "lucide-react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function JobDetailPage() {
  const { id } = useParams()
  const [mandate, setMandate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "" })
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("mandates").select("*").eq("id", id).eq("status", "active").single()
      setMandate(data)
      setLoading(false)
    }
    load()
  }, [id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !mandate) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const extractRes = await fetch("/api/extract-cv", { method: "POST", body: formData })
      const { text: cvText } = await extractRes.json()

      const [profileRes, scoreRes] = await Promise.all([
        fetch("/api/build-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cv_text: cvText || "", filename: file.name })
        }),
        fetch("/api/score-cv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cv_text: cvText || "", job_description: mandate.job_description, mandate_title: mandate.title })
        })
      ])
      const profile = await profileRes.json()
      const score = await scoreRes.json()

      const { data: candidate } = await supabase.from("candidates").insert([{
        name: form.name || profile.name,
        email: form.email,
        phone: form.phone || profile.phone,
        current_title: profile.current_title,
        current_company: profile.current_company,
        location: profile.location,
        cv_text: cvText || "",
        tags: profile.tags || [],
        source: "direct",
        notes: profile.summary || "",
      }]).select().single()

      if (candidate) {
        await supabase.from("applications").insert([{
          candidate_id: candidate.id,
          mandate_id: id,
          stage: "new",
          ai_score: score.score,
          ai_summary: score.summary,
          ai_strengths: Array.isArray(score.strengths) ? score.strengths : [],
          ai_concerns: Array.isArray(score.concerns) ? score.concerns : [],
        }])
      }
      setSubmitted(true)
    } catch (err) { console.error(err) }
    setSubmitting(false)
  }

  if (loading) return <div className="text-center py-32 text-gray-400">Loading...</div>

  if (!mandate) return (
    <div className="max-w-3xl mx-auto px-6 py-24 text-center">
      <p className="text-gray-500 mb-4">This role is no longer active.</p>
      <Link href="/jobs" className="px-6 py-3 rounded-xl font-semibold text-white text-sm inline-block" style={{ background: "#028090" }}>
        See all open roles
      </Link>
    </div>
  )

  if (submitted) return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center space-y-6">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
        style={{ background: "#e6f5f3" }}>
        <CheckCircle size={36} style={{ color: "#028090" }} />
      </div>
      <h1 className="text-4xl font-bold text-gray-900">Application received</h1>
      <p className="text-gray-500 text-lg leading-relaxed">
        Thank you for applying to <strong>{mandate.title}</strong>.<br />
        Our consultants review every application personally. If your profile is the right fit, we'll be in touch directly.
      </p>
      <div className="rounded-2xl p-6 text-left space-y-3" style={{ background: "#f0faf8", border: "1px solid #A8D5D1" }}>
        <p className="text-sm font-semibold text-gray-700">What happens next</p>
        <div className="space-y-2">
          {[
            "Your CV is being reviewed by a GPS consultant",
            "If shortlisted, we'll contact you within a few days",
            "All applications are handled with complete confidentiality"
          ].map(s => (
            <div key={s} className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#028090" }} />
              {s}
            </div>
          ))}
        </div>
      </div>
      <Link href="/jobs" className="inline-block px-8 py-3 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
        See other open roles
      </Link>
    </div>
  )

  return (
    <div>
      {/* Job header */}
      <div style={{ background: "linear-gradient(135deg, #0a1f24 0%, #0d2b30 100%)" }} className="py-16">
        <div className="max-w-6xl mx-auto px-8">
          <Link href="/jobs" className="flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-8 w-fit transition-colors">
            <ArrowLeft size={14} /> All roles
          </Link>
          <h1 className="text-4xl font-bold text-white mb-3">{mandate.title}</h1>
          <div className="flex items-center gap-4 text-white/50 text-sm">
            {mandate.location && <span className="flex items-center gap-1.5"><MapPin size={13} />{mandate.location}</span>}
            <span>·</span>
            <span>GPS — Your Trusted HR Partner</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(168,213,209,0.15)", color: "#A8D5D1" }}>
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid grid-cols-3 gap-8">
          {/* Left: JD */}
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h2 className="font-bold text-gray-900 text-lg mb-5">About this role</h2>
              <div className="text-gray-600 leading-relaxed whitespace-pre-wrap text-sm">{mandate.job_description}</div>
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Shield, text: "Fully confidential" },
                { icon: Users, text: "Personally reviewed" },
                { icon: Clock, text: "Response within days" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                  <Icon size={16} style={{ color: "#028090" }} />
                  <span className="text-xs font-medium text-gray-600">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Apply */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              {!applying ? (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">Apply for this role</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">No account needed. Takes 2 minutes. Your CV stays confidential.</p>
                  <button onClick={() => setApplying(true)}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all"
                    style={{ background: "#028090" }}>
                    Apply now →
                  </button>
                  <div className="border-t border-gray-100 pt-4 text-center">
                    <p className="text-xs text-gray-400 mb-2">Not the right fit?</p>
                    <a href="/join" className="text-sm font-medium hover:underline" style={{ color: "#028090" }}>
                      Join our talent network
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <h3 className="font-bold text-gray-900">Your application</h3>
                  {[
                    { label: "Full Name *", key: "name", type: "text", placeholder: "Your full name", required: true },
                    { label: "Email *", key: "email", type: "email", placeholder: "your@email.com", required: true },
                    { label: "Phone", key: "phone", type: "tel", placeholder: "+20 ...", required: false },
                  ].map(({ label, key, type, placeholder, required }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                      <input required={required} type={type}
                        value={form[key as keyof typeof form]}
                        onChange={e => setForm({...form, [key]: e.target.value})}
                        placeholder={placeholder}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ "--tw-ring-color": "#028090" } as any} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">CV / Resume *</label>
                    {file ? (
                      <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ background: "#f0faf8", borderColor: "#A8D5D1" }}>
                        <div className="flex-1 text-xs text-gray-700 truncate">{file.name}</div>
                        <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-teal/40 transition-all">
                        <Upload size={20} className="text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium">Upload CV</span>
                        <span className="text-xs text-gray-400">PDF or Word</span>
                        <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                          onChange={e => setFile(e.target.files?.[0] || null)} />
                      </label>
                    )}
                  </div>
                  <button type="submit" disabled={!file || submitting}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "#028090" }}>
                    {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : "Submit application"}
                  </button>
                  <p className="text-xs text-gray-400 text-center">Confidential · Never shared without consent</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
