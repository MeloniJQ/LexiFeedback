/**
 * LexiFeed API Client — Step 1 Update
 *
 * New functions:
 *   startInterview()        → POST /interview/start  (multipart — resume + metadata)
 *   getFollowupQuestion()   → POST /interview/followup
 *
 * Kept unchanged:
 *   submitPracticeFeedback, getPracticeSessions, getPracticeStats, uploadResume, generateInterview
 */

import { getToken } from './auth'

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:5000/api`
  }
  return 'http://localhost:5000/api'
}

export const API_URL = getApiUrl()

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

 export async function apiCall(url: string, options: RequestInit = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  } as Record<string, string>
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error ?? `API error: ${response.status}`)
  }
  return response.json()
}

// ─── Step 1: Start interview with resume ─────────────────────────────────────

export interface StartInterviewParams {
  company: string
  role: string
  jobDescription?: string
  keySkills?: string
  resume?: File | null
}

export interface Question {
  id: number
  type: 'behavioral' | 'technical' | 'situational' | 'culture-fit' | 'resume-specific'
  question: string
  hint: string
}

export interface StartInterviewResponse {
  questions: Question[]
  resume_parsed: boolean
  company: string
  role: string
}

export async function startInterview(
  params: StartInterviewParams
): Promise<StartInterviewResponse> {
  const token = getToken()
  const formData = new FormData()
  formData.append('company',         params.company)
  formData.append('role',            params.role)
  formData.append('job_description', params.jobDescription ?? '')
  formData.append('key_skills',      params.keySkills ?? '')
  if (params.resume) formData.append('resume', params.resume)

  const response = await fetch(`${API_URL}/interview/start`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    formData,
  })

  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Failed to start interview')
  return data
}

// ─── Step 1: Get AI follow-up question ───────────────────────────────────────

export interface FollowupParams {
  original_question: string
  candidate_answer: string
  company: string
  role: string
}

export interface FollowupResponse {
  followup: string
  reason: string
}

export async function getFollowupQuestion(
  params: FollowupParams
): Promise<FollowupResponse> {
  return apiCall(`${API_URL}/interview/followup`, {
    method: 'POST',
    body:   JSON.stringify(params),
  })
}

// ─── Existing endpoints (unchanged) ──────────────────────────────────────────

export async function generateInterview(data: { company: string; role: string }) {
  return apiCall(`${API_URL}/interview/generate`, {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}

export async function uploadResume(file: File) {
  const formData = new FormData()
  formData.append('resume', file)
  const token = getToken()
  const response = await fetch(`${API_URL}/interview/upload-resume`, {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    formData,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error ?? `API error: ${response.status}`)
  }
  return response.json()
}

export async function submitPracticeFeedback(data: {
  transcript: string
  company: string
  role: string
  session_type?: string
  title?: string
}) {
  return apiCall(`${API_URL}/interview/feedback`, {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}

export async function getPracticeSessions(session_type?: string) {
  const url = session_type
    ? `${API_URL}/interview/sessions?session_type=${encodeURIComponent(session_type)}`
    : `${API_URL}/interview/sessions`
  return apiCall(url, { method: 'GET' })
}

export async function getPracticeStats() {
  return apiCall(`${API_URL}/interview/stats`, { method: 'GET' })
}
