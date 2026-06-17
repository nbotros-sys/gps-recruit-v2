"use client"
import Link from "next/link"

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d2b30" }}>
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="font-bold text-gray-900 text-xl">Link expired</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          This link has expired or already been used. Please request a new one.
        </p>
        <Link href="/internal/login"
          className="block w-full py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: "#028090" }}>
          Back to login
        </Link>
      </div>
    </div>
  )
}
