"use client"
import { useState, useRef } from "react"
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle, Users, Zap, Brain } from "lucide-react"
import { createClient } from "@/lib/supabase"

type ImportResult = {
  filename: string
  status: "pending" | "extracting" | "profiling" | "saving" | "done" | "error"
  name?: string
  title?: string
  summary?: string
  tags?: string[]
  error?: string
}

export default function DatabaseImportPage() {
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
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

  async function runImport() {
    if (!files.length) return
    setRunning(true)
    setCurrentIdx(0)

    const initial: ImportResult[] = files.map(f => ({ filename: f.name, status: "pending" }))
    setResults(initial)

    for (let i = 0; i < files.length; i++) {
      setCurrentIdx(i)

      try {
        // Step 1: Extract text
        updateResult(i, { status: "extracting" })
        const formData = new FormData()
        formData.append("file", files[i])
        const extractRes = await fetch("/api/extract-cv", { method: "POST", body: formData })
        const extractData = await extractRes.json()
        const cvText = extractData.text || ""

        if (!cvText.trim()) {
          updateResult(i, { status: "error", error: "Could not extract text from this file" })
          continue
        }

        // Step 2: Build AI profile
        updateResult(i, { status: "profiling" })
        const profileRes = await fetch("/api/build-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cv_text: cvText, filename: files[i].name })
        })
        const profile = await profileRes.json()

        if (profile.error) {
          updateResult(i, { status: "error", error: profile.error })
          continue
        }

        // Step 3: Save to database
        updateResult(i, { status: "saving" })

        // Check if candidate with same email already exists
        let existingId = null
        if (profile.email) {
          const { data: existing } = await supabase
            .from("candidates")
            .select("id")
            .eq("email", profile.email)
            .single()
          if (existing) existingId = existing.id
        }

        const candidateData = {
          name: profile.name,
          email: profile.email || `import.${Date.now()}.${i}@pending.com`,
          phone: profile.phone,
          current_title: profile.current_title,
          current_company: profile.current_company,
          location: profile.location,
          cv_text: cvText,
          tags: profile.tags || [],
          source: "direct",
          notes: profile.summary ? `AI Summary: ${profile.summary}` : "",
          updated_at: new Date().toISOString(),
        }

        let savedId = existingId
        if (existingId) {
          await supabase.from("candidates").update(candidateData).eq("id", existingId)
        } else {
          const { data: inserted } = await supabase.from("candidates").insert([candidateData]).select("id").single()
          if (inserted) savedId = inserted.id
        }

        // Attempt photo extraction from docx
        if (savedId && files[i].name.match(/\.docx?$/i)) {
          try {
            const photoForm = new FormData()
            photoForm.append("file", files[i])
            photoForm.append("candidateId", savedId)
            await fetch("/api/extract-photo", { method: "POST", body: photoForm })
          } catch (e) { console.log("No photo found") }
        }

        updateResult(i, {
          status: "done",
          name: profile.name,
          title: profile.current_title,
          summary: profile.summary,
          tags: profile.tags,
        })

      } catch (err) {
        updateResult(i, { status: "error", error: "Unexpected error — try again" })
      }
    }

    setRunning(false)
  }

  const done = results.filter(r => r.status === "done").length
  const errors = results.filter(r => r.status === "error").length
  const inProgress = results.filter(r => ["extracting", "profiling", "saving"].includes(r.status)).length

  const statusIcon = (r: ImportResult) => {
    if (r.status === "done") return <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
    if (r.status === "error") return <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
    if (r.status === "extracting") return <Loader2 size={15} className="animate-spin text-blue-400 flex-shrink-0" />
    if (r.status === "profiling") return <Loader2 size={15} className="animate-spin text-teal flex-shrink-0" />
    if (r.status === "saving") return <Loader2 size={15} className="animate-spin text-purple-400 flex-shrink-0" />
    return <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 flex-shrink-0" />
  }

  const statusLabel = (r: ImportResult) => {
    if (r.status === "done") return <span className="text-xs text-green-600">Saved</span>
    if (r.status === "error") return <span className="text-xs text-red-400">{r.error}</span>
    if (r.status === "extracting") return <span className="text-xs text-blue-400">Reading file...</span>
    if (r.status === "profiling") return <span className="text-xs text-teal">AI building profile...</span>
    if (r.status === "saving") return <span className="text-xs text-purple-400">Saving to database...</span>
    return <span className="text-xs text-gray-300">Waiting...</span>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Database Import</h1>
        <p className="text-gray-400 text-sm mt-0.5">Bulk import CVs — AI extracts, summarises, and tags every candidate automatically.</p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Upload, label: "Upload CVs", desc: "PDF, Word or text — any size batch", color: "bg-blue-50 text-blue-600" },
          { icon: Brain, label: "AI profiles each one", desc: "Extracts details, writes summary, auto-tags function/seniority/industry/skills", color: "bg-teal/10 text-teal" },
          { icon: Users, label: "Lands in your database", desc: "Fully searchable, ready to match against any mandate", color: "bg-purple-50 text-purple-600" },
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

      {/* Drop zone — always visible */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
        onClick={() => !running && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all
          ${dragOver ? "border-teal bg-teal/5 scale-[1.01]" : "border-gray-200 hover:border-teal/40 hover:bg-gray-50"}
          ${running ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileSelect} className="hidden" />
        <div className="w-14 h-14 rounded-2xl bg-teal/10 flex items-center justify-center mx-auto mb-4">
          <Upload size={24} className="text-teal" />
        </div>
        <p className="text-gray-700 font-semibold text-base">Drop all your CVs here</p>
        <p className="text-gray-400 text-sm mt-1">or click to browse — select as many as you like</p>
        <p className="text-gray-300 text-xs mt-2">PDF, Word (.docx), TXT · No limit on number of files</p>
      </div>

      {/* File queue + run button */}
      {files.length > 0 && results.length === 0 && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-900">{files.length} CV{files.length > 1 ? "s" : ""} ready to import</span>
              <p className="text-xs text-gray-400 mt-0.5">
                Estimated time: ~{Math.ceil(files.length * 12 / 60)} minute{Math.ceil(files.length * 12 / 60) > 1 ? "s" : ""}
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
                  className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <button onClick={runImport}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base">
            <Zap size={16} /> Import & Profile {files.length} CV{files.length > 1 ? "s" : ""}
          </button>
        </div>
      )}

      {/* Live progress */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          {running && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Processing {currentIdx + 1} of {files.length}...
                </span>
                <span className="text-xs text-gray-400">{done} saved · {errors} failed</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(((done + errors) / files.length) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Completion summary */}
          {!running && results.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{results.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Total processed</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-teal">{done}</div>
                <div className="text-xs text-gray-500 mt-0.5">Added to database</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{errors}</div>
                <div className="text-xs text-gray-500 mt-0.5">Failed</div>
              </div>
            </div>
          )}

          {/* Import again button */}
          {!running && (
            <div className="flex gap-3">
              <button onClick={() => { setResults([]); setFiles([]) }}
                className="btn-primary flex items-center gap-2">
                <Upload size={14} /> Import more CVs
              </button>
              <a href="/internal/candidates" className="btn-secondary flex items-center gap-2">
                <Users size={14} /> View all candidates
              </a>
            </div>
          )}

          {/* Per-file results */}
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`bg-white rounded-2xl border p-4 transition-all
                ${r.status === "done" ? "border-gray-100 shadow-sm" :
                  r.status === "error" ? "border-red-100 bg-red-50/30" :
                  ["extracting","profiling","saving"].includes(r.status) ? "border-teal/20 bg-teal/[0.02]" :
                  "border-gray-100 opacity-50"}`}>
                <div className="flex items-center gap-3">
                  {statusIcon(r)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {r.name || r.filename}
                      </span>
                      {r.title && <span className="text-xs text-gray-400 truncate">{r.title}</span>}
                    </div>
                    <div className="mt-0.5">{statusLabel(r)}</div>
                  </div>
                  <div className="text-xs text-gray-300 flex-shrink-0 truncate max-w-[120px]">{r.filename}</div>
                </div>

                {r.status === "done" && r.summary && (
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed pl-6">{r.summary}</p>
                )}

                {r.status === "done" && r.tags && r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 pl-6">
                    {r.tags.slice(0, 6).map((tag, j) => (
                      <span key={j} className="badge bg-teal/10 text-teal text-xs">{tag}</span>
                    ))}
                    {r.tags.length > 6 && (
                      <span className="text-xs text-gray-400">+{r.tags.length - 6} more</span>
                    )}
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
