"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, CheckCircle } from "lucide-react"

export default function CandidateLogin() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })
    if (error) {
      setError("Could not send login link. Please try again.")
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto px-6 py-24">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "#e6f5f3" }}>
              <CheckCircle size={28} style={{ color: "#028090" }} />
            </div>
            <h2 className="font-bold text-gray-900 text-xl">Check your email</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              We sent a sign-in link to <strong>{email}</strong>.<br />
              Click the link to access your account — no password needed.
            </p>
            <p className="text-xs text-gray-400">Link expires in 1 hour. Check your spam folder if you don't see it.</p>
            <button onClick={() => setSent(false)} className="text-sm font-medium hover:underline" style={{ color: "#028090" }}>
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-bold text-gray-900 text-xl mb-2">Sign in to GPS Talent</h2>
            <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a one-click sign-in link. No password required.</p>
            <form onSubmit={sendMagicLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ "--tw-ring-color": "#028090" } as any} />
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
                style={{ background: "#028090" }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Sending link...</> : "Send sign-in link →"}
              </button>
            </form>
            <p className="text-xs text-gray-400 text-center mt-4">
              New to GPS? <a href="/join" className="font-medium hover:underline" style={{ color: "#028090" }}>Join the talent network</a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
