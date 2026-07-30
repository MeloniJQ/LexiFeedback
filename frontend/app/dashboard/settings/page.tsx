'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { getUser, getCurrentUser, setAuth, getToken, type User } from '@/lib/auth'

const CEFR_LABELS: Record<string, string> = {
  A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate',
  B2: 'Upper Intermediate', C1: 'Advanced', C2: 'Proficient',
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState({
    fullName: '',
    email: '',
    age: '',
    education: '',
    language: 'English (US)',
    difficulty: 'Intermediate',
    notifications: true,
    emailUpdates: false,
  })
  const [assessment, setAssessment] = useState<User | null>(null)

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Always re-fetch from the server rather than trusting whatever is
    // cached in sessionStorage — that cache can go stale (e.g. it's only
    // refreshed at login or right after finishing the assessment; if this
    // tab was already open, or the write happened but this page had an
    // older snapshot) and this is the page people check to confirm their
    // result actually saved, so it needs to be authoritative.
    const cachedUser = getUser()
    if (!cachedUser) {
      router.replace('/login')
      return
    }

    const applyUser = (u: User) => {
      setSettings((prev) => ({
        ...prev,
        fullName: u.full_name || '',
        email: u.email || '',
        age: u.age ? String(u.age) : '',
        education: u.education || '',
      }))
      setAssessment(u)
    }

    applyUser(cachedUser) // show something immediately, then refresh below

    getCurrentUser().then((fresh) => {
      if (fresh) {
        applyUser(fresh)
        const token = getToken()
        if (token) setAuth(token, fresh) // keep the cache in sync going forward
      }
    })
  }, [router])

  const handleChange = (field: string, value: any) => {
    setSettings({ ...settings, [field]: value })
    setSaved(false)
  }

  const handleSave = async () => {
    // Simulate saving
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2">
                Settings
              </h1>
              <p className="text-[#6B7280] dark:text-gray-400">
                Manage your account preferences and learning settings
              </p>
            </div>

            {/* Profile Section */}
            <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-6">
                Profile Information
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={settings.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#374151] text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C5AA0]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-[#6B7280] dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">
                    Contact support to change your email address
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                    Age
                  </label>
                  <input
                    type="text"
                    value={settings.age}
                    onChange={(e) => handleChange('age', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#374151] text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C5AA0]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                    Education
                  </label>
                  <input
                    type="text"
                    value={settings.education}
                    onChange={(e) => handleChange('education', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#374151] text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C5AA0]"
                  />
                </div>
              </div>
            </div>

            {/* Learning Preferences */}
            <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-6">
                Learning Preferences
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                    Target Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#374151] text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C5AA0]"
                  >
                    <option>English (US)</option>
                    <option>English (UK)</option>
                    <option>English (Australian)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={settings.difficulty}
                    onChange={(e) => handleChange('difficulty', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#374151] text-[#1F2937] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C5AA0]"
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CEFR Assessment (Feature 1) */}
            <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-2">
                English Level Assessment
              </h2>

              {assessment?.assessment_completed && assessment.english_level ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-3xl font-bold text-[#2C5AA0]">{assessment.english_level}</div>
                    <div>
                      <p className="font-medium text-[#1F2937] dark:text-white">
                        {CEFR_LABELS[assessment.english_level] ?? ''}
                      </p>
                      {assessment.assessment_date && (
                        <p className="text-xs text-[#6B7280] dark:text-gray-400">
                          Assessed {new Date(assessment.assessment_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      ['Grammar', assessment.grammar_score],
                      ['Vocabulary', assessment.vocabulary_score],
                      ['Reading', assessment.reading_score],
                      ['Listening', assessment.listening_score],
                      ['Speaking', assessment.speaking_score],
                      ['Pronunciation', assessment.pronunciation_score],
                      ['Fluency', assessment.fluency_score],
                      ['Overall', assessment.overall_score],
                    ].map(([label, value]) => (
                      <div
                        key={label as string}
                        className="rounded-lg p-3 border border-gray-100 dark:border-gray-700 bg-[#F9FAFB] dark:bg-[#111827]"
                      >
                        <p className="text-xs text-[#6B7280] dark:text-gray-400">{label}</p>
                        <p className="text-lg font-semibold text-[#1F2937] dark:text-white">
                          {value != null ? Math.round(value as number) : '—'}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-4">
                    Every practice mode adjusts to this level automatically. Retake any time your English has improved.
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#6B7280] dark:text-gray-400 mb-4">
                  Take the CEFR placement test to unlock level-appropriate practice content.
                </p>
              )}

              <Button variant="outline" onClick={() => router.push('/assessment')}>
                {assessment?.assessment_completed ? 'Retake Assessment' : 'Take Assessment'}
              </Button>
            </div>

            {/* Notifications */}
            <div className="bg-white dark:bg-[#1F2937] border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-[#1F2937] dark:text-white mb-6">
                Notifications
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#1F2937] dark:text-white">
                      Push Notifications
                    </p>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400">
                      Get reminded about your practice sessions
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => handleChange('notifications', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#2C5AA0] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="font-medium text-[#1F2937] dark:text-white">
                      Email Updates
                    </p>
                    <p className="text-sm text-[#6B7280] dark:text-gray-400">
                      Receive weekly progress reports
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.emailUpdates}
                    onChange={(e) => handleChange('emailUpdates', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#2C5AA0] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
                Danger Zone
              </h2>
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                Delete Account
              </Button>
            </div>

            {/* Save Button */}
            <div className="flex gap-4">
              <Button
                onClick={handleSave}
                className="bg-[#2C5AA0] hover:bg-[#1E3A5F] text-white flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>

              {saved && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                    ✓ Saved successfully
                  </span>
                </div>
              )}
            </div>
    </div>
  )
}
