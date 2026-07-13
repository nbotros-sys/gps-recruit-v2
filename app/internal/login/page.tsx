"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

type Mode = "login" | "reset_email" | "reset_otp" | "reset_newpassword"

export default function InternalLogin() {
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
    window.location.href = "/internal/dashboard"
  }

  const backToLogin = () => {
    setMode("login"); setError(""); setInfo(""); setOtp("")
    setNewPassword(""); setConfirmPassword("")
  }

  return (
    <div
      className="min-h-screen w-full flex"
      style={{
        background: "linear-gradient(135deg, #091f23 0%, #0d2b30 50%, #0a2428 100%)",
      }}
    >
      {/* Left decorative panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <svg viewBox="0 0 500 500" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <polygon points="250,30 450,145 450,355 250,470 50,355 50,145" fill="none" stroke="white" strokeWidth="1"/>
            <polygon points="250,80 410,170 410,330 250,420 90,330 90,170" fill="none" stroke="white" strokeWidth="1"/>
            <polygon points="250,130 370,195 370,305 250,370 130,305 130,195" fill="none" stroke="white" strokeWidth="1"/>
          </svg>
        </div>

        <div className="relative z-10 text-center max-w-sm">
          <div className="relative w-28 h-28 mx-auto mb-8">
            <Image src="/gps-logo.png" alt="GPS Recruitment" fill className="object-contain" />
          </div>
          <h1 className="text-white text-3xl font-light tracking-wide mb-3">GPS Recruitment</h1>
          <p className="text-white/40 text-sm tracking-widest uppercase font-medium mb-12">Your Trusted HR Partner</p>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/30 text-sm">
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span>AI-powered talent matching</span>
            </div>
            <div className="flex items-center gap-3 text-white/30 text-sm">
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span>Executive search & placement</span>
            </div>
            <div className="flex items-center gap-3 text-white/30 text-sm">
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span>MENA market specialists</span>
            </div>
          </div>
        </div>

        <p className="absolute bottom-8 text-white/15 text-xs">
          © {new Date().getFullYear()} GPS Recruitment · Internal Access Only
        </p>
      </div>

      {/* Right login panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8"
        style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(0px)" }}>
        <div className="w-full max-w-sm">

          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="relative w-20 h-20 mb-4">
              <Image src="/gps-logo.png" alt="GPS Recruitment" fill className="object-contain" />
            </div>
            <p className="text-white/35 text-[10px] tracking-widest uppercase font-medium">Internal Platform</p>
          </div>

          <div
            className="rounded-2xl p-8"
            style={{
              background: "rgba(255,255,255,0.97)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {mode === "login" && (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">Welcome back</h2>
                  <p className="text-sm text-gray-400">Sign in to the GPS internal platform</p>
                </div>

                <form onSubmit={login} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all pr-11"
                        style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold tracking-wide transition-all disabled:opacity-60 hover:opacity-90 active:scale-[0.99] mt-2"
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
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties}
                    />
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
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg tracking-[0.5em] text-center text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties}
                    />
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
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all pr-11"
                        style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties}
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirm password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties}
                    />
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
        </div>
      </div>
    </div>
  )
}
