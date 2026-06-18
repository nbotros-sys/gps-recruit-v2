import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const candidateId = formData.get("candidateId") as string

    if (!file || !candidateId) return NextResponse.json({ avatar_url: null })

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith(".docx") && !fileName.endsWith(".doc")) {
      return NextResponse.json({ avatar_url: null })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Dynamic import for jszip
    const JSZip = (await import("jszip")).default
    const zip = await JSZip.loadAsync(buffer)

    // Find images in word/media/
    const imageEntries: { name: string; data: Buffer; size: number }[] = []
    
    for (const [path, zipFile] of Object.entries(zip.files) as any[]) {
      if (path.startsWith("word/media/") && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(path)) {
        const data: Buffer = await zipFile.async("nodebuffer")
        imageEntries.push({ name: path, data, size: data.length })
      }
    }

    if (!imageEntries.length) return NextResponse.json({ avatar_url: null })

    // Use largest image — most likely the profile photo
    imageEntries.sort((a, b) => b.size - a.size)
    const photo = imageEntries[0]
    const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg"
    const mimeType = ext === "png" ? "image/png" : "image/jpeg"

    const supabase = createClient()
    const filePath = `${candidateId}/avatar.${ext}`

    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, photo.data, { contentType: mimeType, upsert: true })

    if (error) {
      console.error("Storage upload error:", error)
      return NextResponse.json({ avatar_url: null })
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath)
    const avatar_url = urlData.publicUrl

    await supabase.from("candidates").update({ avatar_url }).eq("id", candidateId)

    return NextResponse.json({ avatar_url })
  } catch (err) {
    console.error("Photo extraction error:", err)
    return NextResponse.json({ avatar_url: null })
  }
}
