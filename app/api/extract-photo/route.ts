import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const logs: string[] = []
  
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const candidateId = formData.get("candidateId") as string

    logs.push(`File: ${file?.name}, Size: ${file?.size}, CandidateId: ${candidateId}`)

    if (!file || !candidateId) {
      return NextResponse.json({ avatar_url: null, logs, error: "Missing file or candidateId" })
    }

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith(".docx") && !fileName.endsWith(".doc")) {
      return NextResponse.json({ avatar_url: null, logs, error: "Not a docx file" })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    logs.push(`Buffer size: ${buffer.length}`)

    const JSZip = (await import("jszip")).default
    const zip = await JSZip.loadAsync(buffer)
    
    const allFiles = Object.keys(zip.files)
    logs.push(`Files in zip: ${allFiles.join(", ")}`)
    
    const mediaFiles = allFiles.filter(f => 
      f.startsWith("word/media/") && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(f)
    )
    logs.push(`Media files: ${mediaFiles.join(", ")}`)

    if (!mediaFiles.length) {
      return NextResponse.json({ avatar_url: null, logs, error: "No images in docx" })
    }

    // Get the first image
    const imagePath = mediaFiles[0]
    const imageBuffer: Buffer = await zip.files[imagePath].async("nodebuffer")
    logs.push(`Image size: ${imageBuffer.length} bytes`)

    const ext = imagePath.split(".").pop()?.toLowerCase() || "jpg"
    const mimeType = ext === "png" ? "image/png" : "image/jpeg"
    const storagePath = `${candidateId}/avatar.${ext}`
    logs.push(`Storage path: ${storagePath}`)

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Upload as Blob
    const blob = new Blob([imageBuffer], { type: mimeType })
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(storagePath, blob, {
        contentType: mimeType,
        upsert: true,
        cacheControl: "3600",
      })

    if (uploadError) {
      logs.push(`Upload error: ${uploadError.message}`)
      return NextResponse.json({ avatar_url: null, logs, error: uploadError.message })
    }

    logs.push(`Upload success: ${JSON.stringify(uploadData)}`)

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(storagePath)

    const avatar_url = urlData.publicUrl
    logs.push(`Public URL: ${avatar_url}`)

    // Update candidate record
    const { error: updateError } = await supabase
      .from("candidates")
      .update({ avatar_url })
      .eq("id", candidateId)

    if (updateError) {
      logs.push(`DB update error: ${updateError.message}`)
    } else {
      logs.push("DB updated successfully")
    }

    return NextResponse.json({ avatar_url, logs })

  } catch (err: any) {
    logs.push(`Exception: ${err?.message || String(err)}`)
    console.error("Photo extraction failed:", err)
    return NextResponse.json({ avatar_url: null, logs, error: err?.message })
  }
}
