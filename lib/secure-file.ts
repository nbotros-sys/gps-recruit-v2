// Shared helper: turn a stored Supabase public URL (or a bucket/path) into a
// short-lived signed URL via the authorised /api/file-url route. Buckets are
// private, so this is the only way authorised users reach files. The visible
// UI is unchanged — callers still open the same file; only the link source moves.

const BUCKETS = ["avatars", "cv-files", "cv-pdfs"] as const

// Extract { bucket, path } from a stored Supabase storage URL.
// Public URLs look like:  .../storage/v1/object/public/<bucket>/<path>?<query>
// Signed URLs look like:  .../storage/v1/object/sign/<bucket>/<path>?<query>
export function parseStorageUrl(
  url: string | null | undefined
): { bucket: string; path: string } | null {
  if (!url) return null
  try {
    const clean = url.split("?")[0]
    const marker = clean.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/)
    if (marker) {
      const bucket = decodeURIComponent(marker[1])
      const path = decodeURIComponent(marker[2])
      if ((BUCKETS as readonly string[]).includes(bucket)) return { bucket, path }
    }
  } catch {
    /* fall through */
  }
  return null
}

// Given a stored URL, return a fresh signed URL the current user is allowed to open.
// Returns null if the reference can't be resolved or the user isn't authorised.
export async function getSignedFileUrl(
  storedUrl: string | null | undefined
): Promise<string | null> {
  const ref = parseStorageUrl(storedUrl)
  if (!ref) return null
  try {
    const res = await fetch("/api/file-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(ref),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.url ?? null
  } catch {
    return null
  }
}

// Open a stored file in a new tab via a signed URL. Falls back to the stored URL
// only if signing fails (so nothing is worse than before during rollout).
export async function openSecureFile(storedUrl: string | null | undefined) {
  const signed = await getSignedFileUrl(storedUrl)
  const target = signed || storedUrl
  if (target) window.open(target, "_blank", "noopener,noreferrer")
}
