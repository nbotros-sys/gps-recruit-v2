"use client"
import { useState, useEffect, Suspense } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react"
import Image from "next/image"

export default function UpdatePasswordWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #091f23 0%, #0d2b30 50%, #0a2428 100%)" }}>
        <Loader2 size={24} className="animate-spin text-white opacity-30" />
      </div>
    }>
      <UpdatePasswordPage />
    </Suspense>
  )
}

function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setSessionReady(true); setChecking(false) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) {
        setSessionReady(true)
        setChecking(false)
      }
    })
    const timeout = setTimeout(() => setChecking(false), 8000)
    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError("Password must be at least 8 characters."); return }
    if (password !== confirm) { setError("Passwords do not match."); return }
    setLoading(true)
    setError("")
    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) { setError("Could not update password. Please try again."); setLoading(false); return }
    setDone(true)
    const { data: __staffRow } = await supabase.from("staff_users").select("id").limit(1)
    const __dest = (__staffRow && __staffRow.length > 0) ? "/internal/dashboard" : "/account"
    setTimeout(() => { window.location.href = __dest }, 2000)
    setLoading(false)
  }

  return (
    <div className="min-h-screen w-full flex"
      style={{ background: "linear-gradient(135deg, #091f23 0%, #0d2b30 50%, #0a2428 100%)" }}>
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <svg viewBox="0 0 500 500" className="w-full h-full">
            <polygon points="250,30 450,145 450,355 250,470 50,355 50,145" fill="none" stroke="white" strokeWidth="1"/>
            <polygon points="250,80 410,170 410,330 250,420 90,330 90,170" fill="none" stroke="white" strokeWidth="1"/>
          </svg>
        </div>
        <div className="relative z-10 text-center max-w-sm">
          <div className="relative w-28 h-28 mx-auto mb-8">
            <Image src="/gps-logo.png" alt="GPS Recruitment" fill className="object-contain" />
          </div>
          <h1 className="text-white text-3xl font-light tracking-wide mb-3">GPS Recruitment</h1>
          <p className="text-white/40 text-sm tracking-widest uppercase font-medium">Internal Platform</p>
        </div>
        <p className="absolute bottom-8 text-white/15 text-xs">© {new Date().getFullYear()} GPS Recruitment</p>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8"
        style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="w-full max-w-sm">
          <div className="rounded-2xl p-8"
            style={{ background: "rgba(255,255,255,0.97)", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>

            {done ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "rgba(2,128,144,0.1)" }}>
                  <CheckCircle size={28} style={{ color: "#028090" }} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Password updated</h2>
                <p className="text-sm text-gray-400">Taking you to the dashboard...</p>
              </div>
            ) : checking ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={22} className="animate-spin text-teal" />
                <p className="text-sm text-gray-400">Verifying your reset link...</p>
              </div>
            ) : !sessionReady ? (
              <div className="text-center py-6">
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 leading-relaxed">
                  This reset link has expired.<br />
                  Go to the <a href="/internal/login" className="underline">login page</a> and request a new one.
                </div>
              </div>
            ) : (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">Set new password</h2>
                  <p className="text-sm text-gray-400">Choose a strong password for your account.</p>
                </div>
                {error && (
                  <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
                )}
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} value={password}
                        onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all pr-11"
                        style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirm password</label>
                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat password" required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties} />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold tracking-wide transition-all disabled:opacity-60 hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #028090, #025f6b)" }}>
                    {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Update password"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
