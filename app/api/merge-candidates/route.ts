import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { keepId, discardId } = await req.json()
    if (!keepId || !discardId) return NextResponse.json({ error: "Missing IDs" }, { status: 400 })

    const supabase = createClient()

    const { data: keep } = await supabase.from("candidates").select("*").eq("id", keepId).single()
    const { data: discard } = await supabase.from("candidates").select("*").eq("id", discardId).single()
    if (!keep || !discard) return NextResponse.json({ error: "Candidates not found" }, { status: 404 })

    const keepTags: string[] = keep.tags || []
    const discardTags: string[] = discard.tags || []
    const allTags = keepTags.concat(discardTags)
    const uniqueTags: string[] = allTags.filter((tag, index) => allTags.indexOf(tag) === index)

    const merged = {
      name: keep.name || discard.name,
      email: keep.email?.includes("@pending.com") ? discard.email : keep.email || discard.email,
      phone: keep.phone || discard.phone,
      current_title: keep.current_title || discard.current_title,
      current_company: keep.current_company || discard.current_company,
      location: keep.location || discard.location,
      avatar_url: keep.avatar_url || discard.avatar_url,
      cv_text: (keep.cv_text || "").length >= (discard.cv_text || "").length
        ? keep.cv_text : discard.cv_text,
      tags: uniqueTags,
      notes: [keep.notes, discard.notes].filter(Boolean).join(" | ") || null,
    }

    await supabase.from("candidates").update(merged).eq("id", keepId)

    const { data: keepApps } = await supabase
      .from("applications")
      .select("mandate_id, ai_score, id")
      .eq("candidate_id", keepId)

    const { data: discardApps } = await supabase
      .from("applications")
      .select("mandate_id, ai_score, id")
      .eq("candidate_id", discardId)

    const keepMandates: string[] = (keepApps || []).map((a: any) => a.mandate_id)

    for (const app of (discardApps || [])) {
      if (keepMandates.indexOf(app.mandate_id) !== -1) {
        const keepApp = (keepApps || []).find((a: any) => a.mandate_id === app.mandate_id)
        if (keepApp && (app.ai_score || 0) > (keepApp.ai_score || 0)) {
          await supabase.from("applications").delete().eq("id", keepApp.id)
          await supabase.from("applications").update({ candidate_id: keepId }).eq("id", app.id)
        } else {
          await supabase.from("applications").delete().eq("id", app.id)
        }
      } else {
        await supabase.from("applications").update({ candidate_id: keepId }).eq("id", app.id)
      }
    }

    await supabase.from("candidates").delete().eq("id", discardId)

    return NextResponse.json({ success: true, merged })
  } catch (err) {
    console.error("Merge error:", err)
    return NextResponse.json({ error: "Merge failed" }, { status: 500 })
  }
}
