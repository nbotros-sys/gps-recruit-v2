"use client"

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
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
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

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
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
        onError={e => {
          // Fallback to monogram if image fails
          const target = e.currentTarget
          target.style.display = "none"
          const parent = target.parentElement
          if (parent) {
            const mono = document.createElement("div")
            mono.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color.bg};display:flex;align-items:center;justify-content:center;color:${color.text};font-size:${fontSize}px;font-weight:700;flex-shrink:0;`
            mono.textContent = initials
            parent.appendChild(mono)
          }
        }}
      />
    )
  }

  return (
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
        fontSize: fontSize,
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  )
}
