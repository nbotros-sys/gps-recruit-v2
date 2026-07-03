"use client"

import { useState, useEffect } from "react"
import { getSignedFileUrl, parseStorageUrl } from "@/lib/secure-file"

const COLORS = [
  { bg: "#028090", text: "#ffffff" },
  { bg: "#3D5A4E", text: "#ffffff" },
  { bg: "#1d4ed8", text: "#ffffff" },
  { bg: "#7c3aed", text: "#ffffff" },
  { bg: "#b45309", text: "#ffffff" },
  { bg: "#be185d", text: "#ffffff" },
  { bg: "#0f766e", text: "#ffffff" },
  { bg: "#1e40af", text: "#ffffff" },
]

function getColor(name: string) {
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLORS.length
  return COLORS[idx]
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface Props {
  name: string
  avatarUrl?: string | null
  size?: number
  className?: string
}

export default function CandidateAvatar({ name, avatarUrl, size = 40, className = "" }: Props) {
  const color = getColor(name || "?")
  const initials = name ? getInitials(name) : "?"
  const fontSize = size < 32 ? size * 0.35 : size * 0.38

  // Buckets are private: resolve stored URLs to a fresh signed URL on demand.
  // While resolving (or if it fails), we show the initials monogram — so avatars
  // are never broken, just gracefully fall back.
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setResolvedUrl(null)
    setFailed(false)
    if (!avatarUrl) return
    // If it's a storage URL (public or sign), get a signed one; otherwise use as-is
    // (covers external avatars, e.g. LinkedIn, that aren't in our buckets).
    if (parseStorageUrl(avatarUrl)) {
      getSignedFileUrl(avatarUrl).then((u) => {
        if (active) { if (u) setResolvedUrl(u); else setFailed(true) }
      })
    } else {
      setResolvedUrl(avatarUrl)
    }
    return () => { active = false }
  }, [avatarUrl])

  const monogram = (
    <div
      className={className}
      style={{
        width: size, height: size,
        borderRadius: "50%",
        background: color.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: color.text,
        fontSize,
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  )

  if (!avatarUrl || failed || !resolvedUrl) {
    return monogram
  }

  return (
    <img
      src={resolvedUrl}
      alt={name}
      className={className}
      style={{
        width: size, height: size,
        borderRadius: "50%",
        objectFit: "cover",
        objectPosition: "center top",
        flexShrink: 0,
        border: "2px solid rgba(255,255,255,0.15)",
      }}
      onError={() => setFailed(true)}
    />
  )
}
