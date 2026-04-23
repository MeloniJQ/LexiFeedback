'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    fullName: 'John Doe',
    email: 'john@example.com',
    language: 'English (US)',
    difficulty: 'Intermediate',
    notifications: true,
    emailUpdates: false,
  })

  const [saved, setSaved] = useState(false)

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
