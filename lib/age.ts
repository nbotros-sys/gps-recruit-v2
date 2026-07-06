// Compute a candidate's current age from a stored date of birth (YYYY-MM-DD).
// Returns null when no/invalid DOB, so callers can simply hide the age.
export function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  if (age < 14 || age > 100) return null // guard against mis-parsed dates
  return age
}
