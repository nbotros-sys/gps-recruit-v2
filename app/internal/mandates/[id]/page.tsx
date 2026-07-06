"use client"
import CandidateAvatar from "@/components/CandidateAvatar"
import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, MapPin, DollarSign, Brain, Upload,
  X, Star, AlertCircle, CheckCircle, Loader2,
  LayoutGrid, FileText, Zap, UserPlus, Users, GripVertical,
  Mail, Phone, ExternalLink, Edit3, Save, MessageSquare,
  Settings2, Search, Eye, Download, Briefcase, RefreshCw, Link2, Trash2, Calendar,
  ThumbsUp, ThumbsDown, Minus, ChevronDown, Linkedin } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ageFromDob } from "@/lib/age"
import { cleanCvText } from "@/lib/clean-cv"
import type { Mandate, Application } from "@/lib/types"

const STAGES = ["new", "screening", "interview", "shortlisted", "offered", "placed", "rejected"]
const STAGE_LABELS: Record<string, string> = {
  new: "New", screening: "Screening", interview: "Interview",
  shortlisted: "Shortlisted", offered: "Offered", placed: "Placed",
  rejected: "Rejected"
}
const SOURCE_LABELS: Record<string, string> = {
  direct: "CV Import",
  linkedin: "LinkedIn",
  portal: "Job Portal",
  referral: "Referral",
  wuzzuf: "Wuzzuf",
  bayt: "Bayt",
  other: "Other",
}

const SOURCE_COLORS: Record<string, string> = {
  direct: "bg-teal/10 text-teal",
  linkedin: "bg-blue-100 text-blue-700",
  portal: "bg-purple-100 text-purple-700",
  referral: "bg-pink-100 text-pink-700",
  wuzzuf: "bg-amber-100 text-amber-700",
  bayt: "bg-green-100 text-green-700",
  other: "bg-gray-100 text-gray-600",
}

const STAGE_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-600",
  screening: "bg-blue-100 text-blue-700",
  interview: "bg-purple-100 text-purple-700",
  shortlisted: "bg-teal/10 text-teal",
  offered: "bg-amber-100 text-amber-700",
  placed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
}

type BulkResult = {
  filename: string
  name: string
  email: string | null
  phone: string | null
  current_title: string | null
  current_company: string | null
  location: string | null
  cv_text: string
  score: number
  summary: string
  strengths: string[]
  concerns: string[]
  recommendation: string
  added?: boolean
  adding?: boolean
}

