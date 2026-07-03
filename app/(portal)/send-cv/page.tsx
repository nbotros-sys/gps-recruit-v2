import { redirect } from "next/navigation"

// "Send / review your CV" is temporarily offline while we develop the new
// experience. Visitors are sent to the branded Coming Soon page. The full
// implementation is preserved in git history and will be restored at launch.
export default function SendCvPage() {
  redirect("/cv-coming-soon")
}
