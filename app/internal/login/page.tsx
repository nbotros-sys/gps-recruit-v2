"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

export default function InternalLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetSent, setResetSent] = useState(false)
  const [mode, setMode] = useState<"login" | "reset">("login")
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
      window.location.href = "/internal/dashboard"
    }
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    if (error) {
      setError("Could not send reset email. Please check the address.")
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d2b30" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-16 h-16 mb-4">
            <Image src="/gps-logo.png" alt="GPS" fill className="object-contain" />
          </div>
          <div className="text-white font-bold text-xl">GPS</div>
          <div className="text-white/40 text-xs tracking-widest uppercase font-medium mt-0.5">Internal Platform</div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {resetSent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto">
                <span className="text-2xl">✉️</span>
              </div>
              <h2 className="font-bold text-gray-900 text-lg">Check your email</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                We sent a password reset link to <strong>{email}</strong>. Click the link to set a new password.
              </p>
              <button onClick={() => { setResetSent(false); setMode("login") }}
                className="text-teal text-sm font-medium hover:underline">
                Back to login
              </button>
            </div>
          ) : mode === "login" ? (
            <>
              <h2 className="font-bold text-gray-900 text-xl mb-6">Sign in</h2>
              <form onSubmit={login} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                  <div className="relative">
                    <input required type={showPassword ? "text" : "password"}
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal pr-11" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
                  style={{ background: "#028090" }}>
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in...</> : "Sign in"}
                </button>
              </form>
              <button onClick={() => { setMode("reset"); setError("") }}
                className="w-full text-center text-xs text-gray-400 hover:text-teal mt-4 transition-colors">
                Forgot password?
              </button>
            </>
          ) : (
            <>
              <h2 className="font-bold text-gray-900 text-xl mb-2">Reset password</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={sendReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
                  style={{ background: "#028090" }}>
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : "Send reset link"}
                </button>
              </form>
              <button onClick={() => { setMode("login"); setError("") }}
                className="w-full text-center text-xs text-gray-400 hover:text-teal mt-4 transition-colors">
                Back to login
              </button>
            </>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">GPS Recruitment Platform · Internal Access Only</p>
      </div>
    </div>
  )
}
