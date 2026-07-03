import { redirect } from "next/navigation"

// CV Builder is temporarily offline while we develop the new experience.
// All visitors are sent to the branded Coming Soon page. The full builder
// implementation is preserved in git history and will be restored at launch.
export default function CvBuilderPage() {
  redirect("/cv-coming-soon")
}