export default function MandateDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [mandate, setMandate] = useState<Mandate | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [confirmedInterviews, setConfirmedInterviews] = useState<Record<string, any>>({})
  const [tab, setTab] = useState<"details" | "jd" | "pipeline" | "bulk" | "ai" | "insight" | "source">("pipeline")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingMandate, setDeletingMandate] = useState(false)
  const [clientUser, setClientUser] = useState<any>(null)
  const [mandateClients, setMandateClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [cvText, setCvText] = useState("")
  const [candidateName, setCandidateName] = useState("")
  const [scoreResult, setScoreResult] = useState<any>(null)
  const [files, setFiles] = useState<File[]>([])
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([])
  const [bulkProgress, setBulkProgress] = useState(0)
  const [bulkStatus, setBulkStatus] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [addingAll, setAddingAll] = useState(false)
  const [draggingApp, setDraggingApp] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [candidateNotes, setCandidateNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [drawerTab, setDrawerTab] = useState<"overview" | "cv" | "roles" | "notes">("overview")
  const [insightData, setInsightData] = useState<any>(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [deeperSearching, setDeeperSearching] = useState(false)
  const [insightCachedAt, setInsightCachedAt] = useState<string | null>(null)
  const [scanId, setScanId] = useState<string | null>(null)
  const [scanProgress, setScanProgress] = useState<string>("")
  const [scanPolling, setScanPolling] = useState(false)
  const [linkedinSearch, setLinkedinSearch] = useState<{ title: string; location: string; keywords: string }>({ title: "", location: "", keywords: "" })
  const [linkedinResults, setLinkedinResults] = useState<any[]>([])
  const [linkedinSearching, setLinkedinSearching] = useState(false)
  const [linkedinCachedAt, setLinkedinCachedAt] = useState<string | null>(null)
  const [linkedinEnriching, setLinkedinEnriching] = useState<Record<number, boolean>>({})
  const [linkedinAdded, setLinkedinAdded] = useState<Record<number, boolean>>({})
  const [linkedinError, setLinkedinError] = useState<Record<number, string>>({})
  const [scoringCandidate, setScoringCandidate] = useState(false)
  const [candidateRoles, setCandidateRoles] = useState<any[]>([])

  const [roleFeedback, setRoleFeedback] = useState<Record<string, any[]>>({})
  const [roleFeedbackExpanded, setRoleFeedbackExpanded] = useState<Record<string, boolean>>({})

  function feedbackSentimentIcon(s: string) {
    if (s === "positive") return <ThumbsUp size={11} className="text-teal" />
    if (s === "negative") return <ThumbsDown size={11} className="text-amber-500" />
    return <Minus size={11} className="text-gray-400" />
  }

  function feedbackSentimentBadge(s: string): string {
    if (s === "positive") return "bg-teal/10 text-teal"
    if (s === "negative") return "bg-amber-100 text-amber-700"
    return "bg-gray-100 text-gray-500"
  }

  async function loadRoleFeedback(applicationId: string) {
    if (roleFeedback[applicationId]) return
    const { data } = await supabase
      .from("client_feedback")
      .select("*, client_user:client_users(full_name)")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
    setRoleFeedback(prev => ({ ...prev, [applicationId]: data || [] }))
  }

  async function loadCandidateRoles(candidateId: string) {
    const { data } = await supabase
      .from("applications")
      .select("id, stage, ai_score, mandate:mandates(id, title, client_name, location, status)")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
    setCandidateRoles(data || [])
  }

  async function generateStrengthsConcerns() {
    if (!selectedApp || !mandate?.job_description) return
    setScoringCandidate(true)
    try {
      const cvText = selectedApp.candidate?.cv_text || ""
      const scoreRes = await fetch("/api/score-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv_text: cvText,
          job_description: mandate.job_description,
          mandate_title: mandate.title,
        })
      })
      const data = await scoreRes.json()
      if (data.strengths || data.concerns) {
        // Score-safe: writes insight only, never touches ai_score
        await supabase.from("applications").update({
          ai_strengths: data.strengths || [],
          ai_concerns: data.concerns || [],
          ai_summary: data.summary || selectedApp.ai_summary,
        }).eq("id", selectedApp.id)
        setSelectedApp((prev: any) => ({
          ...prev,
          ai_strengths: data.strengths || [],
          ai_concerns: data.concerns || [],
          ai_summary: data.summary || prev.ai_summary,
        }))
      }
    } catch {}
    setScoringCandidate(false)
  }

  async function rescoreCandidate() {
    if (!selectedApp || !mandate?.job_description) return
    const confirmed = window.confirm(
      `This will recalculate ${selectedApp.candidate?.name || "this candidate"}'s score for ${mandate.title}, replacing the current score of ${selectedApp.ai_score ?? "—"}. The new score may differ from before — this can affect how they rank against other candidates on this mandate. Continue?`
    )
    if (!confirmed) return
    setScoringCandidate(true)
    try {
      const cvText = selectedApp.candidate?.cv_text || ""
      const scoreRes = await fetch("/api/score-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv_text: cvText,
          job_description: mandate.job_description,
          mandate_title: mandate.title,
        })
      })
      const data = await scoreRes.json()
      if (data.strengths || data.concerns) {
        await supabase.from("applications").update({
          ai_strengths: data.strengths || [],
          ai_concerns: data.concerns || [],
          ai_summary: data.summary || selectedApp.ai_summary,
          ai_score: data.score || selectedApp.ai_score,
        }).eq("id", selectedApp.id)
        setSelectedApp((prev: any) => ({
          ...prev,
          ai_strengths: data.strengths || [],
          ai_concerns: data.concerns || [],
          ai_summary: data.summary || prev.ai_summary,
          ai_score: data.score || prev.ai_score,
        }))
      }
    } catch {}
    setScoringCandidate(false)
  }
  const [jdText, setJdText] = useState("")
  const [savingJd, setSavingJd] = useState(false)
  const [jdSaved, setJdSaved] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editSaved, setEditSaved] = useState(false)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function loadMandateClients(mandateId: string) {
    const { data } = await supabase
      .from("client_users")
      .select("id, full_name, email, company_name, is_active, created_at")
      .eq("mandate_id", mandateId)
      .eq("is_active", true)
    setMandateClients(data || [])
  }

  async function loadData() {
    const { data: m } = await supabase.from("mandates").select("*").eq("id", id).single()
    if (m) {
      setMandate(m)
      setJdText(m.job_description || "")
      // Pre-fill LinkedIn search from mandate
      setLinkedinSearch({
        title: m.title || "",
        location: m.location || "",
        keywords: "",
      })
      // Load cached LinkedIn search results if available (only if non-empty)
      if ((m as any).linkedin_search_cache) {
        const cache = (m as any).linkedin_search_cache
        const cachedResults = cache.results || []
        if (cachedResults.length > 0) {
          setLinkedinResults(cachedResults)
          setLinkedinCachedAt(cache.cached_at || null)
        }
        // Empty cache is ignored — consultant can run a fresh search
      }
      setEditForm({
        title: m.title || "",
        client_name: m.client_name || "",
        location: m.location || "",
        salary_range: m.salary_range || "",
        status: m.status || "active",
      })
    }
    const { data: apps } = await supabase
      .from("applications")
      .select("*, candidate:candidates(*)")
      .eq("mandate_id", id)
      .order("ai_score", { ascending: false })
    setApplications(apps || [])

    const { data: confirmedIrs } = await supabase
      .from("client_interview_requests")
      .select("application_id, confirmed_date, confirmed_time, format")
      .eq("mandate_id", id)
      .not("confirmed_date", "is", null)
    const irMap: Record<string, any> = {}
    for (const ir of confirmedIrs || []) irMap[ir.application_id] = ir
    setConfirmedInterviews(irMap)

      // Load linked client if any
      const { data: linkedClient } = await supabase
        .from("client_users")
        .select("id, full_name, email, company_name, mandate_id, is_active")
        .eq("mandate_id", m.id)
        .eq("is_active", true)
        .maybeSingle()
      setClientUser(linkedClient || null)

    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  // Realtime: keep the pipeline in sync when other users add, move, or remove candidates
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`applications-mandate-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "applications", filter: `mandate_id=eq.${id}` },
        async (payload: any) => {
          // Realtime payloads carry the raw row only — fetch with the candidate join
          const { data } = await supabase
            .from("applications")
            .select("*, candidate:candidates(*)")
            .eq("id", payload.new.id)
            .maybeSingle()
          if (data) {
            setApplications(prev => prev.some(a => a.id === data.id) ? prev : [...prev, data])
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "applications", filter: `mandate_id=eq.${id}` },
        (payload: any) => {
          // Merge changed columns; spread keeps the joined candidate object intact
          setApplications(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a))
        }
      )
      .on(
        "postgres_changes",
        // DELETE payloads only carry the primary key, so no mandate filter — matching by id is a safe no-op for other mandates
        { event: "DELETE", schema: "public", table: "applications" },
        (payload: any) => {
          setApplications(prev => prev.filter(a => a.id !== payload.old.id))
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Fetch client feedback for every role once the candidate's role history loads
  useEffect(() => {
    candidateRoles.forEach(app => loadRoleFeedback(app.id))
  }, [candidateRoles])

  // Auto-load talent pool from cache when switching to insight tab
  // Depends on [tab, mandate] — waits for mandate to be fully loaded before firing
  useEffect(() => {
    if (tab !== "insight") return
    if (!mandate) return  // wait for mandate to load
    if (insightData) return  // already have data
    if (insightLoading) return  // already loading
    loadInsight(false, false)
  }, [tab, mandate])

  // Poll for scan results when a background scan is in progress
  useEffect(() => {
    if (!scanId || !scanPolling) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/talent-pool-scan?mandate_id=${id}`)
        const data = await res.json()
        if (data.progress_message) setScanProgress(data.progress_message)
        if ((data.status === "complete" || data.status === "no_new_candidates") && data.result) {
          setInsightData(data.result)
          setInsightCachedAt(data.scanned_at)
          setScanPolling(false)
          setScanId(null)
          setInsightLoading(false)
          // Cache in mandates table
          await supabase.from("mandates").update({
            talent_pool_cache: data.result,
            talent_pool_cached_at: data.scanned_at,
          }).eq("id", id)
        } else if (data.status === "no_new_candidates") {
          setScanPolling(false)
          setScanId(null)
          setInsightLoading(false)
          setScanProgress("No new candidates since last scan — showing cached results")
        } else if (data.status === "error") {
          setScanPolling(false)
          setScanId(null)
          setInsightLoading(false)
          setInsightData({ error: "Scan failed — please try again" })
        }
      } catch { /* keep polling */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [scanId, scanPolling, id])

  async function runLinkedinSearch(force = false) {
    if (!mandate) return
    // Always clear current results so stale cache doesn't show
    setLinkedinResults([])
    setLinkedinSearching(true)
    try {
      const res = await fetch("/api/linkedin-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: linkedinSearch.title,
          location: linkedinSearch.location,
          keywords: linkedinSearch.keywords,
          mandate_id: id,
        }),
      })
      const data = await res.json()
      if (data.error) {
        console.error("LinkedIn search error:", data.error)
        setLinkedinSearching(false)
        return
      }
      setLinkedinResults(data.results || [])
      // Cache results in Supabase against this mandate
      const now = new Date().toISOString()
      setLinkedinCachedAt(now)
      await supabase.from("mandates").update({
        linkedin_search_cache: { results: data.results, cached_at: now, search_params: data.search_params },
      }).eq("id", id)
    } catch (err) {
      console.error("LinkedIn search failed:", err)
    }
    setLinkedinSearching(false)
  }

  async function enrichAndAdd(result: any, idx: number) {
    setLinkedinEnriching(prev => ({ ...prev, [idx]: true }))
    setLinkedinError(prev => ({ ...prev, [idx]: "" }))
    try {
      // Step 1: Enrich the full profile
      const enrichRes = await fetch("/api/enrich-from-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedin_url: result.linkedin_url }),
      })
      const enrichData = await enrichRes.json()
      console.log("Enrich response:", enrichData)
      if (!enrichData.candidateId) {
        throw new Error(enrichData.error || "Enrichment returned no candidate ID")
      }

      // Step 2: Add to this mandate pipeline at Screening stage
      const { error: appError } = await supabase.from("applications").insert([{
        mandate_id: id,
        candidate_id: enrichData.candidateId,
        stage: "screening",
      }])
      if (appError) {
        // If duplicate application, still mark as added
        if (appError.code === "23505") {
          setLinkedinAdded(prev => ({ ...prev, [idx]: true }))
        } else {
          throw new Error(appError.message)
        }
      } else {
        setLinkedinAdded(prev => ({ ...prev, [idx]: true }))
        // Refresh applications
        const { data: apps } = await supabase
          .from("applications")
          .select("*, candidate:candidates(*)")
          .eq("mandate_id", id)
          .order("ai_score", { ascending: false })
        setApplications(apps || [])
      }
    } catch (err: any) {
      console.error("Enrich and add failed:", err)
      setLinkedinError(prev => ({ ...prev, [idx]: err.message || "Failed" }))
    }
    setLinkedinEnriching(prev => ({ ...prev, [idx]: false }))
  }

  async function loadInsight(deeper = false, forceRescan = false) {
    if (!mandate) return

    // Load from cache first (under 24hrs), unless forcing rescan
    if (!forceRescan && !deeper) {
      const cached = (mandate as any).talent_pool_cache
      const cachedAt = (mandate as any).talent_pool_cached_at
      if (cached && cachedAt) {
        const ageHours = (Date.now() - new Date(cachedAt).getTime()) / 1000 / 60 / 60
        if (ageHours < 24) {
          setInsightData(cached)
          setInsightCachedAt(cachedAt)
          return
        }
      }
      // Also check database for a recent completed scan
      try {
        const res = await fetch(`/api/talent-pool-scan?mandate_id=${id}`)
        const scan = await res.json()
        if ((scan.status === "complete" || scan.status === "no_new_candidates") && scan.result) {
          setInsightData(scan.result)
          setInsightCachedAt(scan.scanned_at)
          return
        }
        // If a scan is already in progress, start polling
        if (scan.status === "pending" || scan.status === "running") {
          setScanId(scan.id)
          setScanProgress(scan.progress_message || "Scan in progress...")
          setScanPolling(true)
          setInsightLoading(true)
          return
        }
      } catch {}
    }

    // Trigger scan — runs synchronously on the server, returns result directly
    setInsightLoading(true)
    setScanProgress("Scanning talent pool...")
    try {
      const res = await fetch("/api/talent-pool-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mandate_id: id,
          job_description: mandate.job_description,
          mandate_title: mandate.title,
          incremental: !forceRescan && !deeper,
        })
      })
      const data = await res.json()
      if (data.status === "complete" && data.result) {
        setInsightData(data.result)
        setInsightCachedAt(data.scanned_at)
        setInsightLoading(false)
        // Cache in mandates table
        await supabase.from("mandates").update({
          talent_pool_cache: data.result,
          talent_pool_cached_at: data.scanned_at,
        }).eq("id", id)
      } else if (data.status === "no_new_candidates") {
        setInsightLoading(false)
        setScanProgress("No new candidates since last scan — showing cached results")
        // Load the cached result from DB
        try {
          const cached = await fetch(`/api/talent-pool-scan?mandate_id=${id}`)
          const cachedData = await cached.json()
          if (cachedData.result) {
            setInsightData(cachedData.result)
            setInsightCachedAt(cachedData.scanned_at)
          }
        } catch {}
      } else {
        setInsightData({ error: data.error || "Scan failed — please try again" })
        setInsightLoading(false)
      }
    } catch {
      setInsightData({ error: "Failed to start scan" })
      setInsightLoading(false)
    }
  }

  async function addFromInsight(candidate: any) {
    if (!mandate) return
    try {
      // Strengths & concerns already generated during talent pool scan — use directly
      const { error } = await supabase.from("applications").insert([{
        candidate_id: candidate.id,
        mandate_id: id,
        stage: "new",
        ai_score: candidate.score,
        ai_summary: candidate.reason || "",
        ai_strengths: Array.isArray(candidate.ai_strengths) ? candidate.ai_strengths : [],
        ai_concerns: Array.isArray(candidate.ai_concerns) ? candidate.ai_concerns : [],
      }])
      if (!error) {
        setInsightData((prev: any) => ({
          ...prev,
          strong_matches: prev.strong_matches.filter((c: any) => c.id !== candidate.id),
          possible_matches: prev.possible_matches.filter((c: any) => c.id !== candidate.id),
        }))
        loadData()
      }
    } catch (e) { console.error(e) }
  }

  async function moveStage(appId: string, newStage: string) {
    await supabase.from("applications").update({ stage: newStage }).eq("id", appId)
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, stage: newStage as any } : a))
    // Find candidate name for notification
    const app = applications.find(a => a.id === appId)
    const candidateName = app?.candidate?.name || "Candidate"
    const mandateTitle = mandate?.title || "mandate"
    if (newStage === "placed") {
      // Placed notification + auto post-placement task
      fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "candidate_placed", title: "Candidate placed",
          message: `${candidateName} has been placed on ${mandateTitle}`,
          link: `/internal/mandates/${id}` }) }).catch(() => {})
      // Auto-task: 2-week post-placement check-in
      fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Post-placement check-in — ${candidateName}`,
          description: `Follow up with ${candidateName} 2 weeks after placement on ${mandateTitle}`,
          due_date: (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split("T")[0] })(),
          link: `/internal/mandates/${id}`, link_label: `${mandateTitle}`,
          auto_generated: true }) }).catch(() => {})
      // Auto-task: notify client
      fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Notify client of placement — ${mandateTitle}`,
          description: `${candidateName} has been placed. Confirm start date and send placement confirmation to client.`,
          due_date: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0] })(),
          link: `/internal/mandates/${id}`, link_label: `${mandateTitle}`,
          auto_generated: true }) }).catch(() => {})
    } else {
      // Stage change notification
      fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "stage_changed", title: "Pipeline update",
          message: `${candidateName} moved to ${newStage} on ${mandateTitle}`,
          link: `/internal/mandates/${id}` }) }).catch(() => {})
      // Auto-task: send shortlist to client when 3+ candidates are shortlisted
      if (newStage === "shortlisted") {
        const shortlisted = applications.filter(a => a.id === appId ? true : a.stage === "shortlisted").length
        if (shortlisted >= 3) {
          fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: `Send shortlist to client — ${mandateTitle}`,
              description: `${shortlisted} candidates are now shortlisted. Time to send the shortlist to the client.`,
              due_date: (() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split("T")[0] })(),
              link: `/internal/mandates/${id}`, link_label: `${mandateTitle}`,
              auto_generated: true }) }).catch(() => {})
        }
      }
    }
  }

  async function scoreCV() {
    if (!cvText || !mandate) return
    setScoring(true); setScoreResult(null)
    try {
      const res = await fetch("/api/score-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: cvText, job_description: mandate.job_description, mandate_title: mandate.title })
      })
      setScoreResult(await res.json())
    } catch { setScoreResult({ error: "Scoring failed." }) }
    setScoring(false)
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.match(/\.(pdf|doc|docx|txt)$/i))
    setFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...dropped.filter(f => !names.has(f.name))] })
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    setFiles(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...selected.filter(f => !names.has(f.name))] })
  }

  async function runBulkScore() {
    if (!files.length || !mandate) return
    setBulkProcessing(true); setBulkResults([]); setBulkProgress(0)
    const cvs: { filename: string; text: string }[] = []
    for (let i = 0; i < files.length; i++) {
      setBulkStatus(`Reading ${i + 1} of ${files.length}: ${files[i].name}`)
      setBulkProgress(Math.round((i / files.length) * 50))
      const formData = new FormData()
      formData.append("file", files[i])
      try {
        const res = await fetch("/api/extract-cv", { method: "POST", body: formData })
        const data = await res.json()
        cvs.push({ filename: files[i].name, text: data.text || "" })
      } catch { cvs.push({ filename: files[i].name, text: "" }) }
    }
    setBulkStatus(`AI scoring all ${files.length} candidates...`); setBulkProgress(65)
    try {
      const res = await fetch("/api/bulk-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvs, job_description: mandate.job_description, mandate_title: mandate.title })
      })
      const data = await res.json()
      setBulkResults((data.results || []).map((r: BulkResult) => ({ ...r, added: false, adding: false })))
    } catch { setBulkResults([]) }
    setBulkProgress(100); setBulkStatus(""); setBulkProcessing(false)
  }

  async function addToPipeline(idx: number) {
    const r = bulkResults[idx]
    if (!mandate || r.added || r.adding) return
    setBulkResults(prev => prev.map((item, i) => i === idx ? { ...item, adding: true } : item))
    try {
      const safeName = r.name === "Unknown" ? r.filename.replace(/\.[^.]+$/, "") : r.name
      const safeEmail = r.email || `${safeName.toLowerCase().replace(/\s+/g, ".")}.${Date.now()}@pending.com`

      const { data: candidate, error: candError } = await supabase
        .from("candidates")
        .insert([{
          name: safeName,
          email: safeEmail,
          phone: r.phone,
          current_title: r.current_title,
          current_company: r.current_company,
          location: r.location,
          cv_text: r.cv_text,
          source: "direct",
          tags: [],
          notes: `Added from bulk upload for ${mandate.title}`
        }])
        .select().single()

      if (candError) throw candError

      const { error: appError } = await supabase.from("applications").insert([{
        candidate_id: candidate.id, mandate_id: id, stage: "new",
        ai_score: r.score, ai_summary: r.summary,
        ai_strengths: r.strengths, ai_concerns: r.concerns,
      }])
      if (appError) throw appError

      setBulkResults(prev => prev.map((item, i) => i === idx ? { ...item, adding: false, added: true } : item))
      loadData()
    } catch {
      setBulkResults(prev => prev.map((item, i) => i === idx ? { ...item, adding: false } : item))
    }
  }

  async function addAllProceed() {
    setAddingAll(true)
    const indexes = bulkResults.map((r, i) => ({ r, i })).filter(({ r }) => r.recommendation === "Proceed" && !r.added).map(({ i }) => i)
    for (const idx of indexes) await addToPipeline(idx)
    setAddingAll(false)
  }

  async function removeFromPipeline(appId: string) {
    await supabase.from("applications").delete().eq("id", appId)
    setApplications(prev => prev.filter(a => a.id !== appId))
    if (selectedApp?.id === appId) setSelectedApp(null)
  }

  async function deleteMandate() {
    setDeletingMandate(true)
    // Cascade delete is done server-side (service-role) so it works under RLS
    // and actually confirms every child table was cleaned before removing the
    // mandate. If anything fails, we surface it instead of silently orphaning.
    try {
      const res = await fetch("/api/delete-mandate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandate_id: id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error("Mandate delete failed:", body)
        alert("Could not delete this mandate. Please try again.")
        setDeletingMandate(false)
        return
      }
      router.push("/internal/mandates")
    } catch (err) {
      console.error("Mandate delete error:", err)
      alert("Could not delete this mandate. Please try again.")
      setDeletingMandate(false)
    }
  }

  const byStage = (stage: string) => applications.filter(a => a.stage === stage)
  const scoreColor = (s: number) => s >= 70 ? "#028090" : s >= 50 ? "#d97706" : "#9ca3af"
  const proceed = bulkResults.filter(r => r.recommendation === "Proceed").length
  const maybe = bulkResults.filter(r => r.recommendation === "Maybe").length
  const pass = bulkResults.filter(r => r.recommendation === "Pass").length
  const addedCount = bulkResults.filter(r => r.added).length

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
  if (!mandate) return <div className="text-center py-16 text-gray-400">Mandate not found.</div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link href="/internal/mandates" className="text-gray-400 hover:text-teal text-sm flex items-center gap-1 mb-3 w-fit">
          <ArrowLeft size={14} /> Back to Mandates
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{mandate.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              {mandate.client_name && <span>{mandate.client_name}</span>}
              {mandate.location && <span className="flex items-center gap-1"><MapPin size={13} />{mandate.location}</span>}
              {mandate.salary_range && <span className="flex items-center gap-1"><DollarSign size={13} />{mandate.salary_range}</span>}
            </div>
          </div>
          <span className={`badge ${
            (mandate.status as string) === "active" ? "bg-green-100 text-green-700" :
            (mandate.status as string) === "on_hold" ? "bg-amber-100 text-amber-700" :
            (mandate.status as string) === "filled" ? "bg-blue-100 text-blue-700" :
            (mandate.status as string) === "cancelled" ? "bg-red-100 text-red-600" :
            "bg-gray-100 text-gray-600"
          }`}>
            {({"active":"Active","on_hold":"On Hold","filled":"Filled","cancelled":"Cancelled"} as Record<string,string>)[mandate.status as string] || mandate.status}
          </span>
        </div>
      </div>

      {/* Client section — shows automatically when a client is linked */}
      {clientUser && (
        <div className="flex items-center gap-3 bg-teal/5 border border-teal/20 rounded-2xl px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal to-[#3D5A4E] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {clientUser.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{clientUser.full_name}</span>
              {clientUser.company_name && <span className="text-xs text-gray-500">{clientUser.company_name}</span>}
              <span className="badge bg-teal/10 text-teal text-xs">Client access active</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{clientUser.email}</div>
          </div>
          <a href="/client/portal" target="_blank" rel="noopener noreferrer"
            className="btn-ghost text-xs flex items-center gap-1 flex-shrink-0">
            <ExternalLink size={11} /> View portal
          </a>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: "details", icon: Settings2, label: "Details" },
          { id: "jd", icon: FileText, label: "Job Description" },
          { id: "pipeline", icon: LayoutGrid, label: `Pipeline${applications.length > 0 ? ` (${applications.length})` : ""}` },
          { id: "bulk", icon: Upload, label: "Bulk CV Upload" },
          { id: "ai", icon: Brain, label: "Score Single CV" },
          { id: "insight", icon: Users, label: "Talent Pool" },
          { id: "source", icon: Link2, label: "Source on LinkedIn" },
        ].map(({ id: tid, icon: Icon, label }) => (
          <button key={tid} onClick={() => setTab(tid as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === tid ? "bg-white shadow-sm text-teal" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── DETAILS tab */}
      {tab === "details" && (
        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Mandate Details</h3>
              <p className="text-xs text-gray-400 mt-0.5">Edit the core details of this mandate.</p>
            </div>
            <button onClick={async () => {
              setSavingEdit(true)
              await supabase.from("mandates").update({
                title: editForm.title,
                client_name: editForm.client_name,
                location: editForm.location,
                salary_range: editForm.salary_range,
                status: editForm.status,
              }).eq("id", id)
              setMandate({ ...mandate, ...editForm })
              setSavingEdit(false)
              setEditSaved(true)
              setTimeout(() => setEditSaved(false), 3000)
            }}
              className="btn-primary flex items-center gap-2 text-sm">
              {savingEdit ? <><Loader2 size={13} className="animate-spin" /> Saving...</>
               : editSaved ? <><CheckCircle size={13} /> Saved!</>
               : <><Save size={13} /> Save changes</>}
            </button>
          </div>

          <div className="card p-6 space-y-5">
            {[
              { label: "Job Title", key: "title", placeholder: "e.g. Finance Manager" },
              { label: "Client / Company", key: "client_name", placeholder: "e.g. ABC Corporation" },
              { label: "Location", key: "location", placeholder: "e.g. Cairo, Egypt" },
              { label: "Salary Range", key: "salary_range", placeholder: "e.g. EGP 25,000 – 35,000" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</label>
                <input
                  value={editForm[key] || ""}
                  onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Status</label>
              <select
                value={editForm.status || "active"}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 bg-white">
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="filled">Filled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="border border-red-200 bg-red-50 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-red-700 text-sm">Delete this mandate</h3>
                <p className="text-xs text-red-500 mt-1 max-w-md">
                  Permanently removes this mandate along with its pipeline candidates,
                  talent pool scans, client commentary, and client portal access. This
                  cannot be undone — consider setting status to Cancelled instead if you
                  just want to close it.
                </p>
              </div>
              <button onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 text-sm font-semibold text-red-600 border border-red-200 bg-white px-4 py-2.5 rounded-xl hover:bg-red-100 transition-all flex-shrink-0">
                <Trash2 size={14} /> Delete mandate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── JOB DESCRIPTION tab */}
      {tab === "jd" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Job Description</h3>
              <p className="text-xs text-gray-400 mt-0.5">Used by AI to score and rank candidates against this role.</p>
            </div>
            <button onClick={async () => {
              setSavingJd(true)
              await supabase.from("mandates").update({ job_description: jdText }).eq("id", id)
              setMandate({ ...mandate, job_description: jdText })
              setSavingJd(false)
              setJdSaved(true)
              setTimeout(() => setJdSaved(false), 3000)
            }}
              className="btn-primary flex items-center gap-2 text-sm">
              {savingJd ? <><Loader2 size={13} className="animate-spin" /> Saving...</>
               : jdSaved ? <><CheckCircle size={13} /> Saved!</>
               : <><Save size={13} /> Save JD</>}
            </button>
          </div>
          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            rows={24}
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none text-gray-700 leading-relaxed font-mono"
            placeholder="Paste or write the full job description here...&#10;&#10;Include: role overview, key responsibilities, required qualifications, experience level, and any specific requirements.&#10;&#10;The more detail you provide, the more accurately AI can score and rank candidates."
          />
          <p className="text-xs text-gray-400">{jdText.length} characters</p>
        </div>
      )}

      {/* ── PIPELINE with drag & drop ── */}
      {tab === "pipeline" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map(stage => (
              <div key={stage}
                className={`w-56 flex-shrink-0 rounded-2xl p-2 transition-colors ${dragOverStage === stage ? "bg-teal/5 ring-2 ring-teal/20" : "bg-gray-50"}`}
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage) }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={async e => {
                  e.preventDefault()
                  setDragOverStage(null)
                  if (draggingApp) await moveStage(draggingApp, stage)
                  setDraggingApp(null)
                }}
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className={`badge ${STAGE_COLORS[stage]} text-xs truncate max-w-[110px]`}>{STAGE_LABELS[stage]}</span>
                  <span className="text-xs text-gray-400 font-medium">{byStage(stage).length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {byStage(stage).map(app => (
                    <div key={app.id}
                      draggable
                      onDragStart={() => setDraggingApp(app.id)}
                      onDragEnd={() => setDraggingApp(null)}
                      className={`bg-white rounded-xl p-3 border transition-all
                        ${draggingApp === app.id ? "opacity-40 shadow-lg scale-95 cursor-grabbing" : "border-gray-100 shadow-sm hover:shadow-md hover:border-teal/20"}`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical size={12} className="text-gray-300 mt-0.5 flex-shrink-0 cursor-grab" />
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedApp(app); setCandidateNotes((app as any).candidate?.internal_notes || ""); setDrawerTab("overview"); setCandidateRoles([]); loadCandidateRoles((app as any).candidate?.id); loadRoleFeedback(app.id) }}
                            className="font-medium text-sm text-gray-900 hover:text-teal transition-colors truncate block text-left">
                            {(app as any).candidate?.name || "Unknown"}{ageFromDob((app as any).candidate?.dob) != null && <span className="text-gray-400 font-normal"> · {ageFromDob((app as any).candidate?.dob)}</span>}
                          </button>
                          {(app as any).candidate?.current_title && (
                            <div className="text-xs text-gray-400 truncate mt-0.5">{(app as any).candidate.current_title}</div>
                          )}
                          {(app as any).candidate?.current_company && (
                            <div className="text-xs text-gray-300 truncate">{(app as any).candidate.current_company}</div>
                          )}
                          {(app as any).candidate?.source === "linkedin" && (app as any).candidate?.linkedin_url && (
                            <a
                              href={(app as any).candidate.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              draggable={false}
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors w-fit"
                              title="View LinkedIn profile">
                              <Linkedin size={10} /> LinkedIn
                            </a>
                          )}
                          {app.ai_score && (
                            <div className="mt-2 flex items-center gap-1">
                              <Star size={10} className="text-amber-400 fill-amber-400" />
                              <span className="text-xs font-semibold" style={{ color: scoreColor(app.ai_score) }}>{app.ai_score}/100</span>
                            </div>
                          )}
                          {confirmedInterviews[app.id] && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-teal bg-teal/5 border border-teal/15 rounded-md px-1.5 py-0.5 w-fit">
                              <Calendar size={9} />
                              {new Date(confirmedInterviews[app.id].confirmed_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              {confirmedInterviews[app.id].confirmed_time && `, ${confirmedInterviews[app.id].confirmed_time}`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex gap-1 min-w-0 overflow-hidden">
                          {STAGES.filter(s => s !== stage).slice(0, 3).map(s => (
                            <button key={s} onClick={() => moveStage(app.id, s)}
                              className="text-xs text-gray-300 hover:text-teal transition-colors truncate">
                              → {STAGE_LABELS[s]}
                            </button>
                          ))}
                        </div>
                        <button onClick={e => { e.stopPropagation(); removeFromPipeline(app.id) }}
                          className="text-xs text-gray-200 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                          title="Remove from pipeline">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  {byStage(stage).length === 0 && (
                    <div className={`border-2 border-dashed rounded-xl h-16 flex items-center justify-center transition-colors
                      ${dragOverStage === stage ? "border-teal/40 bg-teal/5" : "border-gray-200"}`}>
                      <span className="text-xs text-gray-300">Drop here</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CANDIDATE MODAL ── */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedApp(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #028090, #3D5A4E)" }}>
                  {selectedApp.candidate?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedApp.candidate?.name}{ageFromDob(selectedApp.candidate?.dob) != null && <span className="text-gray-400 font-normal text-base"> · {ageFromDob(selectedApp.candidate?.dob)}</span>}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {selectedApp.candidate?.current_title}
                    {selectedApp.candidate?.current_company ? ` @ ${selectedApp.candidate.current_company}` : ""}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {selectedApp.candidate?.email && (
                      <a href={`mailto:${selectedApp.candidate.email}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-teal transition-colors">
                        <Mail size={11} /> {selectedApp.candidate.email}
                      </a>
                    )}
                    {selectedApp.candidate?.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-400"><Phone size={11} /> {selectedApp.candidate.phone}</span>
                    )}
                    {selectedApp.candidate?.location && (
                      <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={11} /> {selectedApp.candidate.location}</span>
                    )}
                    {selectedApp.candidate?.linkedin_url && (
                      <a href={selectedApp.candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors">
                        <Linkedin size={11} /> LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedApp.ai_score && (
                  <div className="flex items-center gap-1">
                    <Star size={13} className="text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold" style={{ color: scoreColor(selectedApp.ai_score) }}>{selectedApp.ai_score}/100</span>
                  </div>
                )}
                <span className={`badge ${STAGE_COLORS[selectedApp.stage] || "bg-gray-100 text-gray-600"} capitalize text-xs`}>{selectedApp.stage}</span>
                <Link href={`/internal/candidates/${selectedApp.candidate?.id}`}
                  className="p-1.5 text-gray-400 hover:text-teal transition-colors rounded-lg hover:bg-gray-50" title="Full profile">
                  <ExternalLink size={15} />
                </Link>
                <button onClick={() => setSelectedApp(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex px-6 flex-shrink-0 border-b border-gray-100">
              {[
                { id: "overview", label: "Overview" },
                { id: "cv", label: "CV" },
                { id: "roles", label: "Roles" },
                { id: "notes", label: "Notes" },
              ].map(({ id, label }) => (
                <button key={id} onClick={() => setDrawerTab(id as any)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px
                    ${drawerTab === id ? "border-teal text-teal" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* Overview */}
              {drawerTab === "overview" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Move to stage</div>
                      <button onClick={() => removeFromPipeline(selectedApp.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1">
                        Remove from pipeline
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STAGES.filter(s => s !== selectedApp.stage).map(s => (
                        <button key={s} onClick={async () => {
                          await moveStage(selectedApp.id, s)
                          setSelectedApp({ ...selectedApp, stage: s })
                        }}
                          className={`badge ${STAGE_COLORS[s]} capitalize text-xs cursor-pointer hover:opacity-75 transition-opacity`}>
                          {STAGE_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {selectedApp.ai_score && (
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${selectedApp.ai_score}%`, background: scoreColor(selectedApp.ai_score) }} />
                    </div>
                  )}
                  {(selectedApp.ai_summary || selectedApp.candidate?.notes) && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-teal uppercase tracking-wide">AI Summary</span>
                        <span className="text-xs bg-teal/10 text-teal px-1.5 py-0.5 rounded-full">Auto-generated</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{selectedApp.ai_summary || selectedApp.candidate?.notes}</p>
                    </div>
                  )}
                  {(selectedApp.ai_strengths?.length > 0 || selectedApp.ai_concerns?.length > 0) ? (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedApp.ai_strengths?.length > 0 && (
                        <div className="bg-green-50 rounded-xl p-4">
                          <div className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1"><CheckCircle size={11} /> Strengths for this role</div>
                          <ul className="space-y-1.5">
                            {selectedApp.ai_strengths.map((s: string, i: number) => (
                              <li key={i} className="text-xs text-green-800 flex gap-1.5"><span>•</span>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedApp.ai_concerns?.length > 0 && (
                        <div className="bg-amber-50 rounded-xl p-4">
                          <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1"><AlertCircle size={11} /> Areas to probe</div>
                          <ul className="space-y-1.5">
                            {selectedApp.ai_concerns.map((c: string, i: number) => (
                              <li key={i} className="text-xs text-amber-800 flex gap-1.5"><span>•</span>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="col-span-2 flex justify-end">
                        <button onClick={rescoreCandidate} disabled={scoringCandidate}
                          className="text-xs text-gray-400 hover:text-teal transition-colors flex items-center gap-1">
                          {scoringCandidate ? <><Loader2 size={11} className="animate-spin" /> Regenerating…</> : "↺ Re-score for this JD"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={generateStrengthsConcerns} disabled={scoringCandidate}
                      className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-teal hover:text-teal transition-all">
                      {scoringCandidate
                        ? <><Loader2 size={12} className="animate-spin" /> Analysing against this JD…</>
                        : <><Zap size={12} /> Generate strengths & concerns for {mandate?.title}</>}
                    </button>
                  )}
                </div>
              )}

              {/* CV */}
              {drawerTab === "cv" && (
                <div>
                  {/* Preview + Download buttons */}
                  {(selectedApp.candidate?.cv_pdf_url || selectedApp.candidate?.cv_file_url) && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <FileText size={14} className="text-teal flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 flex-1">
                        {selectedApp.candidate?.cv_source === "gps_builder" ? "GPS-built CV" : `Original CV${selectedApp.candidate?.cv_file_type ? ` (${selectedApp.candidate.cv_file_type.toUpperCase()})` : ""}`}
                      </span>
                      {selectedApp.candidate?.cv_source === "gps_builder" && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-teal/10 text-teal border border-teal/20">★ GPS CV</span>
                      )}
                      <div className="flex gap-2">
                        {(selectedApp.candidate?.cv_pdf_url || selectedApp.candidate?.cv_file_type === "pdf") && (
                          <a href={selectedApp.candidate?.cv_pdf_url || selectedApp.candidate?.cv_file_url}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-teal hover:text-teal transition-all">
                            <Eye size={11} /> Preview
                          </a>
                        )}
                        <a href={selectedApp.candidate?.cv_pdf_url || selectedApp.candidate?.cv_file_url}
                          target="_blank" rel="noopener noreferrer"
                          download={`${selectedApp.candidate?.name || "CV"}.${selectedApp.candidate?.cv_pdf_url ? "pdf" : selectedApp.candidate?.cv_file_type || "pdf"}`}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-teal text-white text-xs font-semibold hover:opacity-90 transition-all">
                          <Download size={11} /> Download
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedApp.candidate?.cv_text ? (
                    <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl p-5">
                      {selectedApp.candidate.cv_text}
                    </pre>
                  ) : (
                    <div className="text-center py-12">
                      <FileText size={32} className="mx-auto mb-3 text-gray-200" />
                      <p className="text-gray-400 text-sm">No CV stored for this candidate.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Roles */}
              {drawerTab === "roles" && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 mb-3">All mandates this candidate is assigned to</p>
                  {candidateRoles.length === 0 ? (
                    <div className="text-center py-8">
                      <Briefcase size={28} className="mx-auto mb-2 text-gray-200" />
                      <p className="text-gray-400 text-sm">Loading roles...</p>
                    </div>
                  ) : (
                    candidateRoles.map((app: any) => {
                      const isCurrentMandate = app.mandate?.id === id
                      return (
                        <div key={app.id}
                          className={`rounded-2xl p-4 border ${isCurrentMandate ? "border-teal/30 bg-teal/5" : "border-gray-100 bg-white"}`}>
                          {/* Title + score */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-900 text-sm truncate">{app.mandate?.title}</p>
                                {isCurrentMandate && (
                                  <span className="text-xs bg-teal/10 text-teal px-1.5 py-0.5 rounded-full flex-shrink-0">Current</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {app.mandate?.client_name}{app.mandate?.location ? ` · ${app.mandate.location}` : ""}
                              </p>
                            </div>
                            {app.ai_score && (
                              <span className="text-xs font-bold flex-shrink-0" style={{ color: scoreColor(app.ai_score) }}>
                                {app.ai_score}/100
                              </span>
                            )}
                          </div>

                          {/* Pipeline trail */}
                          <div className="flex items-center gap-0.5 flex-wrap">
                            {(["new","screening","interview","shortlisted","offered","placed"] as const).map((stage, idx, arr) => {
                              const stageOrder = ["new","screening","interview","shortlisted","offered","placed"]
                              const currentIdx = stageOrder.indexOf(app.stage)
                              const thisIdx = stageOrder.indexOf(stage)
                              const isPast = thisIdx < currentIdx
                              const isCurrent = stage === app.stage
                              const LABELS: Record<string,string> = { new:"New", screening:"Screening", interview:"Interview", shortlisted:"Shortlisted", offered:"Offered", placed:"Placed" }
                              return (
                                <div key={stage} className="flex items-center">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    isCurrent ? "bg-teal text-white" :
                                    isPast ? "bg-gray-200 text-gray-500" :
                                    "text-gray-300"
                                  }`}>
                                    {LABELS[stage]}
                                  </span>
                                  {idx < arr.length - 1 && (
                                    <span className={`text-xs mx-0.5 ${isPast || isCurrent ? "text-gray-400" : "text-gray-200"}`}>→</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Client feedback indicator */}
                          {roleFeedback[app.id]?.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <button onClick={() => setRoleFeedbackExpanded(prev => ({ ...prev, [app.id]: !prev[app.id] }))}
                                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                                <MessageSquare size={11} />
                                {roleFeedback[app.id].length} client feedback {roleFeedback[app.id].length === 1 ? "entry" : "entries"}
                                <ChevronDown size={11} className={`transition-transform ${roleFeedbackExpanded[app.id] ? "rotate-180" : ""}`} />
                              </button>
                              {roleFeedbackExpanded[app.id] && (
                                <div className="mt-2 space-y-2">
                                  {roleFeedback[app.id].map((fb: any) => (
                                    <div key={fb.id} className="bg-gray-50 rounded-lg px-3 py-2">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="flex items-center gap-1.5">
                                          {feedbackSentimentIcon(fb.sentiment)}
                                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${feedbackSentimentBadge(fb.sentiment)}`}>{fb.sentiment || "neutral"}</span>
                                        </span>
                                        <span className="text-[10px] text-gray-400">{new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                      </div>
                                      <p className="text-xs text-gray-600 leading-relaxed">{fb.feedback_text}</p>
                                      {fb.client_user?.full_name && (
                                        <p className="text-[10px] text-gray-400 mt-1">— {fb.client_user.full_name}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* Notes */}
              {drawerTab === "notes" && (
                <div className="space-y-4">
                  {/* AI Summary */}
                  {selectedApp.candidate?.notes && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-teal uppercase tracking-wide">AI Summary</span>
                        <span className="text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full">Auto-generated</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">
                        {cleanCvText(selectedApp.candidate.notes)}
                      </p>
                    </div>
                  )}
                  {/* Client feedback — for this mandate */}
                  {roleFeedback[selectedApp.id]?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Client feedback</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">From {mandate?.client_name || "client"}</span>
                      </div>
                      <div className="space-y-2">
                        {roleFeedback[selectedApp.id].map((fb: any) => (
                          <div key={fb.id} className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="flex items-center gap-1.5">
                                {feedbackSentimentIcon(fb.sentiment)}
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${feedbackSentimentBadge(fb.sentiment)}`}>{fb.sentiment || "neutral"}</span>
                              </span>
                              <span className="text-xs text-gray-400">{new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{fb.feedback_text}</p>
                            {fb.client_user?.full_name && (
                              <p className="text-xs text-gray-400 mt-1.5">— {fb.client_user.full_name}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Manual notes */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Internal notes — only visible to GPS team</p>
                    <textarea value={candidateNotes} onChange={e => setCandidateNotes(e.target.value)} rows={8}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none text-gray-700 leading-relaxed"
                      placeholder="Add interview feedback, observations, next steps..." />
                  </div>
                  <div className="flex justify-end">
                    <button onClick={async () => {
                      setSavingNotes(true)
                      await supabase.from("candidates").update({ notes: candidateNotes }).eq("id", selectedApp.candidate?.id)
                      setSavingNotes(false)
                    }} disabled={savingNotes}
                      className="btn-primary flex items-center gap-2 text-sm">
                      <Save size={13} /> {savingNotes ? "Saving..." : "Save notes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BULK UPLOAD ── */}
      {tab === "bulk" && (
        <div className="grid grid-cols-5 gap-5 items-start">
          <div className="col-span-2 space-y-4">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => !bulkProcessing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all
                ${dragOver ? "border-teal bg-teal/5" : "border-gray-200 hover:border-teal/40 hover:bg-gray-50"}
                ${bulkProcessing ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt" onChange={handleFileSelect} className="hidden" />
              <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center mx-auto mb-3">
                <Upload size={22} className="text-teal" />
              </div>
              <p className="text-gray-700 font-semibold">Drop CVs here</p>
              <p className="text-gray-400 text-sm mt-1">or click to browse</p>
              <p className="text-gray-300 text-xs mt-2">PDF, Word, TXT · Multiple files</p>
            </div>

            {files.length > 0 && (
              <div className="card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{files.length} file{files.length > 1 ? "s" : ""} queued</span>
                  <button onClick={() => setFiles([])} className="text-xs text-gray-400 hover:text-red-500">Clear</button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2.5 bg-gray-50 rounded-lg group">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={12} className="text-teal flex-shrink-0" />
                        <span className="text-xs text-gray-700 truncate">{f.name}</span>
                      </div>
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                {bulkProcessing ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <Loader2 size={13} className="animate-spin text-teal flex-shrink-0" />
                      <span className="text-xs text-gray-500 truncate">{bulkStatus}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal rounded-full transition-all duration-700" style={{ width: `${bulkProgress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 text-center">{bulkProgress}%</p>
                  </div>
                ) : (
                  <button onClick={runBulkScore} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
                    <Zap size={14} /> Score {files.length} CV{files.length > 1 ? "s" : ""}
                  </button>
                )}
              </div>
            )}

            {bulkResults.length > 0 && (
              <div className="card p-4 space-y-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Batch summary</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-teal/5 rounded-xl p-3">
                    <div className="text-xl font-bold text-teal">{proceed}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Proceed</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3">
                    <div className="text-xl font-bold text-amber-600">{maybe}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Maybe</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xl font-bold text-gray-400">{pass}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Pass</div>
                  </div>
                </div>
                {addedCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-teal bg-teal/5 rounded-lg px-3 py-2">
                    <CheckCircle size={12} /> {addedCount} added to pipeline
                  </div>
                )}
                {proceed > 0 && bulkResults.filter(r => r.recommendation === "Proceed" && !r.added).length > 0 && (
                  <button onClick={addAllProceed} disabled={addingAll}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                    {addingAll ? <><Loader2 size={13} className="animate-spin" /> Adding...</> : <><Users size={13} /> Add all {proceed} Proceed</>}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="col-span-3 space-y-3">
            {bulkResults.length === 0 && !bulkProcessing && (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <Brain size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-400 font-medium">Results will appear here</p>
                <p className="text-gray-300 text-sm mt-1">Upload CVs on the left and click Score</p>
              </div>
            )}

            {bulkResults.map((r, i) => (
              <div key={i} className={`bg-white rounded-2xl border overflow-hidden ${r.added ? "border-teal/30" : "border-gray-100 shadow-sm"}`}>
                <div className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: scoreColor(r.score) }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{r.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                      {r.current_title && <span>{r.current_title}</span>}
                      {r.current_company && <span className="text-gray-300">@ {r.current_company}</span>}
                    </div>
                    <div className="text-xs text-gray-300 flex items-center gap-2 mt-0.5">
                      {r.email && <span>{r.email}</span>}
                      {r.phone && <span>· {r.phone}</span>}
                      {r.location && <span>· {r.location}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold leading-none" style={{ color: scoreColor(r.score) }}>{r.score}</div>
                    <div className="text-xs text-gray-400">/100</div>
                  </div>
                  <span className={`badge text-xs font-semibold px-2.5 py-1 flex-shrink-0
                    ${r.recommendation === "Proceed" ? "bg-teal/10 text-teal" : r.recommendation === "Maybe" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                    {r.recommendation === "Proceed" ? "✓ Proceed" : r.recommendation === "Maybe" ? "~ Maybe" : "✕ Pass"}
                  </span>
                  {r.added ? (
                    <span className="flex items-center gap-1 text-teal text-xs font-medium flex-shrink-0"><CheckCircle size={13} /> Added</span>
                  ) : (
                    <button onClick={() => addToPipeline(i)} disabled={r.adding}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal/30 text-teal text-xs font-medium hover:bg-teal/5 transition-all disabled:opacity-50">
                      {r.adding ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                      {r.adding ? "Adding..." : "Add to pipeline"}
                    </button>
                  )}
                </div>
                <div className="px-4 pb-2">
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: scoreColor(r.score) }} />
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <p className="text-sm text-gray-600 leading-relaxed">{r.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                  {r.strengths?.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-3">
                      <div className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5"><CheckCircle size={11} /> Strengths</div>
                      <ul className="space-y-1">
                        {r.strengths.map((s, j) => <li key={j} className="text-xs text-green-800 flex gap-2"><span className="flex-shrink-0">•</span>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {r.concerns?.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-3">
                      <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5"><AlertCircle size={11} /> Areas to probe</div>
                      <ul className="space-y-1">
                        {r.concerns.map((c, j) => <li key={j} className="text-xs text-amber-800 flex gap-2"><span className="flex-shrink-0">•</span>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TALENT POOL INSIGHT ── */}
      {tab === "insight" && (
        <div className="space-y-5 max-w-4xl">
          {!insightData && !insightLoading && (
            <div className="card text-center py-16">
              <Users size={40} className="mx-auto mb-4 text-gray-200" />
              <h3 className="font-semibold text-gray-900 mb-2">Scan your talent pool</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                AI will review every candidate in your database and identify who fits this role — before you post anywhere.
              </p>
              <button onClick={() => loadInsight()}
                className="btn-primary flex items-center gap-2 mx-auto">
                <Brain size={15} /> Scan database now
              </button>
            </div>
          )}

          {insightLoading && (
            <div className="card text-center py-16">
              <Loader2 size={28} className="animate-spin mx-auto mb-3 text-teal" />
              <p className="text-gray-500 text-sm">{scanProgress || "AI is reviewing your talent pool..."}</p>
              <p className="text-gray-400 text-xs mt-1">This takes 30–60 seconds — please keep this tab open</p>
            </div>
          )}

          {insightData && !insightLoading && (
            <>
              {/* Summary */}
              <div className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain size={16} className="text-teal" />
                    <h3 className="font-semibold text-gray-900">Talent Pool Report</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {insightCachedAt && (
                      <span className="text-xs text-gray-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
                        {(() => {
                          const mins = Math.round((Date.now() - new Date(insightCachedAt).getTime()) / 60000)
                          if (mins < 1) return "Just now"
                          if (mins < 60) return `${mins}m ago`
                          return `${Math.round(mins / 60)}h ago`
                        })()}
                      </span>
                    )}
                    {insightData?.deeper_search_available && (
                      <button onClick={() => loadInsight(true)} disabled={deeperSearching}
                        className="text-xs text-gray-400 hover:text-teal transition-colors flex items-center gap-1">
                        {deeperSearching ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
                        {deeperSearching ? "Searching wider…" : "Deeper search"}
                      </button>
                    )}
                    <button
                      onClick={() => loadInsight(false, true)}
                      disabled={insightLoading}
                      title="Run a fresh AI scan — updates the saved results"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal/10 text-teal border border-teal/20 hover:bg-teal/20 hover:border-teal/40 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {insightLoading
                        ? <><Loader2 size={11} className="animate-spin" />Scanning…</>
                        : <><RefreshCw size={11} />Rescan</>
                      }
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{insightData.summary}</p>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-gray-900">{insightData.total_available || 0}</div>
                    <div className="text-xs text-gray-500 mt-0.5">In database</div>
                  </div>
                  <div className="bg-teal/5 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-teal">{insightData.strong_matches?.length || 0}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Strong matches</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-amber-600">{insightData.possible_matches?.length || 0}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Possible matches</div>
                  </div>
                </div>
              </div>

              {/* Strong matches */}
              {insightData.strong_matches?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Strong matches</h3>
                    {insightData.strong_matches.length > 1 && (
                      <button onClick={() => insightData.strong_matches.forEach((c: any) => addFromInsight(c))}
                        className="btn-primary text-sm flex items-center gap-2">
                        <UserPlus size={13} /> Add all {insightData.strong_matches.length} to pipeline
                      </button>
                    )}
                  </div>
                  {insightData.strong_matches.map((c: any) => (
                    <div key={c.id} className="card p-4">
                      <div className="flex items-start gap-3">
                        <CandidateAvatar name={c.name || "?"} avatarUrl={c.avatar_url} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">{c.name}</span>
                            {c.trajectory === "Rising" && <span className="text-xs text-green-600 font-medium">↑ Rising</span>}
                            {c.trajectory === "Lateral" && <span className="text-xs text-gray-400 font-medium">→ Lateral</span>}
                            {c.trajectory === "Declining" && <span className="text-xs text-amber-500 font-medium">↓ Declining</span>}
                            {c.avg_tenure && c.avg_tenure < 1.5 && <span className="text-xs text-amber-500 font-medium">⚠ Avg {c.avg_tenure}yr tenure</span>}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {c.current_title}{c.current_company ? ` @ ${c.current_company}` : ""}{c.location ? ` · ${c.location}` : ""}
                            {c.total_years ? ` · ${c.total_years}yrs exp` : ""}
                          </div>
                          {c.candidate?.source && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mt-1 ${SOURCE_COLORS[c.candidate.source] || "bg-gray-100 text-gray-600"}`}>
                              {SOURCE_LABELS[c.candidate.source] || c.candidate.source}
                            </span>
                          )}
                          <div className="text-xs text-teal mt-1 italic">{c.reason}</div>
                          {/* Gap indicators */}
                          {c.gaps && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {c.gaps.present?.slice(0,4).map((p: string, i: number) => (
                                <span key={i} className="inline-flex items-center gap-0.5 text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">✓ {p}</span>
                              ))}
                              {c.gaps.partial?.slice(0,2).map((p: string, i: number) => (
                                <span key={i} className="inline-flex items-center gap-0.5 text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">~ {p}</span>
                              ))}
                              {c.gaps.missing_hard?.slice(0,3).map((p: string, i: number) => (
                                <span key={i} className="inline-flex items-center gap-0.5 text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">✗ {p}</span>
                              ))}
                              {c.gaps.missing_soft?.slice(0,2).map((p: string, i: number) => (
                                <span key={i} className="inline-flex items-center gap-0.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">○ {p}</span>
                              ))}
                            </div>
                          )}
                          {/* Skills */}
                          {c.all_skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {c.all_skills.slice(0, 5).map((skill: string, i: number) => (
                                <span key={i} className="badge bg-gray-100 text-gray-600 text-xs">{skill}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-lg font-bold text-teal">{c.score}</div>
                            <div className="text-xs text-gray-400">/100</div>
                          </div>
                          <button onClick={() => addFromInsight(c)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal/30 text-teal text-xs font-medium hover:bg-teal/5 transition-all whitespace-nowrap">
                            <UserPlus size={12} /> Add to pipeline
                          </button>
                          <a href={`/internal/candidates/${c.id}`} className="text-xs text-gray-400 hover:text-teal transition-colors">View profile →</a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Possible matches */}
              {insightData.possible_matches?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Possible matches</h3>
                  {insightData.possible_matches.map((c: any) => (
                    <div key={c.id} className="card flex items-center gap-4 opacity-90">
                      <CandidateAvatar name={c.name || "?"} avatarUrl={c.avatar_url} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {c.current_title}{c.current_company ? ` @ ${c.current_company}` : ""}
                        </div>
                        <div className="text-xs text-amber-600 mt-1 italic">{c.reason}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-lg font-bold text-amber-600">{c.score}</div>
                          <div className="text-xs text-gray-400">/100</div>
                        </div>
                        <button onClick={() => addFromInsight(c)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-600 text-xs font-medium hover:bg-amber-50 transition-all">
                          <UserPlus size={12} /> Add to pipeline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {insightData.strong_matches?.length === 0 && insightData.possible_matches?.length === 0 && (
                <div className="card text-center py-12">
                  <Users size={32} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-500">No matches found in current talent pool.</p>
                  <p className="text-gray-400 text-sm mt-1">Try a deeper search to cast a wider net, or import more CVs.</p>
                  <div className="flex gap-3 justify-center mt-4">
                    {insightData.deeper_search_available && (
                      <button onClick={() => loadInsight(true)} disabled={deeperSearching}
                        className="btn-secondary flex items-center gap-2 text-sm">
                        {deeperSearching ? <><Loader2 size={13} className="animate-spin" /> Searching wider…</> : <><Search size={13} /> Deeper search</>}
                      </button>
                    )}
                    <a href="/internal/database" className="btn-primary inline-flex items-center gap-2 text-sm">
                      <Upload size={14} /> Import CVs
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── SINGLE SCORER ── */}
      {/* ── LINKEDIN SOURCE TAB ── */}
      {tab === "source" && (
        <div className="space-y-5 max-w-3xl">
          {/* Search fields */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Link2 size={15} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Search LinkedIn</h3>
                <p className="text-xs text-gray-400 mt-0.5">Pre-filled from mandate — tweak and search. Each search costs ~3 credits.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Job Title</label>
                <input
                  value={linkedinSearch.title}
                  onChange={e => setLinkedinSearch(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                  placeholder="e.g. CFO"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Location</label>
                <input
                  value={linkedinSearch.location}
                  onChange={e => setLinkedinSearch(p => ({ ...p, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                  placeholder="e.g. Egypt"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Keywords</label>
                <input
                  value={linkedinSearch.keywords}
                  onChange={e => setLinkedinSearch(p => ({ ...p, keywords: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                  placeholder="e.g. FMCG, P&L"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => runLinkedinSearch()}
                disabled={!linkedinSearch.title.trim() || linkedinSearching}
                className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {linkedinSearching ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                {linkedinSearching ? "Searching..." : "Search LinkedIn"}
              </button>
              {linkedinCachedAt && (
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Cached {new Date(linkedinCachedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  <button onClick={() => runLinkedinSearch(true)} className="text-teal hover:underline ml-1">Refresh</button>
                </span>
              )}
            </div>
          </div>

          {/* Results */}
          {linkedinResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">{linkedinResults.length} profiles found</h3>
                <span className="text-xs text-gray-400">Click "Add to pipeline" to enrich and save — costs 1 credit each</span>
              </div>
              {linkedinResults.map((result, idx) => (
                <div key={idx} className="card p-4 flex items-start gap-3 hover:shadow-sm transition-shadow">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {result.avatar_url ? (
                      <img src={result.avatar_url} alt={result.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-blue-700 font-bold text-sm">{result.name?.charAt(0)?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{result.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {result.current_title}{result.current_company ? ` @ ${result.current_company}` : ""}
                          {result.location ? ` · ${result.location}` : ""}
                        </div>
                        {result.headline && result.headline !== result.current_title && (
                          <div className="text-xs text-gray-400 mt-1 italic truncate">{result.headline}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {result.linkedin_url && (
                          <a href={result.linkedin_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors">
                            <ExternalLink size={11} /> View
                          </a>
                        )}
                        {linkedinAdded[idx] ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                            <CheckCircle size={12} /> Added
                          </span>
                        ) : linkedinError[idx] ? (
                          <span className="text-xs text-red-500 max-w-[140px] text-right">{linkedinError[idx]}</span>
                        ) : (
                          <button
                            onClick={() => enrichAndAdd(result, idx)}
                            disabled={linkedinEnriching[idx]}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal/30 text-teal text-xs font-medium hover:bg-teal/5 transition-all disabled:opacity-50"
                          >
                            {linkedinEnriching[idx] ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                            {linkedinEnriching[idx] ? "Adding..." : "Add to pipeline"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!linkedinResults.length && !linkedinSearching && (
            <div className="card border-dashed text-center py-16">
              <Link2 size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 text-sm">Search LinkedIn to find candidates for this mandate</p>
              <p className="text-gray-300 text-xs mt-1">Results are cached — you won't be charged twice for the same search</p>
            </div>
          )}
        </div>
      )}

      {tab === "ai" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Brain size={16} className="text-teal" /> Score a single CV</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Candidate Name (optional)</label>
              <input value={candidateName} onChange={e => setCandidateName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Paste CV text</label>
              <textarea value={cvText} onChange={e => setCvText(e.target.value)} rows={12}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
                placeholder="Paste the full CV text here..." />
            </div>
            <button onClick={scoreCV} disabled={!cvText || scoring} className="btn-primary w-full flex items-center justify-center gap-2">
              {scoring ? <><Loader2 size={15} className="animate-spin" /> Scoring...</> : <><Brain size={15} /> Score this CV</>}
            </button>
          </div>
          <div>
            {scoreResult && !scoreResult.error ? (
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{candidateName || "Candidate"}</h3>
                  <div className="flex items-end gap-1">
                    <div className="text-4xl font-bold" style={{ color: scoreColor(scoreResult.score) }}>{scoreResult.score}</div>
                    <div className="text-gray-400 text-sm mb-1">/100</div>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${scoreResult.score}%`, background: scoreColor(scoreResult.score) }} />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{scoreResult.summary}</p>
                <div className="grid grid-cols-2 gap-3">
                  {scoreResult.strengths?.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1.5"><CheckCircle size={12} /> Strengths</div>
                      <ul className="space-y-1">{scoreResult.strengths.map((s: string, i: number) => <li key={i} className="text-xs text-green-800 flex gap-2"><span>•</span>{s}</li>)}</ul>
                    </div>
                  )}
                  {scoreResult.concerns?.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5"><AlertCircle size={12} /> Areas to probe</div>
                      <ul className="space-y-1">{scoreResult.concerns.map((c: string, i: number) => <li key={i} className="text-xs text-amber-800 flex gap-2"><span>•</span>{c}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
            ) : scoreResult?.error ? (
              <div className="card"><p className="text-red-500 text-sm">{scoreResult.error}</p></div>
            ) : (
              <div className="card border-dashed text-center py-20">
                <Brain size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 text-sm">Paste a CV on the left and click Score</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete mandate confirmation modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-bold text-gray-900 text-lg">Delete "{mandate.title}"?</h3>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              This permanently deletes the mandate and every candidate in its pipeline,
              talent pool scan history, client commentary, and client portal access.
              There's no undo.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200">
                Cancel
              </button>
              <button
                onClick={deleteMandate}
                disabled={deletingMandate}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "#dc2626" }}>
                {deletingMandate ? <><Loader2 size={14} className="animate-spin" /> Deleting...</> : <><Trash2 size={14} /> Delete permanently</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

