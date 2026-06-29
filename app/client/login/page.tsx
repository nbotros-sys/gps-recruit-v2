"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

export default function ClientLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Invalid email or password. Please try again.")
      setLoading(false)
    } else {
      window.location.href = "/client/portal"
    }
  }

  return (
    <div className="min-h-screen w-full flex"
      style={{ background: "linear-gradient(135deg, #091f23 0%, #0d2b30 50%, #0a2428 100%)" }}>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <svg viewBox="0 0 500 500" className="w-full h-full">
            <polygon points="250,30 450,145 450,355 250,470 50,355 50,145" fill="none" stroke="white" strokeWidth="1"/>
            <polygon points="250,80 410,170 410,330 250,420 90,330 90,170" fill="none" stroke="white" strokeWidth="1"/>
            <polygon points="250,130 370,195 370,305 250,370 130,305 130,195" fill="none" stroke="white" strokeWidth="1"/>
          </svg>
        </div>
        <div className="relative z-10 text-center max-w-sm">
          <div className="relative w-36 h-36 mx-auto mb-8">
            <Image src="/gps-logo-full.png" alt="GPS Recruitment" fill className="object-contain" />
          </div>
          <h1 className="text-white text-3xl font-light tracking-wide mb-3">Client Portal</h1>
          <p className="text-white/40 text-sm tracking-widest uppercase font-medium mb-10">Your Trusted HR Partner</p>
          <div className="space-y-4">
            {[
              "View your shortlisted candidates",
              "Leave feedback and request interviews",
              "Access GPS market commentary",
            ].map(t => (
              <div key={t} className="flex items-center gap-3 text-white/30 text-sm">
                <div className="w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="absolute bottom-8 text-white/15 text-xs">
          © {new Date().getFullYear()} GPS Recruitment · Egypt & MENA
        </p>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8"
        style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="relative w-24 h-24 mb-4">
              <Image src="/gps-logo-full.png" alt="GPS Recruitment" fill className="object-contain" />
            </div>
          </div>

          <div className="rounded-2xl p-8"
            style={{ background: "rgba(255,255,255,0.97)", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>
            <div className="mb-7">
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">Welcome back</h2>
              <p className="text-sm text-gray-400">Sign in to your GPS client portal</p>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
            )}

            <form onSubmit={login} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all pr-11"
                    style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold tracking-wide transition-all disabled:opacity-60 hover:opacity-90 mt-2"
                style={{ background: "linear-gradient(135deg, #028090, #025f6b)" }}>
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Sign in"}
              </button>
            </form>
          </div>
          <p className="text-center text-white/20 text-xs mt-6">
            Need access? Contact your GPS recruiter.
          </p>
        </div>
      </div>
    </div>
  )
}
