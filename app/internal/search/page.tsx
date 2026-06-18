"use client"
import { useState } from "react"
import { Search, Brain, Loader2, User, MapPin, Star, ChevronRight } from "lucide-react"
import Link from "next/link"

export default function DatabaseSearchPage() {
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [explanation, setExplanation] = useState("")
  const [searched, setSearched] = useState(false)

  const scoreColor = (s: number) => s >= 70 ? "#028090" : s >= 50 ? "#d97706" : "#9ca3af"

  async function search() {
    if (!query.trim()) return
    setSearching(true); setResults([]); setExplanation(""); setSearched(false)

    try {
      const res = await fetch("/api/search-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      console.log("Search API response:", JSON.stringify(data))
      setExplanation(data.explanation || "")
      setResults(data.results || data.matches || [])
      setSearched(true)
    } catch {
      setExplanation("Search failed. Please try again.")
      setSearched(true)
    }

    setSearching(false)
  }

  const EXAMPLES = [
    "CFO with manufacturing experience",
    "Payroll specialist in Cairo",
    "HR manager 10+ years",
    "Finance director fluent in English",
    "Candidates from multinationals",
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Database Search</h1>
        <p className="text-gray-400 text-sm mt-0.5">Search your entire candidate database in plain English.</p>
      </div>

      <div className="card p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="e.g. CFO candidates with manufacturing background in Cairo..."
              className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>
          <button onClick={search} disabled={!query.trim() || searching}
            className="btn-primary px-6 flex items-center gap-2">
            {searching ? <Loader2 size={15} className="animate-spin" /> : <Brain size={15} />}
            {searching ? "Searching..." : "Search"}
          </button>
        </div>
        {!searched && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 mr-1 mt-1">Try:</span>
            {EXAMPLES.map(q => (
              <button key={q} onClick={() => setQuery(q)}
                className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-teal/40 hover:text-teal transition-colors">
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {searching && (
        <div className="card text-center py-12">
          <Loader2 size={28} className="animate-spin mx-auto mb-3 text-teal" />
          <p className="text-gray-500 text-sm">AI is scanning your candidate database...</p>
        </div>
      )}

      {searched && !searching && (
        <>
          {explanation && (
            <div className="flex items-start gap-3 px-1">
              <Brain size={15} className="text-teal mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">{explanation}</p>
            </div>
          )}
          {results.length === 0 ? (
            <div className="card text-center py-12">
              <User size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500">No matching candidates found.</p>
              <p className="text-gray-400 text-sm mt-1">Try broader keywords.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-gray-900">{results.length} candidate{results.length > 1 ? "s" : ""} found</span>
                <span className="text-xs text-gray-400">ranked by relevance</span>
              </div>
              {results.map((c, i) => (
                <Link key={c.id} href={`/internal/candidates/${c.id}`}
                  className="card flex items-center gap-4 hover:shadow-md transition-all group">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #028090, #3D5A4E)" }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 group-hover:text-teal transition-colors">{c.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {c.current_title}{c.current_company ? ` @ ${c.current_company}` : ""}
                      {c.location && <span className="ml-2 text-gray-400">· {c.location}</span>}
                    </div>
                    <div className="text-xs text-teal mt-1 italic">{c.reason}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {c.best_score > 0 && (
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-xs font-semibold" style={{ color: scoreColor(c.best_score) }}>{c.best_score}</span>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: scoreColor(c.relevance) }}>{c.relevance}%</div>
                      <div className="text-[10px] text-gray-400">match</div>
                    </div>
                    <ChevronRight size={15} className="text-gray-300 group-hover:text-teal transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
