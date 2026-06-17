import type { Metadata } from "next"
import "../globals.css"

export const metadata: Metadata = {
  title: "GPS Talent",
  description: "Join Egypt's most intelligent talent network",
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#F4F8F7" }}>
      {/* Nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #028090, #3D5A4E)" }}>G</div>
            <div>
              <span className="font-bold text-gray-900 text-sm">GPS</span>
              <span className="text-gray-400 text-sm"> Talent</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/jobs" className="text-sm text-gray-500 hover:text-teal transition-colors">Open Roles</a>
            <a href="/join" className="btn-primary text-sm">Join Network</a>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-gray-200 mt-20">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="text-sm text-gray-400">© 2026 GPS — Your Trusted HR Partner</div>
          <div className="text-xs text-gray-300">Powered by GPS Talent Network</div>
        </div>
      </footer>
    </div>
  )
}
