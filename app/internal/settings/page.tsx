"use client"
import { useState, useRef } from "react"
import { Loader2, CheckCircle, Database, Zap, Camera, Upload, X, Image } from "lucide-react"

type PhotoResult = {
  filename: string
  candidateName?: string
  status: "pending" | "matched" | "extracted" | "no_photo" | "no_match" | "error"
  avatar_url?: string
  error?: string
}

export default function SettingsPage() {
  const [embedding, setEmbedding] = useState(false)
  const [embedResult, setEmbedResult] = useState<any>(null)

  // Bulk photo extraction state
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoResults, setPhotoResults] = useState<PhotoResult[]>([])
  const [extractingPhotos, setExtractingPhotos] = useState(false)
  const [photosDone, setPhotosDone] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  async function runBulkEmbed() {
    setEmbedding(true)
    setEmbedResult(null)
    try {
      const res = await fetch("/api/bulk-embed", { method: "POST" })
      const data = await res.json()
      setEmbedResult(data)
    } catch {
      setEmbedResult({ error: "Failed" })
    }
    setEmbedding(false)
  }

  function addPhotoFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || []).filter(f => f.name.match(/\.docx?$/i))
    setPhotoFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...newFiles.filter(f => !existing.has(f.name))]
    })
    setPhotoResults([])
    setPhotosDone(false)
    e.target.value = ""
  }

  function removePhotoFile(name: string) {
    setPhotoFiles(prev => prev.filter(f => f.name !== name))
  }

  async function runBulkPhotoExtract() {
    if (!photoFiles.length) return
    setExtractingPhotos(true)
    setPhotosDone(false)

    // First, get all candidates so we can match by filename / name
    const res = await fetch("/api/find-candidate-by-name", { method: "GET" })
    const { candidates } = await res.json()

    const results: PhotoResult[] = photoFiles.map(f => ({ filename: f.name, status: "pending" as const }))
    setPhotoResults([...results])

    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i]
      // Match filename to candidate — strip extension, normalise
      const baseName = file.name.replace(/\.docx?$/i, "").toLowerCase().replace(/[-_]/g, " ").trim()
      const matched = candidates?.find((c: any) => {
        const cname = (c.name || "").toLowerCase().trim()
        return cname === baseName ||
          cname.includes(baseName) ||
          baseName.includes(cname) ||
          // Match first+last word
          (cname.split(" ")[0] === baseName.split(" ")[0] && cname.split(" ").slice(-1)[0] === baseName.split(" ").slice(-1)[0])
      })

      if (!matched) {
        results[i] = { ...results[i], status: "no_match" }
        setPhotoResults([...results])
        continue
      }

      results[i] = { ...results[i], status: "matched", candidateName: matched.name }
      setPhotoResults([...results])

      try {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("candidateId", matched.id)
        const photoRes = await fetch("/api/extract-photo", { method: "POST", body: fd })
        const photoData = await photoRes.json()

        if (photoData.avatar_url) {
          results[i] = { ...results[i], status: "extracted", avatar_url: photoData.avatar_url }
        } else {
          results[i] = { ...results[i], status: "no_photo" }
        }
      } catch (err: any) {
        results[i] = { ...results[i], status: "error", error: err?.message }
      }
      setPhotoResults([...results])
    }

    setExtractingPhotos(false)
    setPhotosDone(true)
  }

  const photoSummary = {
    extracted: photoResults.filter(r => r.status === "extracted").length,
    noPhoto: photoResults.filter(r => r.status === "no_photo").length,
    noMatch: photoResults.filter(r => r.status === "no_match").length,
    error: photoResults.filter(r => r.status === "error").length,
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Platform configuration and maintenance tools.</p>
      </div>

      {/* Bulk Photo Extraction */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
            <Camera size={18} className="text-teal" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Bulk Photo Extraction</h3>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Upload the original Word (.docx) CVs for candidates already in the database. GPS will match each file to a candidate by name and extract their embedded photo automatically.
            </p>

            {/* Drop zone */}
            <div
              onClick={() => photoInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-teal/40 hover:bg-teal/5 transition-all mb-4"
            >
              <Upload size={24} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Drop .docx files here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Matches candidates by filename — use their full name as the filename</p>
              <input ref={photoInputRef} type="file" multiple accept=".docx,.doc" className="hidden" onChange={addPhotoFiles} />
            </div>

            {/* File list */}
            {photoFiles.length > 0 && (
              <div className="space-y-2 mb-4">
                {photoFiles.map((f, i) => {
                  const result = photoResults[i]
                  return (
                    <div key={f.name} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                      <Image size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1 truncate">{f.name}</span>
                      {result && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          result.status === "extracted" ? "bg-green-100 text-green-700" :
                          result.status === "no_photo" ? "bg-amber-100 text-amber-700" :
                          result.status === "no_match" ? "bg-red-100 text-red-600" :
                          result.status === "matched" ? "bg-blue-100 text-blue-600" :
                          result.status === "error" ? "bg-red-100 text-red-600" :
                          "bg-gray-100 text-gray-500"
                        }`}>
                          {result.status === "extracted" ? `✓ ${result.candidateName}` :
                           result.status === "no_photo" ? "No photo in doc" :
                           result.status === "no_match" ? "No candidate match" :
                           result.status === "matched" ? `Matched: ${result.candidateName}` :
                           result.status === "error" ? "Error" : "Pending"}
                        </span>
                      )}
                      {!extractingPhotos && !photosDone && (
                        <button onClick={() => removePhotoFile(f.name)} className="text-gray-300 hover:text-red-400 flex-shrink-0">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Summary after run */}
            {photosDone && photoResults.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4 mb-4 text-sm">
                <p className="font-semibold text-green-700 mb-1">Extraction complete</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-green-600">✓ {photoSummary.extracted} photos extracted</span>
                  {photoSummary.noPhoto > 0 && <span className="text-amber-600">⚠ {photoSummary.noPhoto} no photo in doc</span>}
                  {photoSummary.noMatch > 0 && <span className="text-red-600">✗ {photoSummary.noMatch} no candidate match</span>}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={runBulkPhotoExtract}
                disabled={extractingPhotos || !photoFiles.length}
                className="btn-primary flex items-center gap-2 disabled:opacity-40"
              >
                {extractingPhotos
                  ? <><Loader2 size={14} className="animate-spin" /> Extracting photos...</>
                  : <><Camera size={14} /> Extract photos from {photoFiles.length || 0} file{photoFiles.length !== 1 ? "s" : ""}</>}
              </button>
              {photoFiles.length > 0 && !extractingPhotos && (
                <button onClick={() => { setPhotoFiles([]); setPhotoResults([]); setPhotosDone(false) }} className="btn-secondary text-sm">
                  Clear all
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Tip: name each file after the candidate — e.g. "Ahmed Hassan.docx" — for automatic matching.
            </p>
          </div>
        </div>
      </div>

      {/* Vector Embeddings */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Database size={18} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Vector Embeddings</h3>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Generate semantic search embeddings for all candidates. Run this after bulk importing CVs to enable accurate AI search across your full database.
            </p>

            {embedResult && (
              <div className={`rounded-xl p-4 mb-4 text-sm ${embedResult.error ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                {embedResult.error ? (
                  <p>Error: {embedResult.error}</p>
                ) : (
                  <div>
                    <p className="font-semibold mb-2">
                      {embedResult.message || `✓ ${embedResult.processed} candidates embedded · ${embedResult.failed} failed`}
                    </p>
                    {embedResult.processed === 0 && (
                      <p className="text-green-600">All candidates already have embeddings — search is ready.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <button onClick={runBulkEmbed} disabled={embedding} className="btn-primary flex items-center gap-2">
              {embedding
                ? <><Loader2 size={14} className="animate-spin" /> Generating embeddings...</>
                : <><Zap size={14} /> Generate embeddings for new candidates</>}
            </button>
            <p className="text-xs text-gray-400 mt-2">Safe to run anytime — only processes candidates without embeddings.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
