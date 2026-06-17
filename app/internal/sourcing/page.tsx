"use client"
import { useState } from "react"
import { Zap, Copy, Check, Loader2, LinkedinIcon, Globe, MessageSquare } from "lucide-react"
import { createClient } from "@/lib/supabase"
import type { Mandate } from "@/lib/types"

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", icon: "💼" },
  { id: "email", label: "Email", icon: "✉️" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬" },
]

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "friendly", label: "Friendly & Warm" },
  { id: "direct", label: "Direct & Brief" },
]

export default function SourcingPage() {
  const [candidateBg, setCandidateBg] = useState("")
  const [mandateContext, setMandateContext] = useState("")
  const [platform, setPlatform] = useState("linkedin")
  const [tone, setTone] = useState("professional")
  const [generating, setGenerating] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [copied, setCopied] = useState<number | null>(null)

  async function generate() {
    if (!candidateBg) return
    setGenerating(true)
    setMessages([])
    try {
      const res = await fetch("/api/generate-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_background: candidateBg, mandate_context: mandateContext, platform, tone })
      })
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) {
      setMessages(["Failed to generate. Please try again."])
    }
    setGenerating(false)
  }

  function copy(idx: number, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Sourcing Assistant</h1>
        <p className="text-gray-500 text-sm mt-0.5">Generate personalised outreach messages for any candidate in seconds.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Candidate Background</h3>
            <textarea value={candidateBg} onChange={e => setCandidateBg(e.target.value)} rows={6}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
              placeholder="Paste the candidate's LinkedIn summary, CV snippet, or write a brief description of their background...&#10;&#10;e.g. '10 years in finance, currently CFO at a mid-size Egyptian manufacturing company, MBA from AUC, strong FP&A background'" />
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Role Context (optional)</h3>
            <textarea value={mandateContext} onChange={e => setMandateContext(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
              placeholder="Briefly describe the role or opportunity, e.g. 'Group CFO role at a fast-growing retail group in Cairo, confidential'" />
          </div>

          <div className="card space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Platform</h3>
              <div className="flex gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${platform === p.id ? "border-teal bg-teal/5 text-teal font-medium" : "border-gray-200 text-gray-600 hover:border-teal/50"}`}>
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Tone</h3>
              <div className="flex gap-2">
                {TONES.map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)}
                    className={`px-3 py-2 rounded-lg text-sm border transition-all ${tone === t.id ? "border-teal bg-teal/5 text-teal font-medium" : "border-gray-200 text-gray-600 hover:border-teal/50"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={generate} disabled={!candidateBg || generating}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {generating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Zap size={16} /> Generate Outreach</>}
          </button>
        </div>

        {/* Output */}
        <div className="space-y-4">
          {messages.length === 0 && !generating && (
            <div className="card border-dashed text-center py-16">
              <Zap size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 text-sm">Your AI-crafted outreach messages will appear here.</p>
              <p className="text-gray-300 text-xs mt-1">3 variations generated per request</p>
            </div>
          )}
          {generating && (
            <div className="card text-center py-16">
              <Loader2 size={28} className="animate-spin mx-auto mb-3 text-teal" />
              <p className="text-gray-500 text-sm">Crafting personalised messages...</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className="card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Variation {i + 1}</span>
                <button onClick={() => copy(i, msg)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal transition-colors">
                  {copied === i ? <><Check size={13} className="text-green-500" /> Copied!</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{msg}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
