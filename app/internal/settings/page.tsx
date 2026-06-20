"use client"
import { useState } from "react"
import { Loader2, Database, Zap, Sparkles } from "lucide-react"

export default function SettingsPage() {
  const [embedding, setEmbedding] = useState(false)
  const [embedResult, setEmbedResult] = useState<any>(null)
  const [extractingStructured, setExtractingStructured] = useState(false)
  const [structuredResult, setStructuredResult] = useState<any>(null)

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

  async function runExtractStructured() {
    setExtractingStructured(true)
    setStructuredResult(null)
    try {
      const res = await fetch("/api/bulk-extract-structured", { method: "POST" })
      const data = await res.json()
      setStructuredResult(data)
    } catch {
      setStructuredResult({ error: "Failed" })
    }
    setExtractingStructured(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Platform configuration and maintenance tools.</p>
      </div>

      {/* Extract Structured Profiles */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Extract Structured Profiles</h3>
            <p className="text-sm text-gray-500 mb-2 leading-relaxed">
              AI reads each candidate's full CV and extracts a rich structured profile — real responsibilities, skills (explicit and implied), certifications, seniority signals, career trajectory and more. Powers intelligent talent pool matching.
            </p>
            <p className="text-xs text-gray-400 mb-4">Run before generating embeddings. Safe to run anytime — skips candidates already processed.</p>

            {structuredResult && (
              <div className={`rounded-xl p-4 mb-4 text-sm ${structuredResult.error ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                {structuredResult.error
                  ? <p>Error: {structuredResult.error}</p>
                  : <p className="font-semibold">✓ {structuredResult.processed} profiles extracted · {structuredResult.skipped} already done · {structuredResult.failed} failed</p>}
              </div>
            )}

            <button onClick={runExtractStructured} disabled={extractingStructured} className="btn-primary flex items-center gap-2">
              {extractingStructured
                ? <><Loader2 size={14} className="animate-spin" /> Extracting profiles…</>
                : <><Sparkles size={14} /> Extract structured profiles</>}
            </button>
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
            <p className="text-sm text-gray-500 mb-2 leading-relaxed">
              Converts each candidate's structured profile into a semantic vector. Powers the AI search and talent pool matching — finding candidates by what they actually do, not just keywords.
            </p>
            <p className="text-xs text-gray-400 mb-4">Run after extracting structured profiles. Safe to run anytime — only processes candidates without embeddings.</p>

            {embedResult && (
              <div className={`rounded-xl p-4 mb-4 text-sm ${embedResult.error ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                {embedResult.error
                  ? <p>Error: {embedResult.error}</p>
                  : <div>
                      <p className="font-semibold mb-1">
                        {embedResult.message || `✓ ${embedResult.processed} candidates embedded · ${embedResult.failed} failed`}
                      </p>
                      {embedResult.processed === 0 && (
                        <p className="text-green-600 text-xs">All candidates already have embeddings.</p>
                      )}
                    </div>}
              </div>
            )}

            <button onClick={runBulkEmbed} disabled={embedding} className="btn-primary flex items-center gap-2">
              {embedding
                ? <><Loader2 size={14} className="animate-spin" /> Generating embeddings…</>
                : <><Zap size={14} /> Generate embeddings</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
