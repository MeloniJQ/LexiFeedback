'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Settings, Home, BookOpen } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()

  const menuItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home,
    },
    {
      label: 'Practice',
      href: '/dashboard',
      icon: BookOpen,
    },
    {
      label: 'Feedback',
      href: '/dashboard/feedback',
      icon: BarChart3,
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ]

  return (
    <div className="hidden md:flex w-64 bg-white dark:bg-[#1F2937] border-r border-gray-200 dark:border-gray-700 flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-[#2C5AA0]">Lexical</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-[#E6EFF7] dark:bg-[#2C5AA0] text-[#2C5AA0] dark:text-white'
                  : 'text-[#6B7280] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#6B7280] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>
      </div>
    </div>
  )
}
