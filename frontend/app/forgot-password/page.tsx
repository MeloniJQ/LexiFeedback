'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { API_URL } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, new_password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Reset failed. Please try again.')
        return
      }
      setSuccess(true)
    } catch {
      setError('Could not connect to server. Make sure the backend is running.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#2C5AA0] mb-2">Lexical</h1>
          <p className="text-[#6B7280] dark:text-gray-400">Reset your password</p>
        </div>

        <div className="bg-white dark:bg-[#1F2937] rounded-lg shadow-md p-8">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white">Password Updated!</h2>
              <p className="text-[#6B7280] dark:text-gray-400">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <Link
                href="/login"
                className="block w-full py-2 text-center rounded-lg bg-[#2C5AA0] hover:bg-[#1E3A5F] text-white font-medium transition-colors"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[#1F2937] dark:text-white mb-2">
                Reset Password
              </h2>
              <p className="text-[#6B7280] dark:text-gray-400 mb-6 text-sm">
                Enter the email address of your account and choose a new password.
              </p>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/30 border-2 border-red-400 dark:border-red-600 rounded-lg p-4 mb-6">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-gray-500" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#374151] text-[#1F2937] dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C5AA0]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-gray-500" />
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#374151] text-[#1F2937] dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C5AA0]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-gray-500" />
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      required
                      minLength={8}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#374151] text-[#1F2937] dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C5AA0]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 rounded-lg bg-[#2C5AA0] hover:bg-[#1E3A5F] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>

              <p className="text-center text-[#6B7280] dark:text-gray-400 text-sm mt-6">
                Remember your password?{' '}
                <Link href="/login" className="text-[#2C5AA0] hover:text-[#1E3A5F] font-medium">
                  Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
