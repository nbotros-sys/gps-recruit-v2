"use client"
import { useState } from "react"
import { Loader2, CheckCircle, Database, Zap } from "lucide-react"

export default function SettingsPage() {
  const [embedding, setEmbedding] = useState(false)
  const [embedResult, setEmbedResult] = useState<any>(null)

  async function runBulkEmbed() {
    setEmbedding(true)
    setEmbedResult(null)
    try {
      const res = await fetch("/api/bulk-embed", { method: "POST" })
      const data = await res.json()
      setEmbedResult(data)
    } catch (err) {
      setEmbedResult({ error: "Failed" })
    }
    setEmbedding(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Platform configuration and maintenance tools.</p>
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

            <button onClick={runBulkEmbed} disabled={embedding}
              className="btn-primary flex items-center gap-2">
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
