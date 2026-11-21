'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, LogOut, Settings } from 'lucide-react'
import { clearAuth, getUser } from '@/lib/auth'

export function UserMenu() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  // Read after mount: sessionStorage doesn't exist on the server, and reading it
  // during render would cause a hydration mismatch.
  const [user, setUser] = useState<{ full_name?: string; email?: string } | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const displayName = user?.full_name?.trim() || user?.email?.split('@')[0] || ''

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#1F2937] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <User className="w-5 h-5" />
        {displayName && (
          <span className="hidden sm:inline max-w-[160px] truncate text-sm font-medium">{displayName}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-black rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          {user && (
            <div className="px-4 pb-2 mb-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-[#1F2937] dark:text-white truncate">{displayName}</p>
              {user.email && <p className="text-xs text-[#6B7280] dark:text-gray-400 truncate">{user.email}</p>}
            </div>
          )}
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 px-4 py-2 text-[#1F2937] dark:text-white hover:bg-gray-100 dark:hover:bg-[#1E3A5F] transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>

          <button
            onClick={() => {
              handleLogout()
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-[#1F2937] dark:text-white hover:bg-gray-100 dark:hover:bg-[#1E3A5F] transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  )
}
