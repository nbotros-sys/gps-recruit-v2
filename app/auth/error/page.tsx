"use client"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"

function ErrorContent() {
  const params = useSearchParams()
  const error = params.get("error") || ""

  const isExpired = error.includes("expired") || error.includes("invalid")

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0d2b30" }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
        <div className="text-4xl">🔗</div>
        <h2 className="font-bold text-gray-900 text-xl">
          {isExpired ? "Link expired" : "Something went wrong"}
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          {isExpired
            ? "This sign-in link has expired or already been used. Magic links are valid for 1 hour."
            : "There was a problem with your sign-in link."}
        </p>
        <p className="text-gray-400 text-sm">Request a new link below — it only takes a second.</p>
        <Link href="/login"
          className="block w-full py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: "#028090" }}>
          Get a new sign-in link
        </Link>
        <Link href="/jobs"
          className="block text-sm text-gray-400 hover:text-gray-600 transition-colors">
          Back to GPS Talent
        </Link>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: "#0d2b30" }}><div className="text-white">Loading...</div></div>}>
      <ErrorContent />
    </Suspense>
  )
}
