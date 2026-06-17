import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const candidateId = formData.get("candidateId") as string

    if (!file || !candidateId) {
      return NextResponse.json({ avatar_url: null })
    }

    const fileName = file.name.toLowerCase()

    // Only extract from docx files
    if (!fileName.endsWith(".docx") && !fileName.endsWith(".doc")) {
      return NextResponse.json({ avatar_url: null })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // docx is a zip file — look for images in word/media/
    const JSZip = require("jszip")
    const zip = await JSZip.loadAsync(buffer)

    // Find images in word/media/ folder
    const imageFiles: { name: string; data: Buffer }[] = []
    for (const [path, zipFile] of Object.entries(zip.files) as any[]) {
      if (path.startsWith("word/media/") && path.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
        const data = await zipFile.async("nodebuffer")
        imageFiles.push({ name: path, data })
      }
    }

    if (!imageFiles.length) {
      return NextResponse.json({ avatar_url: null })
    }

    // Use the first/largest image (most likely the profile photo)
    const photo = imageFiles.sort((a, b) => b.data.length - a.data.length)[0]
    const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg"
    const mimeType = ext === "png" ? "image/png" : "image/jpeg"

    // Upload to Supabase Storage
    const supabase = createClient()
    const filePath = `${candidateId}/avatar.${ext}`

    const { data: uploadData, error } = await supabase.storage
      .from("avatars")
      .upload(filePath, photo.data, {
        contentType: mimeType,
        upsert: true,
      })

    if (error) {
      console.error("Upload error:", error)
      return NextResponse.json({ avatar_url: null })
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath)

    const avatar_url = urlData.publicUrl

    // Update candidate record
    await supabase
      .from("candidates")
      .update({ avatar_url })
      .eq("id", candidateId)

    return NextResponse.json({ avatar_url })
  } catch (err) {
    console.error("Photo extraction error:", err)
    return NextResponse.json({ avatar_url: null })
  }
}
