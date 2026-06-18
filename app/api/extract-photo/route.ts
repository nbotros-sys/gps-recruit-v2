import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const logs: string[] = []
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const candidateId = formData.get("candidateId") as string

    logs.push(`File: ${file?.name}, CandidateId: ${candidateId}`)
    if (!file || !candidateId) return NextResponse.json({ avatar_url: null, logs })

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith(".docx") && !fileName.endsWith(".doc")) {
      return NextResponse.json({ avatar_url: null, logs, note: "Not docx" })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    logs.push(`Buffer: ${buffer.length} bytes`)

    const JSZip = (await import("jszip")).default
    const zip = await JSZip.loadAsync(buffer)
    const allFiles = Object.keys(zip.files)
    logs.push(`Zip files: ${allFiles.filter(f => f.startsWith("word/")).join(", ")}`)

    const mediaFiles = allFiles.filter(f =>
      f.startsWith("word/media/") && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(f)
    )
    logs.push(`Media: ${mediaFiles.join(", ")}`)
    if (!mediaFiles.length) return NextResponse.json({ avatar_url: null, logs, note: "No images" })

    const imgPath = mediaFiles[0]
    const imgBuffer: Buffer = await zip.files[imgPath].async("nodebuffer")
    logs.push(`Image: ${imgPath} (${imgBuffer.length} bytes)`)

    const ext = imgPath.split(".").pop()?.toLowerCase() || "jpg"
    const mimeType = ext === "png" ? "image/png" : "image/jpeg"
    const storagePath = `${candidateId}/avatar.${ext}`

    // Convert to ArrayBuffer to avoid TypeScript Buffer type issues
    const arrayBuf: ArrayBuffer = imgBuffer.buffer.slice(
      imgBuffer.byteOffset,
      imgBuffer.byteOffset + imgBuffer.byteLength
    ) as ArrayBuffer

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(storagePath, arrayBuf, { contentType: mimeType, upsert: true })

    if (uploadError) {
      logs.push(`Upload error: ${uploadError.message}`)
      return NextResponse.json({ avatar_url: null, logs, error: uploadError.message })
    }

    logs.push(`Uploaded: ${JSON.stringify(uploadData)}`)

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(storagePath)
    const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`
    logs.push(`URL: ${avatar_url}`)

    await supabase.from("candidates").update({ avatar_url }).eq("id", candidateId)
    logs.push("DB updated")

    return NextResponse.json({ avatar_url, logs })
  } catch (err: any) {
    logs.push(`Error: ${err?.message}`)
    return NextResponse.json({ avatar_url: null, logs, error: err?.message })
  }
}
