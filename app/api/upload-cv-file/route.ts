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

    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf"
    const contentType = ext === "pdf" ? "application/pdf"
      : ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : ext === "doc" ? "application/msword"
      : "application/octet-stream"

    const bytes = await file.arrayBuffer()
    const storagePath = `${candidateId}/cv.${ext}`

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: uploadError } = await supabase.storage
      .from("cv-files")
      .upload(storagePath, bytes, {
        contentType,
        upsert: true,
        cacheControl: "3600",
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("cv-files")
      .getPublicUrl(storagePath)

    const cv_file_url = `${urlData.publicUrl}?t=${Date.now()}`

    await supabase.from("candidates").update({
      cv_file_url,
      cv_file_type: ext,
    }).eq("id", candidateId)

    return NextResponse.json({ cv_file_url })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
