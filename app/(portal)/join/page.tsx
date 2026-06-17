"use client"
import { useState, useRef } from "react"
import { Upload, X, CheckCircle, Loader2, Sparkles, Users, Shield, Brain } from "lucide-react"
import { createClient } from "@/lib/supabase"

const FUNCTIONS = ["Finance & Accounting","HR & People","Sales & Business Development","Marketing","Operations","Technology & IT","Legal","Supply Chain & Logistics","General Management","Other"]
const LEVELS = ["Entry level (0–2 years)","Junior (2–4 years)","Mid-level (4–7 years)","Senior (7–12 years)","Manager / Team Lead","Director","VP / GM","C-Level (CEO, CFO, COO...)"]

export default function JoinPage() {
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", function: "", level: "", location: "" })
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const extractRes = await fetch("/api/extract-cv", { method: "POST", body: formData })
      const { text: cvText } = await extractRes.json()

      const profileRes = await fetch("/api/build-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText || "", filename: file.name })
      })
      const profile = await profileRes.json()

      await supabase.from("candidates").insert([{
        name: form.name || profile.name,
        email: form.email,
        phone: form.phone || profile.phone,
        current_title: profile.current_title,
        current_company: profile.current_company,
        location: form.location || profile.location,
        cv_text: cvText || "",
        tags: [...(profile.tags || []), form.function, form.level].filter(Boolean),
        source: "direct",
        notes: [profile.summary, form.function ? `Function: ${form.function}` : "", form.level ? `Level: ${form.level}` : ""].filter(Boolean).join(" | "),
      }])
      setSubmitted(true)
    } catch (err) { console.error(err) }
    setSubmitting(false)
  }

  if (submitted) return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center space-y-6">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: "#e6f5f3" }}>
        <CheckCircle size={36} style={{ color: "#028090" }} />
      </div>
      <h1 className="text-4xl font-bold text-gray-900">You're in the network</h1>
      <p className="text-gray-500 text-lg leading-relaxed">
        Welcome to GPS Talent. Your profile has been added and our consultants will review it personally. We'll reach out when the right opportunity appears.
      </p>
      <div className="rounded-2xl p-6 text-left space-y-3" style={{ background: "#f0faf8", border: "1px solid #A8D5D1" }}>
        <p className="text-sm font-semibold text-gray-700">What to expect</p>
        {["We review every profile — not an algorithm","We only reach out when there's a genuine match","Your information is never shared without your consent"].map(s => (
          <div key={s} className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#028090" }} />
            {s}
          </div>
        ))}
      </div>
      <a href="/jobs" className="inline-block px-8 py-3 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
        Browse open roles
      </a>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0a1f24 0%, #0d2b30 100%)" }} className="py-20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-center gap-3 mb-6">
            <img src="/gps-logo.png" alt="GPS" className="w-12 h-12 object-contain" />
            <div className="h-10 w-px bg-white/20" />
            <span style={{ color: "#A8D5D1" }} className="text-sm font-medium tracking-wide">GPS Talent Network</span>
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-4">
            Join Egypt's most<br />
            <span style={{ color: "#A8D5D1" }}>intelligent talent network</span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl leading-relaxed">
            Submit your profile once. GPS does the rest — matching you to the right opportunities as they arise, whether you're just starting out or leading teams.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-16">
        <div className="grid grid-cols-5 gap-12">
          {/* Left: Why GPS */}
          <div className="col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Why GPS Talent</h2>
              <div className="space-y-5">
                {[
                  { icon: Brain, title: "Deep AI matching", desc: "Our AI reads your CV intelligently — understanding your real expertise and potential, not just your job title." },
                  { icon: Users, title: "Human-led decisions", desc: "Every outreach comes from a GPS consultant who has personally reviewed your profile." },
                  { icon: Shield, title: "Complete discretion", desc: "Senior professionals need confidentiality. We never share your details without your explicit consent." },
                  { icon: Sparkles, title: "Quality over quantity", desc: "We'll only reach out when there's a genuinely relevant opportunity. No noise." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "#e6f5f3" }}>
                      <Icon size={16} style={{ color: "#028090" }} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{title}</div>
                      <div className="text-sm text-gray-500 mt-0.5 leading-relaxed">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, #028090, #3D5A4E)" }}>
              <img src="/gps-logo.png" alt="GPS" className="w-10 h-10 object-contain mb-4" />
              <p className="text-white font-semibold mb-1">GPS — Your Trusted HR Partner</p>
              <p className="text-white/70 text-sm leading-relaxed">
                One of Egypt's leading HR consultancy and recruitment firms, placing professionals at every level across Egypt and the MENA region.
              </p>
            </div>
          </div>

          {/* Right: Form */}
          <div className="col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <h3 className="font-bold text-gray-900 text-xl mb-6">Join the network</h3>
              <form onSubmit={submit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                      placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                      placeholder="your@email.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                    <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                      placeholder="+20 ..." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">What do you do?</label>
                    <select value={form.function} onChange={e => setForm({...form, function: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 bg-white">
                      <option value="">Select function</option>
                      {FUNCTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Level</label>
                    <select value={form.level} onChange={e => setForm({...form, level: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 bg-white">
                      <option value="">Select level</option>
                      {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Location</label>
                    <input value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                      placeholder="e.g. Cairo, Egypt" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">CV / Resume *</label>
                  {file ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: "#f0faf8", borderColor: "#A8D5D1" }}>
                      <div className="flex-1 text-sm text-gray-700 truncate font-medium">{file.name}</div>
                      <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={16} /></button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-teal/40 hover:bg-gray-50/50 transition-all">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#e6f5f3" }}>
                        <Upload size={20} style={{ color: "#028090" }} />
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-semibold text-gray-700">Upload your CV</span>
                        <p className="text-xs text-gray-400 mt-1">PDF or Word — AI will read it intelligently</p>
                      </div>
                      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                        onChange={e => setFile(e.target.files?.[0] || null)} />
                    </label>
                  )}
                </div>

                <button type="submit" disabled={!file || submitting}
                  className="w-full py-4 rounded-xl font-bold text-white text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "#028090" }}>
                  {submitting
                    ? <><Loader2 size={16} className="animate-spin" /> Building your profile...</>
                    : "Join GPS Talent Network →"
                  }
                </button>
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  By joining, you agree GPS may contact you about relevant roles. Your information is never sold or shared.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
