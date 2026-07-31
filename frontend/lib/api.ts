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

 export async function apiCall(url: string, options: RequestInit & { timeoutMs?: number } = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  } as Record<string, string>
  if (token) headers.Authorization = `Bearer ${token}`

  const { timeoutMs, ...fetchOptions } = options

  let response: Response
  if (timeoutMs) {
    // Some backend calls (e.g. the CEFR assessment) chain several live AI
    // generations server-side and can genuinely take a while — but the UI
    // should never spin forever if a provider stalls. Abort and surface a
    // clear, retryable error instead of an indefinite spinner.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      response = await fetch(url, { ...fetchOptions, headers, signal: controller.signal })
    } catch (e: any) {
      if (e.name === 'AbortError') {
        throw new Error("This is taking longer than expected. Please try again — it may just be a busy moment for the AI provider.")
      }
      throw e
    } finally {
      clearTimeout(timer)
    }
  } else {
    response = await fetch(url, { ...fetchOptions, headers })
  }

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
): Promise<{ followup: { followup: string; probe_target: string; quote_used: string } }> {
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

export async function generateInterviewPlan(data?: { company?: string; role?: string }) {
  return apiCall(`${API_URL}/interview/plan/generate`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  })
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

// ─── Goals ────────────────────────────────────────────────────────────────

export type GoalType =
  | 'Interview Practice'
  | 'Presentation Mode'
  | 'Casual Conversation'
  | 'Reading Practice'

export type GoalStatus = 'active' | 'completed' | 'overdue' | 'paused'

export interface Goal {
  id: number
  userId: number
  title: string
  description: string
  goalType: GoalType
  targetValue: number
  currentProgress: number
  deadline: string // ISO YYYY-MM-DD
  createdAt: string
  updatedAt: string
  streakCount: number
  longestStreak: number
  lastCompletedDate: string | null
  completed: boolean
  status: GoalStatus
  daysRemaining: number | null
  progressPercentage: number
}

export interface GoalStats {
  totalGoals: number
  completedGoals: number
  currentStreak: number
  longestStreak: number
  averageProgress: number
  activeGoals: number
}

export interface CreateGoalPayload {
  title: string
  description?: string
  goalType: GoalType
  targetValue: number
  deadline: string // YYYY-MM-DD
}

export interface UpdateGoalPayload {
  title?: string
  description?: string
  goalType?: GoalType
  targetValue?: number
  deadline?: string
  status?: 'active' | 'paused'
}

export class GoalValidationError extends Error {
  errors: Record<string, string>
  constructor(errors: Record<string, string>) {
    super('Validation failed')
    this.errors = errors
  }
}

async function goalsApiCall(url: string, options: RequestInit = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  } as Record<string, string>
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, { ...options, headers })
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (data?.errors) throw new GoalValidationError(data.errors)
    throw new Error(data?.error ?? `API error: ${response.status}`)
  }
  return data
}

export async function getGoals(): Promise<Goal[]> {
  return goalsApiCall(`${API_URL}/goals`, { method: 'GET' })
}

export async function getGoalStats(): Promise<GoalStats> {
  return goalsApiCall(`${API_URL}/goals/stats`, { method: 'GET' })
}

export async function createGoal(payload: CreateGoalPayload): Promise<{ goal: Goal }> {
  return goalsApiCall(`${API_URL}/goals`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateGoal(id: number, payload: UpdateGoalPayload): Promise<{ goal: Goal }> {
  return goalsApiCall(`${API_URL}/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteGoal(id: number): Promise<{ message: string }> {
  return goalsApiCall(`${API_URL}/goals/${id}`, { method: 'DELETE' })
}

export async function updateGoalProgress(
  id: number,
  body: { mode: 'increment'; amount: number } | { mode: 'set'; value: number }
): Promise<{ goal: Goal; justCompleted: boolean; streakIncreased: boolean }> {
  return goalsApiCall(`${API_URL}/goals/${id}/progress`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
// ─── CEFR Initial Assessment (Feature 1) ──────────────────────────────────

export interface AssessmentMCQItem {
  id: string
  level?: string
  question: string
  options: string[]
}

export interface AssessmentComprehensionQuestion {
  question: string
  options: string[]
}

export interface AssessmentPackage {
  grammar: { items: AssessmentMCQItem[] }
  vocabulary: { items: AssessmentMCQItem[] }
  reading: {
    title: string
    content: string
    questions: AssessmentComprehensionQuestion[]
  }
  listening: {
    title: string
    script: string
    questions: AssessmentComprehensionQuestion[]
  }
  speaking: {
    readaloud_sentence: string
    open_questions: string[]
  }
}

export interface AssessmentResult {
  english_level: string
  overall_score: number
  grammar_score: number
  vocabulary_score: number
  pronunciation_score: number
  fluency_score: number
  speaking_score: number
  reading_score: number
  listening_score: number
  message: string
}

export interface AssessmentSubmission {
  grammar: Record<string, number>
  vocabulary: Record<string, number>
  reading_answers: number[]
  listening_answers: number[]
  speaking: {
    readaloud_transcript: string
    readaloud_reference: string
    open_transcripts: string[]
  }
}

export async function getAssessmentStatus(): Promise<{
  assessment_completed: boolean
  english_level: string | null
  assessment_date: string | null
}> {
  return apiCall(`${API_URL}/assessment/status`, { method: 'GET' })
}

export async function startAssessment(): Promise<AssessmentPackage> {
  // Bounded on purpose: build_assessment() runs up to 4 AI calls (in two
  // parallel batches of 2), each individually timeout-capped around ~20s
  // server-side — 45s gives real headroom without leaving the UI spinning
  // indefinitely if something upstream genuinely stalls.
  return apiCall(`${API_URL}/assessment/start`, { method: 'GET', timeoutMs: 45000 })
}

export async function submitAssessment(
  submission: AssessmentSubmission
): Promise<AssessmentResult> {
  return apiCall(`${API_URL}/assessment/submit`, {
    method: 'POST',
    body: JSON.stringify(submission),
  })
}
