import { createClient as createAdminClient } from "@supabase/supabase-js"
import SettingsClient from "./SettingsClient"

export const dynamic = "force-dynamic"

async function getStaff() {
  try {
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await supabase
      .from("staff_users")
      .select("id, email, full_name, role, is_active, created_at")
      .order("created_at", { ascending: true })
    return data || []
  } catch {
    return []
  }
}

export default async function SettingsPage() {
  const staff = await getStaff()
  return <SettingsClient initialStaff={staff} />
}
