import type { Metadata } from "next"
import "../globals.css"

export const metadata: Metadata = {
  title: "GPS Talent — Egypt's Intelligent Talent Network",
  description: "GPS connects professionals across Egypt with the right opportunities. AI-matched. Human-led.",
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#F4F8F7" }}>
      <header style={{ background: "#0a1f24" }} className="sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 h-18 flex items-center justify-between py-4">
          <a href="/jobs" className="flex items-center gap-3">
            <img src="/gps-logo.png" alt="GPS" className="w-10 h-10 object-contain" />
            <div>
              <div className="text-white font-bold text-base tracking-wide leading-tight">GPS</div>
              <div className="text-white/40 text-[10px] tracking-widest uppercase font-medium leading-tight">Talent Network</div>
            </div>
          </a>
          <nav className="flex items-center gap-8">
            <a href="/jobs" className="text-white/60 hover:text-white text-sm transition-colors font-medium">Open Roles</a>
            <a href="/join" className="text-white/60 hover:text-white text-sm transition-colors font-medium">Join Network</a>
            <a href="/login" className="text-white/60 hover:text-white text-sm transition-colors font-medium">My Applications</a>
            <a href="/join"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: "#028090", color: "white" }}>
              Upload CV
            </a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer style={{ background: "#0a1f24" }} className="mt-24">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="flex items-start justify-between mb-10">
            <div className="flex items-center gap-3">
              <img src="/gps-logo.png" alt="GPS" className="w-10 h-10 object-contain" />
              <div>
                <div className="text-white font-bold text-base">GPS</div>
                <div className="text-white/40 text-xs">Your Trusted HR Partner</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-16 gap-y-2 text-sm">
              <a href="/jobs" className="text-white/50 hover:text-white transition-colors">Open Roles</a>
              <a href="/join" className="text-white/50 hover:text-white transition-colors">Join Network</a>
              <a href="/login" className="text-white/50 hover:text-white transition-colors">My Applications</a>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex items-center justify-between">
            <p className="text-white/30 text-xs">© 2026 GPS — Your Trusted HR Partner. Egypt.</p>
            <p className="text-white/20 text-xs">Powered by GPS Talent · AI-Matched Recruitment</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
