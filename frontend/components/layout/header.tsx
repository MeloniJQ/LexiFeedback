'use client'

import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/layout/user-menu'
import Link from 'next/link'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2937]">
      <div className="px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-semibold text-[#1F2937] dark:text-white">
          Lexical
        </Link>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
