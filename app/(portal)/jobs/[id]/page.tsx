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
  const [submitError, setSubmitError] = useState("")
  const [candidate, setCandidate] = useState<any>(null)
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      // Load mandate
      const { data: m } = await supabase.from("mandates").select("id, title, client_name, location, salary_range, status, created_at, job_description").eq("id", id).eq("status", "active").maybeSingle()
      setMandate(m)

      // Check if user is logged in and has a candidate profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: cand } = await supabase.from("candidates").select("*").eq("email", user.email).single()
        if (cand) {
          setCandidate(cand)
          // Pre-fill form with their existing data
          setForm({
            name: cand.name || "",
            email: cand.email || user.email || "",
            phone: cand.phone || "",
          })
          // Check if already applied to this mandate
          const { count, error: appError } = await supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .eq("candidate_id", cand.id)
            .eq("mandate_id", id)
          if (appError) console.error("Application check error:", appError)
          if (count && count > 0) setAlreadyApplied(true)
        } else {
          // Logged in but no candidate record yet — pre-fill email only
          setForm({ name: "", email: user.email || "", phone: "" })
        }
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!mandate) return
    // Require either an uploaded file or an existing CV on file
    if (!file && !candidate?.cv_text) return
    setSubmitting(true)
    setSubmitError("")
    try {
      let cvText = candidate?.cv_text || ""

      // Only extract from a newly uploaded file
      if (file) {
        const fd = new FormData()
        fd.append("file", file)
        const extractRes = await fetch("/api/extract-cv", { method: "POST", body: fd })
        const { text } = await extractRes.json()
        cvText = text || ""
      }

      const { data: { user: authUser } } = await supabase.auth.getUser()

      // CV read, scoring, candidate + application save and emails all run
      // server-side so RLS never silently drops the application.
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mandate_id: id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          cv_text: cvText,
          filename: file?.name || "profile",
          cv_is_new: !!file,
          job_description: mandate.job_description,
          mandate_title: mandate.title,
          client_name: mandate.client_name,
          mandate_location: mandate.location,
          has_account: !!authUser,
        }),
      })
      const result = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error(result.error || "Could not submit your application. Please try again.")
      }
      setSubmitted(true)
    } catch (err: any) {
      console.error(err)
      setSubmitError(err?.message || "Could not submit your application. Please try again.")
    }
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
              {alreadyApplied ? (
                <div className="text-center space-y-3 py-4">
                  <CheckCircle size={32} className="mx-auto" style={{ color: "#028090" }} />
                  <p className="font-bold text-gray-900">Already applied</p>
                  <p className="text-sm text-gray-500">You've already applied to this role. GPS will be in touch if your profile is a match.</p>
                  <Link href="/account" className="text-sm font-medium hover:underline block mt-2" style={{ color: "#028090" }}>
                    View my applications →
                  </Link>
                </div>
              ) : !applying ? (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">Apply for this role</h3>
                  {candidate ? (
                    <div className="rounded-xl p-3 text-sm" style={{ background: "#f0faf8", border: "1px solid #A8D5D1" }}>
                      <p className="font-semibold text-gray-800 text-xs mb-0.5">Applying as</p>
                      <p className="text-gray-700 font-medium">{candidate.name}</p>
                      <p className="text-gray-500 text-xs">{candidate.email}</p>
                      {candidate.cv_text && <p className="text-xs mt-1" style={{ color: "#028090" }}>✓ CV on file</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 leading-relaxed">No account needed. Takes 2 minutes. Your CV stays confidential.</p>
                  )}
                  {alreadyApplied ? (
                    <div className="w-full py-3.5 rounded-xl text-sm text-center font-semibold border-2" style={{ borderColor: "#028090", color: "#028090", background: "#f0faf8" }}>
                      ✓ Application Submitted
                    </div>
                  ) : (
                    <button onClick={() => setApplying(true)}
                      className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all"
                      style={{ background: "#028090" }}>
                      Apply now →
                    </button>
                  )}
                  {!alreadyApplied && (
                    <div className="border-t border-gray-100 pt-4 text-center">
                      <p className="text-xs text-gray-400 mb-2">Not the right fit?</p>
                      <a href="/join" className="text-sm font-medium hover:underline" style={{ color: "#028090" }}>
                        Join our talent network
                      </a>
                    </div>
                  )}
                  {alreadyApplied && (
                    <p className="text-xs text-center text-gray-400">You've already applied for this role. We'll be in touch.</p>
                  )}
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <h3 className="font-bold text-gray-900">Your application</h3>

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
                    <input required type="text"
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value})}
                      placeholder="Your full name"
                      readOnly={!!candidate?.name}
                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent ${candidate?.name ? "bg-gray-50 text-gray-500" : ""}`}
                      style={{ "--tw-ring-color": "#028090" } as any} />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
                    <input required type="email"
                      value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      placeholder="your@email.com"
                      readOnly={!!candidate?.email}
                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent ${candidate?.email ? "bg-gray-50 text-gray-500" : ""}`}
                      style={{ "--tw-ring-color": "#028090" } as any} />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                    <div className={`flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 ${candidate?.phone ? "bg-gray-50" : ""}`}>
                      <span className="px-3 py-2.5 text-sm font-medium text-gray-500 bg-gray-100 border-r border-gray-200 select-none">+20</span>
                      <input type="tel"
                        value={form.phone ? form.phone.replace(/^\+20\s?/, '') : ''}
                        onChange={e => setForm({...form, phone: '+20 ' + e.target.value})}
                        placeholder="100 000 0000"
                        readOnly={!!candidate?.phone}
                        className={`flex-1 px-3 py-2.5 text-sm focus:outline-none ${candidate?.phone ? "bg-gray-50 text-gray-500" : "bg-white"}`}
                      style={{ "--tw-ring-color": "#028090" } as any} />
                      </div>
                  </div>

                  {/* CV — show on-file state or upload */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">CV / Resume *</label>
                    {candidate?.cv_text && !file ? (
                      <div className="rounded-xl p-3 border" style={{ background: "#f0faf8", borderColor: "#A8D5D1" }}>
                        <p className="text-xs font-semibold" style={{ color: "#028090" }}>✓ CV on file</p>
                        <p className="text-xs text-gray-500 mt-0.5">Your existing CV will be used for this application.</p>
                        <label className="text-xs underline cursor-pointer mt-1 block" style={{ color: "#028090" }}>
                          Upload a different CV instead
                          <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                            onChange={e => setFile(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                    ) : file ? (
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

                  <button type="submit" disabled={(!file && !candidate?.cv_text) || submitting}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "#028090" }}>
                    {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : "Submit application"}
                  </button>
                  {submitError && <p className="text-xs text-red-500 text-center">{submitError}</p>}
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
