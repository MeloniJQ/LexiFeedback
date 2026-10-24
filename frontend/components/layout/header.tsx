'use client'

import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/layout/user-menu'
import Link from 'next/link'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-purple-200/60 dark:border-purple-500/30 bg-white/80 dark:bg-[#111827]/80 backdrop-blur">
      <div className="h-1 bg-linear-to-r from-[#2C5AA0] via-purple-500 to-teal-400" />
      <div className="px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-lg font-bold bg-linear-to-r from-[#2C5AA0] via-purple-500 to-teal-500 bg-clip-text text-transparent">
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
