"use client"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { Upload, X, Loader2, CheckCircle, ArrowLeft, FileText } from "lucide-react"

export default function CVPage() {
  const [candidate, setCandidate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = "/login"; return }
      const { data: cand } = await supabase.from("candidates").select("*").eq("email", user.email).single()
      if (cand) setCandidate(cand)
      setLoading(false)
    }
    load()
  }, [])

  async function updateCV() {
    if (!file || !candidate) return
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    const extractRes = await fetch("/api/extract-cv", { method: "POST", body: formData })
    const { text: cvText } = await extractRes.json()

    const profileRes = await fetch("/api/build-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cv_text: cvText || "", filename: file.name })
    })
    const profile = await profileRes.json()

    await supabase.from("candidates").update({
      cv_text: cvText || "",
      current_title: profile.current_title || candidate.current_title,
      current_company: profile.current_company || candidate.current_company,
      location: profile.location || candidate.location,
      tags: profile.tags || candidate.tags,
      notes: profile.summary || candidate.notes,
    }).eq("id", candidate.id)

    setCandidate({ ...candidate, cv_text: cvText })
    setUploaded(true)
    setFile(null)
    setUploading(false)
    setTimeout(() => setUploaded(false), 4000)
  }

  if (loading) return <div style={{ textAlign: "center", padding: "80px" }}><Loader2 size={24} className="animate-spin" style={{ color: "#028090" }} /></div>

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "48px 24px" }}>
      <a href="/account" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#888", fontSize: "13px", textDecoration: "none", marginBottom: "28px" }}>
        <ArrowLeft size={14} /> Back to my account
      </a>
      <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#111", marginBottom: "8px" }}>My CV</h1>
      <p style={{ color: "#888", fontSize: "14px", marginBottom: "32px" }}>Upload a new CV anytime — our AI will re-read it and update your profile automatically.</p>

      {/* Upload new CV */}
      <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "32px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111", marginBottom: "16px" }}>
          {candidate?.cv_text ? "Update your CV" : "Upload your CV"}
        </h2>

        {uploaded && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#e6f5f3", border: "1px solid #A8D5D1", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px" }}>
            <CheckCircle size={16} color="#028090" />
            <p style={{ fontSize: "13px", color: "#028090", fontWeight: 600, margin: 0 }}>CV updated and profile re-analysed by AI.</p>
          </div>
        )}

        {file ? (
          <div style={{ background: "#f0faf8", border: "1.5px solid #A8D5D1", borderRadius: "14px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <FileText size={18} color="#028090" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "#111" }}>{file.name}</div>
              <div style={{ fontSize: "12px", color: "#888" }}>{(file.size / 1024).toFixed(0)} KB</div>
            </div>
            <button onClick={() => setFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={16} /></button>
          </div>
        ) : (
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "36px", border: "2px dashed #d1e8e5", borderRadius: "16px", cursor: "pointer", background: "#fafffe", marginBottom: "16px" }}>
            <div style={{ width: "48px", height: "48px", background: "#e6f5f3", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Upload size={20} color="#028090" />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, color: "#111" }}>Upload new CV</div>
              <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>PDF or Word</div>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] || null)} />
          </label>
        )}

        <button onClick={updateCV} disabled={!file || uploading}
          style={{ width: "100%", padding: "13px", borderRadius: "12px", background: file ? "#028090" : "#d1d5db", color: "white", fontWeight: 800, fontSize: "14px", border: "none", cursor: file ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          {uploading ? <><Loader2 size={14} className="animate-spin" /> Analysing CV...</> : "Update CV"}
        </button>
      </div>

      {/* Current CV */}
      {candidate?.cv_text && (
        <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e8e8e8", padding: "32px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#111", marginBottom: "16px" }}>Current CV on file</h2>
          <pre style={{ fontSize: "13px", color: "#555", whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7, background: "#f9fafb", borderRadius: "12px", padding: "20px", maxHeight: "400px", overflowY: "auto", margin: 0 }}>
            {candidate.cv_text}
          </pre>
        </div>
      )}
    </div>
  )
}
