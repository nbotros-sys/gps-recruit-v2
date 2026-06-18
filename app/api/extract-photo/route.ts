import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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

    // Dynamic import jszip
    const JSZip = (await import("jszip")).default
    const zip = await JSZip.loadAsync(buffer)

    // Find images in word/media/
    const imageEntries: { name: string; data: Uint8Array; size: number }[] = []

    for (const [filePath, zipEntry] of Object.entries(zip.files) as any[]) {
      if (filePath.startsWith("word/media/") && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filePath)) {
        const data: Buffer = await zipEntry.async("nodebuffer")
        imageEntries.push({ name: filePath, data: new Uint8Array(data), size: data.length })
      }
    }

    if (!imageEntries.length) {
      console.log("No images found in docx")
      return NextResponse.json({ avatar_url: null })
    }

    // Use largest image
    imageEntries.sort((a, b) => b.size - a.size)
    const photo = imageEntries[0]
    console.log(`Found photo: ${photo.name} (${photo.size} bytes)`)

    const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg"
    const mimeType = ext === "png" ? "image/png" : "image/jpeg"
    const storagePath = `${candidateId}/avatar.${ext}`

    // Use service role client for storage — bypasses RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(storagePath, photo.data, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadError) {
      console.error("Upload error:", uploadError.message)
      return NextResponse.json({ avatar_url: null })
    }

    console.log("Upload success:", uploadData)

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(storagePath)

    const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`
    console.log("Public URL:", avatar_url)

    // Update candidate
    const { error: updateError } = await supabase
      .from("candidates")
      .update({ avatar_url })
      .eq("id", candidateId)

    if (updateError) console.error("Update error:", updateError.message)

    return NextResponse.json({ avatar_url })
  } catch (err: any) {
    console.error("Photo extraction error:", err?.message || err)
    return NextResponse.json({ avatar_url: null })
  }
}
