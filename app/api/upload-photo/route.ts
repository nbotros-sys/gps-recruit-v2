import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const candidateId = formData.get("candidateId") as string

    if (!file || !candidateId) {
      return NextResponse.json({ error: "Missing file or candidateId" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const blob = new Blob([bytes], { type: file.type })
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const storagePath = `${candidateId}/avatar.${ext}`

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(storagePath, blob, {
        contentType: file.type,
        upsert: true,
        cacheControl: "3600",
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(storagePath)

    const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`

    await supabase.from("candidates").update({ avatar_url }).eq("id", candidateId)

    return NextResponse.json({ avatar_url })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
