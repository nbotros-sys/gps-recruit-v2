"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

type Mode = "login" | "reset_email" | "reset_otp" | "reset_newpassword"

export default function ClientLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [mode, setMode] = useState<Mode>("login")
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

  // Step 1: send 6-digit reset code
  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    if (error) setError("Could not send code. Please check the email address.")
    else { setInfo(`A 6-digit code was sent to ${email}`); setMode("reset_otp") }
    setLoading(false)
  }

  // Step 2: verify the code
  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" })
    if (error) setError("Invalid or expired code. Please try again.")
    else { setInfo(""); setMode("reset_newpassword") }
    setLoading(false)
  }

  // Step 3: set the new password
  const setNewPw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return }
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setError("Could not update password. Please try again."); setLoading(false); return }
    window.location.href = "/client/portal"
  }

  const backToLogin = () => {
    setMode("login"); setError(""); setInfo(""); setOtp("")
    setNewPassword(""); setConfirmPassword("")
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
          <h1 className="text-white text-3xl font-light tracking-wide mb-2">Client Portal</h1>
          <p className="text-white/70 text-sm tracking-widest uppercase font-medium mb-10">Your Trusted HR Partner</p>

          <div className="space-y-5 text-left">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(2,128,144,0.3)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(168,213,209,0.9)" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <div>
                <p className="text-white/80 text-sm font-semibold mb-0.5">AI-powered screening</p>
                <p className="text-white/35 text-xs leading-relaxed">Every candidate is scored and ranked by our AI against your specific role requirements — so you only see the best fit.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(2,128,144,0.3)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(168,213,209,0.9)" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <p className="text-white/80 text-sm font-semibold mb-0.5">Dedicated recruitment consultant</p>
                <p className="text-white/35 text-xs leading-relaxed">A GPS consultant personally reviews every candidate before they reach your portal — human expertise behind every recommendation.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(2,128,144,0.3)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(168,213,209,0.9)" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
              </div>
              <div>
                <p className="text-white/80 text-sm font-semibold mb-0.5">Real-time market intelligence</p>
                <p className="text-white/35 text-xs leading-relaxed">Access GPS market commentary and salary benchmarks for your sector — insights that help you make faster, smarter hiring decisions.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(2,128,144,0.3)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(168,213,209,0.9)" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <p className="text-white/80 text-sm font-semibold mb-0.5">Seamless collaboration</p>
                <p className="text-white/35 text-xs leading-relaxed">Leave feedback, request interviews, and track progress — all in one place. No emails back and forth.</p>
              </div>
            </div>
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

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
            )}

            {mode === "login" && (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">Welcome back</h2>
                  <p className="text-sm text-gray-400">Sign in to your GPS client portal</p>
                </div>

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

                <button onClick={() => { setMode("reset_email"); setError("") }}
                  className="mt-5 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  Forgot your password?
                </button>
              </>
            )}

            {mode === "reset_email" && (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">Reset password</h2>
                  <p className="text-sm text-gray-400">We'll send a 6-digit code to your email.</p>
                </div>

                <form onSubmit={sendOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com" required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties} />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold tracking-wide transition-all disabled:opacity-60 hover:opacity-90 mt-2"
                    style={{ background: "linear-gradient(135deg, #028090, #025f6b)" }}>
                    {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Send code"}
                  </button>
                </form>

                <button onClick={backToLogin}
                  className="mt-5 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  Back to sign in
                </button>
              </>
            )}

            {mode === "reset_otp" && (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">Enter your code</h2>
                  <p className="text-sm text-gray-400">{info || "Check your inbox for a 6-digit code."}</p>
                </div>

                <form onSubmit={verifyOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">6-digit code</label>
                    <input type="text" inputMode="numeric" maxLength={6} value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="000000" required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg tracking-[0.5em] text-center text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties} />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold tracking-wide transition-all disabled:opacity-60 hover:opacity-90 mt-2"
                    style={{ background: "linear-gradient(135deg, #028090, #025f6b)" }}>
                    {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Verify code"}
                  </button>
                </form>

                <button onClick={() => { setMode("reset_email"); setError(""); setOtp("") }}
                  className="mt-5 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  Use a different email
                </button>
              </>
            )}

            {mode === "reset_newpassword" && (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">Set a new password</h2>
                  <p className="text-sm text-gray-400">Almost done — choose a new password.</p>
                </div>

                <form onSubmit={setNewPw} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New password</label>
                    <div className="relative">
                      <input type={showNew ? "text" : "password"} value={newPassword}
                        onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all pr-11"
                        style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties} />
                      <button type="button" onClick={() => setShowNew(!showNew)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirm password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password" required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties} />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold tracking-wide transition-all disabled:opacity-60 hover:opacity-90 mt-2"
                    style={{ background: "linear-gradient(135deg, #028090, #025f6b)" }}>
                    {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Update password"}
                  </button>
                </form>

                <button onClick={backToLogin}
                  className="mt-5 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  Back to sign in
                </button>
              </>
            )}
          </div>
          <p className="text-center text-white/20 text-xs mt-6">
            Need access? Contact your GPS recruiter.
          </p>
        </div>
      </div>
    </div>
  )
}
