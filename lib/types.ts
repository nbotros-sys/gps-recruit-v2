export type MandateStatus = "active" | "on_hold" | "closed" | "filled"
export type CandidateStage = "new" | "screening" | "interview" | "shortlisted" | "offered" | "placed" | "rejected"
export type UserRole = "recruiter" | "candidate" | "client"

export interface Mandate {
  id: string
  title: string
  client_id: string | null
  client_name?: string
  location: string
  salary_range: string
  job_description: string
  status: MandateStatus
  created_by: string | null
  created_at: string
  updated_at: string
  _count?: { applications: number }
  talent_pool_cache?: any
  talent_pool_cached_at?: string | null
}

export interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  current_title?: string
  current_company?: string
  location?: string
  cv_url?: string
  cv_text?: string
  tags: string[]
  source: string
  linkedin_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  candidate_id: string
  mandate_id: string
  stage: CandidateStage
  ai_score?: number
  ai_summary?: string
  ai_strengths?: string[]
  ai_concerns?: string[]
  notes?: string
  created_at: string
  updated_at: string
  candidate?: Candidate
  mandate?: Mandate
}

export interface Client {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone?: string
  industry?: string
  notes?: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: "cv_scored" | "stage_changed" | "mandate_created" | "new_application"
  title: string
  message: string
  read: boolean
  link?: string
  created_at: string
}
