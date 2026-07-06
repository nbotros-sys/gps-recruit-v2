"use client"
import { useState, useRef } from "react"
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle, Users, Zap, Brain, Linkedin, Link2, UserPlus, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase"
import CandidateAvatar from "@/components/CandidateAvatar"

type ImportResult = {
  filename: string
  status: "pending" | "processing" | "done" | "error" | "held" | "rejected"
  name?: string
  candidateId?: string
  title?: string
  summary?: string
  tags?: string[]
  avatar_url?: string | null
  error?: string
}

type LinkedInResult = {
  status: "idle" | "loading" | "done" | "error" | "duplicate"
  name?: string
  title?: string
  company?: string
  location?: string
  avatar_url?: string | null
  tags?: string[]
  candidateId?: string
  error?: string
  duplicateReason?: string
}

const BATCH_SIZE = 3

export default function DatabaseImportPage() {
  // ── CV import state ────────────────────────────────────────────────────────
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── LinkedIn enrichment state ──────────────────────────────────────────────
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [linkedinResult, setLinkedinResult] = useState<LinkedInResult>({ status: "idle" })

  const supabase = createClient()

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.match(/\.(pdf|doc|docx|txt)$/i))
    setFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...dropped.filter(f => !names.has(f.name))] })
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    setFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...selected.filter(f => !names.has(f.name))] })
  }

  function updateResult(idx: number, update: Partial<ImportResult>) {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, ...update } : r))
  }

  async function rejectImport(idx: number) {
    const r = results[idx]
    if (!r) return
    if (r.candidateId) {
      try {
        await fetch("/api/delete-candidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: r.candidateId }),
        })
      } catch { /* leave as-is on failure */ }
    }
    updateResult(idx, { status: "rejected", error: undefined })
  }

  // ── LinkedIn enrichment handler ────────────────────────────────────────────
  async function enrichFromLinkedIn() {
    const url = linkedinUrl.trim()
    if (!url) return
    if (!url.includes("linkedin.com/in/")) {
      setLinkedinResult({ status: "error", error: "Please enter a valid LinkedIn profile URL (linkedin.com/in/...)" })
      return
    }

    setLinkedinResult({ status: "loading" })

    try {
      const res = await fetch("/api/enrich-from-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedin_url: url }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setLinkedinResult({ status: "error", error: data.error || "Enrichment failed" })
        return
      }

      if (data.isDuplicate) {
        setLinkedinResult({
          status: "duplicate",
          name: data.candidate.name,
          title: data.candidate.current_title,
          company: data.candidate.current_company,
          location: data.candidate.location,
          avatar_url: data.candidate.avatar_url,
          tags: data.candidate.tags,
          candidateId: data.candidateId,
          duplicateReason: data.duplicateReason,
        })
      } else {
        setLinkedinResult({
          status: "done",
          name: data.candidate.name,
          title: data.candidate.current_title,
          company: data.candidate.current_company,
          location: data.candidate.location,
          avatar_url: data.candidate.avatar_url,
          tags: data.candidate.tags,
          candidateId: data.candidateId,
        })
      }
    } catch (err) {
      setLinkedinResult({ status: "error", error: "Network error — please try again" })
    }
  }

  function resetLinkedIn() {
    setLinkedinUrl("")
    setLinkedinResult({ status: "idle" })
  }

  // ── CV import handler ──────────────────────────────────────────────────────
  async function processOne(file: File, idx: number): Promise<void> {
    updateResult(idx, { status: "processing" })
    try {
      const formData = new FormData()
      formData.append("file", file)
      const extractRes = await fetch("/api/extract-cv", { method: "POST", body: formData })
      const extractData = await extractRes.json()
      const cvText = extractData.text || ""

      if (!cvText.trim()) {
        updateResult(idx, { status: "error", error: "Could not extract text" })
        return
      }

      const profileRes = await fetch("/api/build-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText, filename: file.name })
      })
      const profile = await profileRes.json()
      if (profile.error) { updateResult(idx, { status: "error", error: profile.error }); return }

      // Readability gate — don't add garbled/corrupt/unidentifiable CVs to the database.
      if (profile.is_cv === false) {
        updateResult(idx, { status: "held", error: "Not imported — couldn't read a reliable CV (looks garbled or corrupt). Re-save as PDF/.docx and retry." })
        return
      }

      let existingId: string | null = null
      if (profile.email && !profile.email.includes("@pending.com")) {
        const { data: existing } = await supabase
          .from("candidates").select("id").eq("email", profile.email).single()
        if (existing) existingId = existing.id
      }

      const candidateData = {
        name: profile.name,
        email: profile.email || `import.${Date.now()}.${idx}@pending.com`,
        phone: profile.phone,
        current_title: profile.current_title,
        current_company: profile.current_company,
        location: profile.location,
        dob: profile.dob || null,
        cv_text: cvText,
        tags: profile.tags || [],
        source: "direct",
        notes: profile.summary || "",
        updated_at: new Date().toISOString(),
      }

      let savedId = existingId
      if (existingId) {
        await supabase.from("candidates").update(candidateData).eq("id", existingId)
      } else {
        const { data: inserted } = await supabase
          .from("candidates").insert([candidateData]).select("id").single()
        if (inserted) savedId = inserted.id
      }

      if (savedId) {
        try {
          const cvFileForm = new FormData()
          cvFileForm.append("file", file)
          cvFileForm.append("candidateId", savedId)
          await fetch("/api/upload-cv-file", { method: "POST", body: cvFileForm })
        } catch (e) { console.log("CV file upload failed:", e) }
      }

      if (savedId && cvText.trim()) {
        const capturedId = savedId
        const capturedText = cvText
        fetch("/api/extract-structured", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: capturedId, cv_text: capturedText })
        }).catch(() => {})
        fetch("/api/generate-embedding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: capturedId, text: capturedText.slice(0, 8000) })
        }).catch(() => {})
      }

      let avatar_url: string | null = null
      if (savedId && file.name.match(/\.docx?$/i)) {
        try {
          const photoForm = new FormData()
          photoForm.append("file", file)
          photoForm.append("candidateId", savedId)
          const photoRes = await fetch("/api/extract-photo", { method: "POST", body: photoForm })
          const photoData = await photoRes.json()
          avatar_url = photoData.avatar_url || null
        } catch (e) { console.log("No photo") }
      }

      updateResult(idx, {
        status: "done",
        candidateId: savedId || undefined,
        name: profile.name,
        title: profile.current_title,
        summary: profile.summary,
        tags: profile.tags,
        avatar_url,
      })

    } catch (err) {
      updateResult(idx, { status: "error", error: "Processing failed" })
    }
  }

  async function runImport() {
    if (!files.length) return
    setRunning(true)
    setProgress(0)

    const initial: ImportResult[] = files.map(f => ({ filename: f.name, status: "pending" }))
    setResults(initial)

    let done = 0
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE)
      const batchIndices = batch.map((_, j) => i + j)
      await Promise.all(batch.map((file, j) => processOne(file, batchIndices[j])))
      done += batch.length
      setProgress(Math.round((done / files.length) * 100))
    }

    setRunning(false)
  }

  const done = results.filter(r => r.status === "done").length
  const errors = results.filter(r => r.status === "error").length

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Candidates</h1>
        <p className="text-gray-400 text-sm mt-0.5">Bulk import CVs or enrich profiles directly from LinkedIn.</p>
      </div>

      {/* ── LinkedIn Enrichment Panel ───────────────────────────────────────── */}
      <div className="card p-6 border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Linkedin size={17} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base">Add from LinkedIn</h2>
            <p className="text-xs text-gray-400 mt-0.5">Paste a LinkedIn URL — Proxycurl fetches their full profile and saves it to your database</p>
          </div>
        </div>

        {/* Input row */}
        {linkedinResult.status === "idle" || linkedinResult.status === "error" ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Link2 size={14} className="text-gray-300 flex-shrink-0" />
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={e => setLinkedinUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && enrichFromLinkedIn()}
                  placeholder="https://linkedin.com/in/firstname-lastname"
                  className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-300"
                />
                {linkedinUrl && (
                  <button onClick={() => setLinkedinUrl("")} className="text-gray-300 hover:text-gray-500 transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>
              <button
                onClick={enrichFromLinkedIn}
                disabled={!linkedinUrl.trim()}
                className="btn-primary px-5 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <UserPlus size={14} /> Enrich
              </button>
            </div>
            {linkedinResult.status === "error" && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-600">{linkedinResult.error}</p>
              </div>
            )}
          </div>
        ) : linkedinResult.status === "loading" ? (
          <div className="flex items-center gap-3 py-4 px-4 bg-white border border-gray-100 rounded-xl">
            <Loader2 size={16} className="animate-spin text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Fetching LinkedIn profile...</p>
              <p className="text-xs text-gray-400 mt-0.5">Proxycurl is looking up the profile — usually takes a few seconds</p>
            </div>
          </div>
        ) : linkedinResult.status === "done" || linkedinResult.status === "duplicate" ? (
          <div className={`rounded-xl border p-4 ${linkedinResult.status === "duplicate" ? "border-amber-200 bg-amber-50/50" : "border-green-100 bg-green-50/40"}`}>
            <div className="flex items-start gap-3">
              <CandidateAvatar name={linkedinResult.name || "?"} avatarUrl={linkedinResult.avatar_url} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{linkedinResult.name}</span>
                  {linkedinResult.status === "duplicate" ? (
                    <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Already in database</span>
                  ) : (
                    <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={10} /> Saved
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {linkedinResult.title}{linkedinResult.company ? ` @ ${linkedinResult.company}` : ""}
                  {linkedinResult.location ? ` · ${linkedinResult.location}` : ""}
                </p>
                {linkedinResult.status === "duplicate" && linkedinResult.duplicateReason && (
                  <p className="text-xs text-amber-600 mt-1">{linkedinResult.duplicateReason} — profile refreshed with latest LinkedIn data</p>
                )}
                {linkedinResult.tags && linkedinResult.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {linkedinResult.tags.slice(0, 6).map((tag, i) => (
                      <span key={i} className="badge bg-blue-100 text-blue-700 text-xs">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5">
              <a
                href={`/internal/candidates/${linkedinResult.candidateId}`}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
              >
                View profile →
              </a>
              <span className="text-gray-200">·</span>
              <button
                onClick={resetLinkedIn}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={11} /> Add another
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── CV Bulk Import ─────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Bulk CV Import</h2>
          <p className="text-gray-400 text-sm mt-0.5">Upload CVs in bulk — AI extracts, summarises and tags every candidate. Processes {BATCH_SIZE} at a time.</p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Upload, label: "Upload CVs", desc: "PDF, Word or text — any size batch", color: "bg-blue-50 text-blue-600" },
            { icon: Brain, label: "AI profiles each one", desc: `Runs ${BATCH_SIZE} in parallel — extracts details, summary, tags and photo`, color: "bg-teal/10 text-teal" },
            { icon: Users, label: "Lands in database", desc: "Searchable, ready to match against mandates", color: "bg-purple-50 text-purple-600" },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="card p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={18} />
              </div>
              <div className="font-semibold text-gray-900 text-sm">{label}</div>
              <div className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => !running && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all
            ${dragOver ? "border-teal bg-teal/5 scale-[1.01]" : "border-gray-200 hover:border-teal/40 hover:bg-gray-50"}
            ${running ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileSelect} className="hidden" />
          <div className="w-14 h-14 rounded-2xl bg-teal/10 flex items-center justify-center mx-auto mb-4">
            <Upload size={24} className="text-teal" />
          </div>
          <p className="text-gray-700 font-semibold text-base">Drop all your CVs here</p>
          <p className="text-gray-400 text-sm mt-1">or click to browse — select as many as you like</p>
          <p className="text-gray-300 text-xs mt-2">PDF, Word (.docx), TXT · No limit · {BATCH_SIZE}x faster parallel processing</p>
        </div>

        {/* File queue */}
        {files.length > 0 && results.length === 0 && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-900">{files.length} CV{files.length > 1 ? "s" : ""} ready</span>
                <p className="text-xs text-gray-400 mt-0.5">
                  ~{Math.ceil(files.length * 12 / BATCH_SIZE / 60)} min with {BATCH_SIZE}x parallel processing
                </p>
              </div>
              <button onClick={() => setFiles([])} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg group">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={12} className="text-teal flex-shrink-0" />
                    <span className="text-xs text-gray-700 truncate">{f.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-2">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={runImport}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base">
              <Zap size={16} /> Import {files.length} CV{files.length > 1 ? "s" : ""} ({BATCH_SIZE} at a time)
            </button>
          </div>
        )}

        {/* Progress */}
        {results.length > 0 && (
          <div className="space-y-4">
            {running && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Processing...</span>
                  <span className="text-xs text-gray-400">{done} saved · {errors} failed</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{progress}% complete — running {BATCH_SIZE} in parallel</p>
              </div>
            )}

            {!running && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="card p-4 text-center"><div className="text-2xl font-bold text-gray-900">{results.length}</div><div className="text-xs text-gray-500 mt-0.5">Total</div></div>
                  <div className="card p-4 text-center"><div className="text-2xl font-bold text-teal">{done}</div><div className="text-xs text-gray-500 mt-0.5">Saved</div></div>
                  <div className="card p-4 text-center"><div className="text-2xl font-bold text-red-400">{errors}</div><div className="text-xs text-gray-500 mt-0.5">Failed</div></div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => { setResults([]); setFiles([]) }} className="btn-primary flex items-center gap-2">
                    <Upload size={14} /> Import more
                  </button>
                  {errors > 0 && (
                    <button onClick={() => {
                      const failedFiles = files.filter((_, i) => results[i]?.status === "error")
                      setFiles(failedFiles)
                      setResults([])
                      setProgress(0)
                    }} className="btn-secondary flex items-center gap-2 text-red-500 border-red-200">
                      <Zap size={14} /> Retry {errors} failed
                    </button>
                  )}
                  <a href="/internal/candidates" className="btn-secondary flex items-center gap-2">
                    <Users size={14} /> View candidates
                  </a>
                </div>
              </>
            )}

            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`bg-white rounded-2xl border p-4 transition-all
                  ${r.status === "done" ? "border-gray-100 shadow-sm" :
                    r.status === "error" ? "border-red-200 bg-red-50" :
                    r.status === "held" ? "border-amber-200 bg-amber-50" :
                    r.status === "rejected" ? "border-gray-100 opacity-50" :
                    r.status === "processing" ? "border-teal/20 bg-teal/[0.02]" :
                    "border-gray-100 opacity-40"}`}>
                  <div className="flex items-center gap-3">
                    {r.status === "done"
                      ? <CandidateAvatar name={r.name || r.filename} avatarUrl={r.avatar_url} size={36} />
                      : r.status === "error" ? <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                      : r.status === "held" ? <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
                      : r.status === "processing" ? <Loader2 size={15} className="animate-spin text-teal flex-shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm truncate ${r.status === "error" ? "text-red-700" : "text-gray-900"}`}>
                          {r.filename}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs">
                        {r.status === "done" && <span className="text-green-600">✓ Saved — {r.name}{r.title ? ` · ${r.title}` : ""}</span>}
                        {r.status === "error" && <span className="text-red-500 font-medium">Failed: {r.error}</span>}
                        {r.status === "held" && <span className="text-amber-600 font-medium">{r.error}</span>}
                        {r.status === "rejected" && <span className="text-gray-400">Not imported (rejected)</span>}
                        {r.status === "processing" && <span className="text-teal">Processing...</span>}
                        {r.status === "pending" && <span className="text-gray-300">Waiting...</span>}
                      </div>
                    </div>
                    {(r.status === "error" || r.status === "held") && !running && (
                      <button
                        onClick={() => {
                          const failedFile = files[i]
                          if (failedFile) {
                            updateResult(i, { status: "pending" })
                            processOne(failedFile, i)
                          }
                        }}
                        className="flex-shrink-0 text-xs font-semibold text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        Retry
                      </button>
                    )}
                    {r.status === "done" && !running && (
                      <button
                        onClick={() => rejectImport(i)}
                        title="Remove this candidate from the database"
                        className="flex-shrink-0 text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
                        Don't import
                      </button>
                    )}
                  </div>
                  {r.status === "done" && r.summary && (
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed pl-12">{r.summary}</p>
                  )}
                  {r.status === "done" && r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pl-12">
                      {r.tags.slice(0, 5).map((tag, j) => (
                        <span key={j} className="badge bg-teal/10 text-teal text-xs">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
