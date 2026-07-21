import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { requireStaff } from "@/lib/require-staff"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Operations that run once per candidate as they move through the pipeline.
// Used to derive an approximate "cost per candidate processed".
const PER_CANDIDATE_OPS = ["extract-cv", "build-profile", "score-cv", "embedding"]

export async function GET(req: NextRequest) {
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const month =
    searchParams.get("month") ||
    now.getUTCFullYear() + "-" + String(now.getUTCMonth() + 1).padStart(2, "0")
  const start = new Date(month + "-01T00:00:00Z")
  if (isNaN(start.getTime())) {
    return NextResponse.json({ error: "Bad month" }, { status: 400 })
  }
  const end = new Date(start)
  end.setUTCMonth(end.getUTCMonth() + 1)

  const admin = getAdmin()
  const { data, error } = await admin
    .from("ai_usage")
    .select("model, operation, input_tokens, output_tokens, cost_usd, candidate_id")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .limit(200000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []
  let totalCost = 0,
    totalIn = 0,
    totalOut = 0
  const byModel: Record<string, any> = {}
  const byOp: Record<string, any> = {}
  const candSet = new Set<string>()

  for (const r of rows) {
    const c = Number(r.cost_usd) || 0
    totalCost += c
    totalIn += r.input_tokens || 0
    totalOut += r.output_tokens || 0
    const m = byModel[r.model] || (byModel[r.model] = { model: r.model, cost: 0, calls: 0, inTok: 0, outTok: 0 })
    m.cost += c
    m.calls++
    m.inTok += r.input_tokens || 0
    m.outTok += r.output_tokens || 0
    const o = byOp[r.operation] || (byOp[r.operation] = { operation: r.operation, cost: 0, calls: 0 })
    o.cost += c
    o.calls++
    if (r.candidate_id) candSet.add(r.candidate_id)
  }

  const models = Object.values(byModel).sort((a: any, b: any) => b.cost - a.cost)
  const operations = Object.values(byOp)
    .map((v: any) => ({ ...v, avgCost: v.calls ? v.cost / v.calls : 0 }))
    .sort((a: any, b: any) => b.cost - a.cost)
  const perCandidateUnit = operations
    .filter((o: any) => PER_CANDIDATE_OPS.includes(o.operation))
    .reduce((s: number, o: any) => s + o.avgCost, 0)

  return NextResponse.json({
    month,
    totalCost,
    totalIn,
    totalOut,
    callCount: rows.length,
    models,
    operations,
    distinctCandidates: candSet.size,
    perCandidateUnit,
  })
}
