import { createClient as createAdminClient } from "@supabase/supabase-js"

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type NotificationType =
  | "stage_changed"
  | "candidate_placed"
  | "cv_scored"
  | "candidate_added"
  | "mandate_created"
  | "commentary_sent"
  | "scan_complete"
  | "new_client"

export async function createNotification({
  type,
  title,
  message,
  link,
}: {
  type: NotificationType
  title: string
  message: string
  link?: string
}) {
  try {
    const supabase = getAdmin()
    await supabase.from("notifications").insert([{ type, title, message, link: link || null }])
  } catch (e) {
    console.error("createNotification error:", e)
  }
}

export async function createTask({
  title,
  description,
  assigned_to,
  due_date,
  link,
  link_label,
}: {
  title: string
  description?: string
  assigned_to?: string
  due_date?: string
  link?: string
  link_label?: string
}) {
  try {
    const supabase = getAdmin()
    await supabase.from("tasks").insert([{
      title,
      description: description || null,
      assigned_to: assigned_to || null,
      due_date: due_date || null,
      link: link || null,
      link_label: link_label || null,
      auto_generated: true,
    }])
  } catch (e) {
    console.error("createTask error:", e)
  }
}

export function dueDateDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}
