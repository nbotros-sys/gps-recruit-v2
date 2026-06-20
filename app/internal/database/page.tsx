"use client"
import { useState, useRef } from "react"
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle, Users, Zap, Brain } from "lucide-react"
import { createClient } from "@/lib/supabase"
import CandidateAvatar from "@/components/CandidateAvatar"

type ImportResult = {
  filename: string
  status: "pending" | "processing" | "done" | "error"
  name?: string
  title?: string
  summary?: string
  tags?: string[]
  avatar_url?: string | null
  error?: string
}

const BATCH_SIZE = 3

export default function DatabaseImportPage() {
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  async function processOne(file: File, idx: number): Promise<void> {
    updateResult(idx, { status: "processing" })
    try {
      // Extract CV text
      const formData = new FormData()
      formData.append("file", file)
      const extractRes = await fetch("/api/extract-cv", { method: "POST", body: formData })
      const extractData = await extractRes.json()
      const cvText = extractData.text || ""

      if (!cvText.trim()) {
        updateResult(idx, { status: "error", error: "Could not extract text" })
        return
      }

      // Build AI profile
      const profileRes = await fetch("/api/build-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText, filename: file.name })
      })
      const profile = await profileRes.json()
      if (profile.error) { updateResult(idx, { status: "error", error: profile.error }); return }

      // Check for existing candidate by email
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

      // Save original CV file via API route (server-side — avoids anon key storage permission issues)
      if (savedId) {
        try {
          const cvFileForm = new FormData()
          cvFileForm.append("file", file)
          cvFileForm.append("candidateId", savedId)
          await fetch("/api/upload-cv-file", { method: "POST", body: cvFileForm })
        } catch (e) { console.log("CV file upload failed:", e) }
      }

      // Fire-and-forget: extract structured profile then embed — does NOT block the import
      // Each CV is processed in the background after being saved
      if (savedId && cvText.trim()) {
        const capturedId = savedId
        const capturedText = cvText
        fetch("/api/extract-structured", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: capturedId, cv_text: capturedText })
        }).then(() => fetch("/api/generate-embedding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: capturedId, text: capturedText.slice(0, 8000) })
        })).catch(() => {})
      }

      // Extract photo from docx
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

    // Process in parallel batches of BATCH_SIZE
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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import CVs</h1>
        <p className="text-gray-400 text-sm mt-0.5">Bulk import CVs — AI extracts, summarises and tags every candidate. Processes {BATCH_SIZE} at a time.</p>
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
                  r.status === "processing" ? "border-teal/20 bg-teal/[0.02]" :
                  "border-gray-100 opacity-40"}`}>
                <div className="flex items-center gap-3">
                  {r.status === "done"
                    ? <CandidateAvatar name={r.name || r.filename} avatarUrl={r.avatar_url} size={36} />
                    : r.status === "error" ? <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
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
                      {r.status === "processing" && <span className="text-teal">Processing...</span>}
                      {r.status === "pending" && <span className="text-gray-300">Waiting...</span>}
                    </div>
                  </div>
                  {r.status === "error" && !running && (
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
  )
}
