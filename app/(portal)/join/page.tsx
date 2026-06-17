"use client"
import { useState, useRef } from "react"
import { Upload, X, CheckCircle, Loader2, Brain, Users, Shield } from "lucide-react"
import { createClient } from "@/lib/supabase"

const FUNCTIONS = ["Finance", "HR & People", "Sales & Business Development", "Marketing", "Operations", "Technology & IT", "Legal", "Supply Chain & Logistics", "General Management", "Other"]
const LEVELS = ["Mid-level (3–7 years)", "Senior (7–12 years)", "Manager / Team Lead", "Director", "VP / GM", "C-Level (CEO, CFO, COO...)"]

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
      // Extract CV
      const formData = new FormData()
      formData.append("file", file)
      const extractRes = await fetch("/api/extract-cv", { method: "POST", body: formData })
      const { text: cvText } = await extractRes.json()

      // Build AI profile
      const profileRes = await fetch("/api/build-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText || "", filename: file.name })
      })
      const profile = await profileRes.json()

      // Merge form data with AI-extracted profile (form takes precedence)
      await supabase.from("candidates").insert([{
        name: form.name || profile.name,
        email: form.email,
        phone: form.phone || profile.phone,
        current_title: profile.current_title,
        current_company: profile.current_company,
        location: form.location || profile.location,
        cv_text: cvText || "",
        tags: [
          ...(profile.tags || []),
          form.function,
          form.level,
        ].filter(Boolean),
        source: "direct",
        notes: [
          profile.summary,
          form.function ? `Function: ${form.function}` : "",
          form.level ? `Level: ${form.level}` : "",
        ].filter(Boolean).join(" | "),
      }])

      setSubmitted(true)
    } catch (err) {
      console.error(err)
    }
    setSubmitting(false)
  }

  if (submitted) return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto">
        <CheckCircle size={32} className="text-teal" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900">You're in the network</h1>
      <p className="text-gray-500 text-lg leading-relaxed">
        Welcome to GPS Talent. Your profile has been added to our network and our team will review it personally.
        When a role appears that genuinely fits, we'll reach out directly.
      </p>
      <div className="bg-teal/5 rounded-2xl p-6 text-left space-y-2">
        <p className="text-sm font-semibold text-gray-700">What to expect:</p>
        <p className="text-sm text-gray-500">→ We review every profile — no algorithms deciding your fate</p>
        <p className="text-sm text-gray-500">→ We only reach out when we have something genuinely relevant</p>
        <p className="text-sm text-gray-500">→ Your information is never shared without your consent</p>
      </div>
      <a href="/jobs" className="btn-secondary inline-block">Browse open roles</a>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">
      {/* Hero */}
      <div className="grid grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-teal/10 text-teal text-xs font-semibold px-4 py-2 rounded-full">
            <Brain size={13} /> AI-Matched. Human-led.
          </div>
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            Join Egypt's most<br />
            <span style={{ color: "#028090" }}>intelligent talent network</span>
          </h1>
          <p className="text-gray-500 leading-relaxed">
            GPS works with Egypt's leading organisations to place the right people in the right roles.
            Join our network and we'll reach out when something genuinely fits — not just anything.
          </p>
          <div className="space-y-3">
            {[
              { icon: Brain, text: "AI reads your CV deeply and matches you to roles that fit your actual expertise" },
              { icon: Users, text: "Our team reviews every profile personally before reaching out" },
              { icon: Shield, text: "Your profile is never shared without your explicit consent" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={14} className="text-teal" />
                </div>
                <p className="text-sm text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="card shadow-lg">
          <h2 className="font-bold text-gray-900 text-lg mb-6">Join the network</h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
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
                <label className="block text-xs font-medium text-gray-700 mb-1">What do you do?</label>
                <select value={form.function} onChange={e => setForm({...form, function: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30">
                  <option value="">Select function</option>
                  {FUNCTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
                <select value={form.level} onChange={e => setForm({...form, level: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30">
                  <option value="">Select level</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                  placeholder="e.g. Cairo, Egypt" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CV / Resume *</label>
              {file ? (
                <div className="flex items-center gap-2 p-3 bg-teal/5 rounded-lg border border-teal/20">
                  <div className="flex-1 text-xs text-gray-700 truncate">{file.name}</div>
                  <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-teal/40 hover:bg-gray-50 transition-all">
                  <Upload size={22} className="text-gray-400" />
                  <span className="text-sm text-gray-500 font-medium">Upload your CV</span>
                  <span className="text-xs text-gray-400">PDF or Word — AI will read it intelligently</span>
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                    onChange={e => setFile(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>

            <button type="submit" disabled={!file || submitting}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base">
              {submitting
                ? <><Loader2 size={15} className="animate-spin" /> Processing your profile...</>
                : "Join GPS Talent Network →"
              }
            </button>
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              By joining, you agree that GPS may contact you about relevant opportunities. Your information is never sold or shared.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
