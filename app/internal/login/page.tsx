"use client"
import { useState, useEffect } from "react"
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("error") === "not_staff") {
      setError("This account does not have access to the GPS internal platform. Please contact your administrator.")
    }
  }, [])

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
      <div className="w-full max-w-sm px-4">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-24 h-24 mb-3">
            <Image src="/gps-logo.png" alt="GPS Recruitment" fill className="object-contain" />
          </div>
          <div className="text-white/40 text-[10px] tracking-widest uppercase font-medium">Internal Platform</div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {resetSent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Check your email</h2>
              <p className="text-sm text-gray-500">We sent a password reset link to {email}</p>
              <button onClick={() => { setMode("login"); setResetSent(false) }} className="text-sm text-teal hover:underline">
                Back to sign in
              </button>
            </div>
          ) : mode === "login" ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Sign in</h2>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}
              <form onSubmit={login} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-70"
                  style={{ background: "#028090" }}>
                  {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Sign in"}
                </button>
              </form>
              <button onClick={() => setMode("reset")} className="mt-4 w-full text-center text-sm text-gray-400 hover:text-gray-600">
                Forgot password?
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Reset password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}
              <form onSubmit={sendReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-70"
                  style={{ background: "#028090" }}>
                  {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Send reset link"}
                </button>
              </form>
              <button onClick={() => setMode("login")} className="mt-4 w-full text-center text-sm text-gray-400 hover:text-gray-600">
                Back to sign in
              </button>
            </>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">GPS Recruitment Platform · Internal Access Only</p>
      </div>
    </div>
  )
}
