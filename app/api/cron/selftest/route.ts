import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import manifest from "@/lib/route-manifest.json"
import { sendSelfTestReport } from "@/lib/emails"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://recruit.gps4hr.com"

// Ping a URL; return the HTTP status, or 0 for no response / timeout / crash.
async function ping(url: string): Promise<number> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal })
    clearTimeout(t)
    return res.status
  } catch {
    clearTimeout(t)
    return 0
  }
}

// Run tasks with limited concurrency to stay within the function time budget.
async function runPool<T>(items: T[], fn: (item: T) => Promise<void>, concurrency = 8) {
  let i = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx]) }
  })
  await Promise.all(workers)
}

// Daily health check (see vercel.json). Pings every static page + endpoint,
// checks the database and the email domain, and emails a report.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const failures: { name: string, detail: string }[] = []
  let passed = 0

  const staticPages = manifest.pages.filter((p: any) => !p.dynamic)
  const staticEndpoints = manifest.endpoints.filter((e: any) => !e.dynamic && !e.path.startsWith("/api/cron"))

  // Pages: a clean load is expected (redirects to login are fine). 0 or 5xx = broken.
  await runPool(staticPages, async (p: any) => {
    const status = await ping(`${BASE_URL}${p.path}`)
    if (status === 0 || status >= 500) failures.push({ name: `Page ${p.path}`, detail: status === 0 ? "no response / timeout" : `HTTP ${status}` })
    else passed++
  })

  // Endpoints: often need auth or input, so any HTTP response means the route is
  // alive. Only "no response" (crash / timeout) counts as broken.
  await runPool(staticEndpoints, async (e: any) => {
    const status = await ping(`${BASE_URL}${e.path}`)
    if (status === 0) failures.push({ name: `Endpoint ${e.path}`, detail: "no response / timeout" })
    else passed++
  })

  // Database reachable
  try {
    const { error } = await getAdmin().from("staff_users").select("id").limit(1)
    if (error) failures.push({ name: "Database", detail: error.message })
    else passed++
  } catch (e: any) { failures.push({ name: "Database", detail: String(e?.message || e) }) }

  // Email domain verified in Resend (the exact thing that broke sending before)
  try {
    const key = process.env.RESEND_API_KEY
    if (!key) failures.push({ name: "Email (Resend)", detail: "RESEND_API_KEY not set" })
    else {
      const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } })
      const j: any = await r.json()
      const d = (j?.data || []).find((x: any) => x.name === "gps4hr.com")
      if (!d) failures.push({ name: "Email domain", detail: "gps4hr.com not found in Resend" })
      else if (d.status !== "verified") failures.push({ name: "Email domain", detail: `gps4hr.com status: ${d.status}` })
      else passed++
    }
  } catch (e: any) { failures.push({ name: "Email domain", detail: String(e?.message || e) }) }

  try {
    await sendSelfTestReport({
      passed, failed: failures.length, failures,
      totalPages: staticPages.length, totalEndpoints: staticEndpoints.length,
      dynamicCount: manifest.pages.filter((p: any) => p.dynamic).length + manifest.endpoints.filter((e: any) => e.dynamic).length,
    })
  } catch (e) { console.error("self-test report email failed:", e) }

  return NextResponse.json({ passed, failed: failures.length, failures })
}
