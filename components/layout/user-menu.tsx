'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, LogOut, Settings } from 'lucide-react'

export function UserMenu() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#1F2937] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <User className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#2C5AA0] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
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
