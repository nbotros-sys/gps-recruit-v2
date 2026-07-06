"use client"
import { useState, useEffect, Suspense } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react"
import Image from "next/image"

export default function AcceptInvitePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #091f23 0%, #0d2b30 50%, #0a2428 100%)" }}>
        <Loader2 size={24} className="animate-spin text-white opacity-30" />
      </div>
    }>
      <AcceptInvitePage />
    </Suspense>
  )
}

function AcceptInvitePage() {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [email, setEmail] = useState("")
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [pendingToken, setPendingToken] = useState<{ hash: string; type: string } | null>(null)
  const supabase = createClient()

  function applySession(session: any) {
    if (!session?.user) return
    setEmail(session.user.email || "")
    setName(session.user.user_metadata?.full_name || "")
    setSessionReady(true)
    setChecking(false)
  }

  // Verify the token ONLY when the human clicks Continue. Corporate email security
  // scanners (Microsoft Safe Links etc.) pre-open links — some in headless browsers
  // that run JS — and would consume the single-use token on page load, making every
  // link look "expired". Scanners don't click buttons, so gating on a click keeps the
  // token intact until the real person arrives.
  async function verifyToken() {
    if (!pendingToken) return
    setChecking(true)
    setError("")
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: pendingToken.hash,
      type: pendingToken.type as any,
    })
    if (!error && data?.session?.user) {
      setPendingToken(null)
      applySession(data.session)
    } else {
      setPendingToken(null)
      setError("This invitation link is invalid or has expired. Please ask your admin to send you a new invite.")
      setChecking(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      const params = new URLSearchParams(window.location.search)
      const token_hash = params.get("token_hash")
      const type = params.get("type") || "invite"

      // If the link carries a token, stash it and wait for a click (see verifyToken).
      if (token_hash) {
        if (!cancelled) { setPendingToken({ hash: token_hash, type }); setChecking(false) }
        return
      }

      // No token — fall back to an existing session if there is one.
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session?.user) { applySession(session); return }
      setChecking(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        applySession(session)
      }
    })

    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Please enter your full name."); return }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return }
    if (password !== confirm) { setError("Passwords do not match."); return }
    setLoading(true)
    setError("")

    const { error: authError } = await supabase.auth.updateUser({
      password,
      data: { full_name: name, password_set: true },
    })

    if (authError) {
      setError("Could not set password. Please try again or contact your admin.")
      setLoading(false)
      return
    }

    try {
      await supabase.from("staff_users").update({ full_name: name }).eq("email", email)
    } catch {}

    setDone(true)
    setTimeout(() => { window.location.href = "/internal/dashboard" }, 2000)
    setLoading(false)
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
          <div className="relative w-28 h-28 mx-auto mb-8">
            <Image src="/gps-logo.png" alt="GPS Recruitment" fill className="object-contain" />
          </div>
          <h1 className="text-white text-3xl font-light tracking-wide mb-3">Welcome to GPS</h1>
          <p className="text-white/40 text-sm tracking-widest uppercase font-medium mb-10">Internal Platform</p>
          <div className="space-y-4">
            {["Confirm your name and set a password", "You'll be taken straight to the platform", "Keep your password safe"].map(t => (
              <div key={t} className="flex items-center gap-3 text-white/30 text-sm">
                <div className="w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="absolute bottom-8 text-white/15 text-xs">
          © {new Date().getFullYear()} GPS Recruitment · Internal Access Only
        </p>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8"
        style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="w-full max-w-sm">

          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="relative w-20 h-20 mb-4">
              <Image src="/gps-logo.png" alt="GPS Recruitment" fill className="object-contain" />
            </div>
            <p className="text-white/35 text-[10px] tracking-widest uppercase font-medium">Welcome to GPS</p>
          </div>

          <div className="rounded-2xl p-8"
            style={{ background: "rgba(255,255,255,0.97)", boxShadow: "0 32px 80px rgba(0,0,0,0.4)" }}>

            {done ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: "rgba(2,128,144,0.1)" }}>
                  <CheckCircle size={28} style={{ color: "#028090" }} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">You're all set!</h2>
                <p className="text-sm text-gray-400">Taking you to the dashboard...</p>
              </div>

            ) : checking ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={22} className="animate-spin text-teal" />
                <p className="text-sm text-gray-400">Verifying your invite...</p>
              </div>

            ) : pendingToken ? (
              <div className="text-center py-4 space-y-5">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">You've been invited</h2>
                  <p className="text-sm text-gray-400">Click below to set up your GPS account.</p>
                </div>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
                )}
                <button onClick={verifyToken}
                  className="w-full py-3 rounded-xl text-white text-sm font-semibold tracking-wide transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #028090, #025f6b)" }}>
                  Continue
                </button>
              </div>

            ) : !sessionReady ? (
              <div className="text-center py-6 space-y-4">
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 leading-relaxed">
                  This invite link has expired or already been used.<br />
                  Ask your admin to send a new invite from Settings → Team.
                </div>
              </div>

            ) : (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-1">Set up your account</h2>
                  <p className="text-sm text-gray-400">Confirm your details and choose a password.</p>
                </div>

                {error && (
                  <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                    {error}
                  </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                    <input type="email" value={email} readOnly
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Your full name" required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ "--tw-ring-color": "rgba(2,128,144,0.25)" } as React.CSSProperties} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
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
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold tracking-wide transition-all disabled:opacity-60 hover:opacity-90 mt-2"
                    style={{ background: "linear-gradient(135deg, #028090, #025f6b)" }}>
                    {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Complete setup"}
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
