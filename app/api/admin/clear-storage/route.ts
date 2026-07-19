import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireStaff } from "@/lib/require-staff"

// ONE-TIME admin utility: clears all files from the CV/avatar buckets after a
// database wipe leaves them orphaned. Staff-only. Remove after use.
const BUCKETS = ["avatars", "cv-files", "cv-pdfs"]

export async function POST() {
  const gate = await requireStaff()
  if (!gate.ok) return gate.response

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const results: Record<string, number> = {}

  for (const bucket of BUCKETS) {
    const paths: string[] = []

    const walk = async (prefix: string) => {
      const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 })
      if (error || !data) return
      for (const item of data) {
        const path = prefix ? `${prefix}/${item.name}` : item.name
        if ((item as any).id === null) {
          await walk(path)
        } else {
          paths.push(path)
        }
      }
    }

    await walk("")

    let removed = 0
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100)
      const { error } = await admin.storage.from(bucket).remove(chunk)
      if (!error) removed += chunk.length
    }
    results[bucket] = removed
  }

  return NextResponse.json({ ok: true, removed: results })
}
