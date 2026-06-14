'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BarChart3, Settings, Home, BookOpen, MessageCircle, Briefcase, Presentation, FileText, ChevronDown } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const [expandedPractice, setExpandedPractice] = useState(pathname.startsWith('/practice'))

  useEffect(() => {
    if (pathname.startsWith('/practice')) {
      setExpandedPractice(true)
    }
  }, [pathname])

  const menuItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home,
    },
    {
      label: 'Practice',
      href: '#',
      icon: BookOpen,
      subItems: [
        {
          label: 'Casual Conversation',
          href: '/practice/conversation',
          icon: MessageCircle,
          type: 'informal'
        },
        {
          label: 'Interview Practice',
          href: '/practice/interview',
          icon: Briefcase,
          type: 'formal'
        },
        {
          label: 'Presentation',
          href: '/practice/presentation',
          icon: Presentation,
          type: 'formal'
        },
        {
          label: 'Reading',
          href: '/practice/reading',
          icon: FileText,
          type: 'formal'
        },
      ]
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
    <div className="hidden md:flex w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-700 flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white">Lexical</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          if (item.subItems) {
            const isPracticeActive = pathname.startsWith('/practice')
            return (
              <div key={item.href} className="space-y-1">
                <button
                  onClick={() => setExpandedPractice(!expandedPractice)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isPracticeActive || expandedPractice
                      ? 'bg-[#E6EFF7] dark:bg-gray-800 text-[#1F2937] dark:text-white'
                      : 'text-[#6B7280] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium flex-1 text-left">{item.label}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedPractice ? 'rotate-180' : ''}`} />
                </button>
                
                {expandedPractice && (
                  <>
                    {/* Informal Conversations */}
                    <div className="ml-6 space-y-1">
                      <div className="text-xs font-semibold text-[#6B7280] dark:text-gray-500 uppercase tracking-wide">
                        Informal
                      </div>
                      {item.subItems.filter(sub => sub.type === 'informal').map((subItem) => {
                        const SubIcon = subItem.icon
                        const isSubActive = pathname === subItem.href

                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                              isSubActive
                                ? 'bg-[#E6EFF7] dark:bg-gray-700 text-[#1F2937] dark:text-white'
                                : 'text-[#6B7280] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <SubIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{subItem.label}</span>
                          </Link>
                        )
                      })}
                    </div>

                    {/* Formal Conversations */}
                    <div className="ml-6 space-y-1">
                      <div className="text-xs font-semibold text-[#6B7280] dark:text-gray-500 uppercase tracking-wide">
                        Formal
                      </div>
                      {item.subItems.filter(sub => sub.type === 'formal').map((subItem) => {
                        const SubIcon = subItem.icon
                        const isSubActive = pathname === subItem.href

                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                              isSubActive
                                ? 'bg-[#E6EFF7] dark:bg-gray-700 text-[#1F2937] dark:text-white'
                                : 'text-[#6B7280] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <SubIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{subItem.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-[#E6EFF7] dark:bg-gray-800 text-[#1F2937] dark:text-white'
                  : 'text-[#6B7280] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
