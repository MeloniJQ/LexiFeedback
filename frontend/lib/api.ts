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

const API = getApiUrl()
export const API_URL = API

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiCall(url: string, options: RequestInit = {}) {
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
  numQuestions?: number
}

export interface Question {
  id: string | number
  type: 'behavioral' | 'technical' | 'situational' | 'culture-fit' | 'resume-specific' | string
  question: string
  hint?: string
}

export interface StartInterviewResponse {
  questions: Question[]
  resume_parsed: boolean
  company: string
  role: string
}

export interface GeneratedQuestion {
  question_id: string
  question_text: string
  category: string
  topic?: string
  difficulty?: string
  expected_skills: string[]
  estimated_duration?: string
  expected_keywords: string[]
  project?: string
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface GenerateQuestionsResponse {
  message: string
  questions: GeneratedQuestion[]
}

export interface InterviewSessionData {
  id: number
  user_id: number
  candidate_profile_id: number
  plan_id: number | null
  status: string
  current_difficulty: string | null
  current_topic: string | null
  started_at: string | null
  paused_at: string | null
  completed_at: string | null
  metadata: Record<string, any>
  created_at: string | null
  updated_at: string | null
}

export interface InterviewQuestionHistoryItem {
  id: number
  interview_session_id: number
  question_id: string
  question_text: string
  question_type: string | null
  topic: string | null
  difficulty: string | null
  answer_text: string | null
  is_followup: boolean
  created_at: string | null
}

export interface ConversationMemoryItem {
  id: number
  interview_session_id: number
  memory_type: string
  memory_data: Record<string, any>
  created_at: string | null
  updated_at: string | null
}

export interface InterviewSessionResponse {
  session: InterviewSessionData
  history?: InterviewQuestionHistoryItem[]
  memory?: ConversationMemoryItem[]
}

export async function startInterviewSession(): Promise<InterviewSessionResponse> {
  return apiCall(`${API}/interview/session/start`, { method: 'POST' })
}

export async function getInterviewSession(sessionId: number): Promise<InterviewSessionResponse> {
  return apiCall(`${API}/interview/session/${sessionId}`, { method: 'GET' })
}

export async function getInterviewSessionNextQuestion(sessionId: number): Promise<{ question: GeneratedQuestion }> {
  return apiCall(`${API}/interview/session/${sessionId}/next`, { method: 'POST' })
}

export interface SubmitInterviewAnswerParams {
  question_id: string
  answer_text: string
}

export async function submitInterviewAnswer(
  sessionId: number,
  data: SubmitInterviewAnswerParams,
): Promise<{ followup: FollowupData }> {
  return apiCall(`${API}/interview/session/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function pauseInterviewSession(sessionId: number): Promise<{ session: InterviewSessionData }> {
  return apiCall(`${API}/interview/session/${sessionId}/pause`, { method: 'POST' })
}

export async function resumeInterviewSession(sessionId: number): Promise<{ session: InterviewSessionData }> {
  return apiCall(`${API}/interview/session/${sessionId}/resume`, { method: 'POST' })
}

export async function endInterviewSession(sessionId: number): Promise<{ session: InterviewSessionData }> {
  return apiCall(`${API}/interview/session/${sessionId}/end`, { method: 'POST' })
}

export async function generateInterviewQuestions(
  count = 10,
): Promise<GenerateQuestionsResponse> {
  return apiCall(`${API}/interview/questions/generate`, {
    method: 'POST',
    body: JSON.stringify({ count }),
  })
}

export async function getInterviewQuestions(): Promise<GeneratedQuestion[]> {
  return apiCall(`${API}/interview/questions`, { method: 'GET' })
}

export async function getInterviewQuestion(questionId: string): Promise<GeneratedQuestion> {
  return apiCall(`${API}/interview/questions/${encodeURIComponent(questionId)}`, { method: 'GET' })
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
  if (params.numQuestions) formData.append('num_questions', String(params.numQuestions))
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

// ─── Candidate Intelligence Endpoints ──────────────────────────────────────

export async function uploadCandidateResume(file: File) {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/candidate/resume/upload`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    formData,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error ?? 'Candidate resume upload failed')
  }
  return data
}

export async function analyzeJobDescription(jobDescription: string) {
  return apiCall(`${API_URL}/candidate/jd/analyze`, {
    method: 'POST',
    body:   JSON.stringify({ job_description: jobDescription }),
  })
}

export async function getInterviewAnalytics() {
  return apiCall(`${API_URL}/analytics/summary`, { method: 'GET' })
}

export async function getSessionReport(sessionId: number) {
  return apiCall(`${API_URL}/reports/session/${sessionId}`, { method: 'GET' })
}

export async function exportSessionReport(sessionId: number, format: 'json' | 'csv' | 'pdf' = 'json') {
  return apiCall(`${API_URL}/reports/session/${sessionId}/export?format=${format}`, { method: 'GET' })
}

export async function getLearningRecommendations() {
  return apiCall(`${API_URL}/recommendations/latest`, { method: 'GET' })
}

export async function getInterviewHistory() {
  return apiCall(`${API_URL}/history/sessions`, { method: 'GET' })
}

export async function getInterviewModes() {
  return apiCall(`${API_URL}/modes/list`, { method: 'GET' })
}

export async function applyInterviewMode(mode: string, sessionId?: number) {
  return apiCall(`${API_URL}/modes/apply`, {
    method: 'POST',
    body: JSON.stringify({ mode, session_id: sessionId }),
  })
}

export async function getCandidateProfile() {
  return apiCall(`${API_URL}/candidate/profile`, { method: 'GET' })
}

export async function getCandidateMatch() {
  return apiCall(`${API_URL}/candidate/match`, { method: 'GET' })
}

export async function generateInterviewPlan() {
  return apiCall(`${API_URL}/interview/plan/generate`, { method: 'POST' })
}

export async function getLatestInterviewPlan() {
  return apiCall(`${API_URL}/interview/plan/latest`, { method: 'GET' })
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
