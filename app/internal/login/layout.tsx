import type { ReactNode } from "react"

// This layout intentionally overrides the InternalLayout shell
// so the login page renders full-screen with no sidebar or header.
export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
