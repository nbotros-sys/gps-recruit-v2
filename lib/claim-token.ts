// Stateless, signed claim tokens for candidate account activation.
// HMAC-SHA256 over {cid,email,exp} using the service-role key as secret.
// No DB storage needed; expiry is embedded and verified server-side.
import crypto from "crypto"

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-secret-change-me"
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
function fromB64url(s: string): Buffer {
  let t = s.replace(/-/g, "+").replace(/_/g, "/")
  while (t.length % 4) t += "="
  return Buffer.from(t, "base64")
}
function sign(payloadB64: string): string {
  return b64url(crypto.createHmac("sha256", SECRET).update(payloadB64).digest())
}

export function signClaimToken(candidateId: string, email: string): string {
  const payload = { cid: candidateId, email: (email || "").toLowerCase(), exp: Date.now() + TTL_MS }
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)))
  return `${payloadB64}.${sign(payloadB64)}`
}

export function verifyClaimToken(token: string): { cid: string; email: string } | null {
  try {
    const [payloadB64, sig] = (token || "").split(".")
    if (!payloadB64 || !sig) return null
    const expected = sign(payloadB64)
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
    const payload = JSON.parse(fromB64url(payloadB64).toString("utf8"))
    if (!payload.exp || Date.now() > payload.exp) return null
    return { cid: payload.cid, email: payload.email }
  } catch {
    return null
  }
}
