'use client'

import { signInWithEmail } from '@/lib/auth'
import { AlertCircle, Lock, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LoginFormComponent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!password.trim()) {
      setError('Password is required')
      return
    }

    setIsLoading(true)
    try {
      const user = await signInWithEmail(email, password)
      router.push(user.assessment_completed ? '/dashboard' : '/assessment')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not connect to server. Make sure the backend is running.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-[#1F2937] rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-[#1F2937] dark:text-white mb-2">
          Welcome Back
        </h1>
        <p className="text-[#6B7280] dark:text-gray-400 mb-6">
          Sign in to continue your learning journey
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
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#1F2937] dark:text-white">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#2C5AA0] hover:text-[#1E3A5F] font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] dark:text-gray-500" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#374151] text-[#1F2937] dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C5AA0]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 rounded-lg bg-[#2C5AA0] hover:bg-[#1E3A5F] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-[#6B7280] dark:text-gray-400 text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#2C5AA0] hover:text-[#1E3A5F] font-medium">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  )
}
