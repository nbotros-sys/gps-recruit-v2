"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { MapPin, ArrowLeft, CheckCircle, Loader2, Upload, X } from "lucide-react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"

export default function JobDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [mandate, setMandate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "", cover: "" })
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
      // Extract CV text
      const formData = new FormData()
      formData.append("file", file)
      const extractRes = await fetch("/api/extract-cv", { method: "POST", body: formData })
      const extractData = await extractRes.json()
      const cvText = extractData.text || ""

      // Build AI profile + score against JD simultaneously
      const [profileRes, scoreRes] = await Promise.all([
        fetch("/api/build-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cv_text: cvText, filename: file.name })
        }),
        fetch("/api/score-cv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cv_text: cvText, job_description: mandate.job_description, mandate_title: mandate.title })
        })
      ])

      const profile = await profileRes.json()
      const score = await scoreRes.json()

      // Save candidate
      const { data: candidate } = await supabase.from("candidates").insert([{
        name: form.name || profile.name,
        email: form.email,
        phone: form.phone || profile.phone,
        current_title: profile.current_title,
        current_company: profile.current_company,
        location: profile.location,
        cv_text: cvText,
        tags: profile.tags || [],
        source: "direct",
        notes: profile.summary || "",
      }]).select().single()

      if (candidate) {
        // Create application
        await supabase.from("applications").insert([{
          candidate_id: candidate.id,
          mandate_id: id,
          stage: "new",
          ai_score: score.score,
          ai_summary: score.summary,
          ai_strengths: score.strengths || [],
          ai_concerns: score.concerns || [],
        }])
      }

      setSubmitted(true)
    } catch (err) {
      console.error(err)
    }
    setSubmitting(false)
  }

  if (loading) return <div className="text-center py-32 text-gray-400">Loading...</div>
  if (!mandate) return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-center">
      <p className="text-gray-500">This role is no longer active.</p>
      <Link href="/jobs" className="btn-primary mt-4 inline-block">See all open roles</Link>
    </div>
  )

  if (submitted) return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto">
        <CheckCircle size={32} className="text-teal" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900">Application received</h1>
      <p className="text-gray-500 text-lg">
        Thank you for applying to <strong>{mandate.title}</strong>. Our team reviews every application personally.
        If your profile is a match, we'll be in touch within a few days.
      </p>
      <div className="bg-teal/5 rounded-2xl p-6 text-left space-y-2">
        <p className="text-sm font-semibold text-gray-700">What happens next:</p>
        <p className="text-sm text-gray-500">→ Your CV is being reviewed by GPS</p>
        <p className="text-sm text-gray-500">→ If shortlisted, we'll contact you directly</p>
        <p className="text-sm text-gray-500">→ All applications are treated with full confidentiality</p>
      </div>
      <Link href="/jobs" className="btn-secondary inline-block">See other open roles</Link>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <Link href="/jobs" className="flex items-center gap-1 text-gray-400 hover:text-teal text-sm mb-8 w-fit transition-colors">
        <ArrowLeft size={14} /> Back to all roles
      </Link>

      <div className="grid grid-cols-3 gap-8">
        {/* Left: Job detail */}
        <div className="col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{mandate.title}</h1>
            <div className="flex items-center gap-4 text-gray-500 text-sm mt-2">
              {mandate.location && <span className="flex items-center gap-1"><MapPin size={13} />{mandate.location}</span>}
              <span>GPS — Your Trusted HR Partner</span>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">About this role</h2>
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {mandate.job_description}
            </div>
          </div>

          <div className="card" style={{ background: "linear-gradient(135deg, #028090 0%, #3D5A4E 100%)" }}>
            <p className="text-white font-semibold mb-1">About GPS Talent</p>
            <p className="text-white/80 text-sm leading-relaxed">
              GPS is one of Egypt's leading executive search and HR consultancy firms. We work with top organisations across Egypt and the region to find the right people for the right roles — using AI-driven matching to go beyond the CV.
            </p>
          </div>
        </div>

        {/* Right: Apply form */}
        <div className="col-span-1">
          <div className="card sticky top-24">
            {!applying ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Apply for this role</h3>
                <p className="text-sm text-gray-500">Takes 2 minutes. No account required.</p>
                <button onClick={() => setApplying(true)} className="btn-primary w-full py-3">
                  Apply now →
                </button>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-400 text-center">Not the right role?</p>
                  <a href="/join" className="btn-secondary w-full mt-2 text-sm text-center block">
                    Join our talent network
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <h3 className="font-semibold text-gray-900">Your application</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="your@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                    placeholder="+20 ..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CV / Resume *</label>
                  {file ? (
                    <div className="flex items-center gap-2 p-3 bg-teal/5 rounded-lg border border-teal/20">
                      <div className="flex-1 text-xs text-gray-700 truncate">{file.name}</div>
                      <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-teal/40 hover:bg-gray-50 transition-all">
                      <Upload size={20} className="text-gray-400" />
                      <span className="text-xs text-gray-500">Upload PDF or Word</span>
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                        onChange={e => setFile(e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>
                <button type="submit" disabled={!file || submitting}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : "Submit application"}
                </button>
                <p className="text-xs text-gray-400 text-center">Your information is treated with full confidentiality.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
