import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import SettingsClient from "./SettingsClient"

export const dynamic = "force-dynamic"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getStaff() {
  try {
    const { data } = await getAdmin()
      .from("staff_users")
      .select("id, email, full_name, role, is_active, created_at")
      .order("created_at", { ascending: true })
    return data || []
  } catch {
    return []
  }
}

async function getMe(): Promise<{ email: string; role: string } | null> {
  try {
    const authClient = createServerSupabaseClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user?.email) return null
    const { data } = await getAdmin()
      .from("staff_users")
      .select("role")
      .eq("email", user.email)
      .maybeSingle()
    return { email: user.email, role: data?.role || "recruiter" }
  } catch {
    return null
  }
}

export default async function SettingsPage() {
  const [staff, me] = await Promise.all([getStaff(), getMe()])
  return (
    <SettingsClient
      initialStaff={staff}
      isAdmin={me?.role === "admin"}
      currentEmail={me?.email || ""}
    />
  )
}
