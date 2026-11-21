import type { GoalType } from './api'

export const GOAL_TYPES: GoalType[] = [
  'Interview Practice',
  'Presentation Mode',
  'Casual Conversation',
  'Reading Practice',
]

export interface GoalSuggestion {
  title: string
  target: number
}

export const GOAL_SUGGESTIONS: Record<GoalType, GoalSuggestion[]> = {
  'Interview Practice': [
    { title: 'Complete 20 Mock Interviews', target: 20 },
    { title: 'Practice Daily for 14 Days', target: 14 },
    { title: 'Achieve 90% Interview Score', target: 90 },
    { title: 'Complete 5 Behavioral Interviews', target: 5 },
    { title: 'Complete 5 Technical Interviews', target: 5 },
  ],
  'Presentation Mode': [
    { title: 'Deliver 10 Presentations', target: 10 },
    { title: 'Improve Delivery Score to 90%', target: 90 },
    { title: 'Practice Every Day for 30 Days', target: 30 },
    { title: 'Reduce Filler Words by 50%', target: 50 },
  ],
  'Casual Conversation': [
    { title: 'Maintain a 30-Day Conversation Streak', target: 30 },
    { title: 'Complete 25 Conversations', target: 25 },
    { title: 'Speak 15 Minutes Daily', target: 15 },
    { title: 'Reach 90% Fluency Score', target: 90 },
  ],
  'Reading Practice': [
    { title: 'Complete 30 Reading Exercises', target: 30 },
    { title: 'Read Every Day for 30 Days', target: 30 },
    { title: 'Achieve 90% Reading Accuracy', target: 90 },
    { title: 'Finish 10 Advanced Passages', target: 10 },
  ],
}