'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { BarChart3, Settings, Home, BookOpen, MessageCircle, Briefcase, Presentation, FileText, ChevronDown, BookMarked, Target, Info } from 'lucide-react'

// Sub-links under "About". Each opens /about?section=<id>, which shows only that section.
// Lives in its own component because useSearchParams must sit inside a Suspense boundary.
function AboutLinks({ items }: { items: { label: string; id: string }[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('section') ?? 'overview'

  return (
    <>
      {items.map((item) => {
        const isSubActive = pathname === '/about' && current === item.id
        return (
          <Link
            key={item.id}
            href={item.id === 'overview' ? '/about' : `/about?section=${item.id}`}
            className={`block px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isSubActive
                ? 'bg-linear-to-r from-[#2C5AA0]/20 via-purple-500/15 to-transparent border-l-4 border-purple-500 text-[#1F2937] dark:text-white font-semibold shadow-sm'
                : 'text-[#6B7280] dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-500/10'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [expandedPractice, setExpandedPractice] = useState(pathname.startsWith('/practice'))
  const [expandedAbout, setExpandedAbout] = useState(pathname.startsWith('/about'))

  useEffect(() => {
    if (pathname.startsWith('/practice')) {
      setExpandedPractice(true)
    }
    if (pathname.startsWith('/about')) {
      setExpandedAbout(true)
    }
  }, [pathname])

  // Headings of the About page. Each links to /about/<id>, which shows only that section.
  const aboutItems = [
    { label: 'Overview', id: 'overview' },
    { label: 'Problem & Solution', id: 'problem-solution' },
    { label: 'Key Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'CEFR Levels', id: 'cefr' },
    { label: 'Project Vision', id: 'vision' },
    { label: 'Authors', id: 'authors' },
  ]

  const menuItems = [
    {
      label: 'Dashboard',
      color: '#2C5AA0',
      href: '/dashboard',
      icon: Home,
    },
    {
      label: 'Practice',
      color: '#8B5CF6',
      href: '#',
      icon: BookOpen,
      subItems: [
        {
          label: 'Casual Conversation',
      color: '#10B981',
          href: '/practice/conversation',
          icon: MessageCircle,
          type: 'informal'
        },
        {
          label: 'Interview Practice',
      color: '#2C5AA0',
          href: '/practice/interview',
          icon: Briefcase,
          type: 'formal'
        },
        {
          label: 'Presentation',
      color: '#8B5CF6',
          href: '/practice/presentation',
          icon: Presentation,
          type: 'formal'
        },
        {
          label: 'Reading',
      color: '#F59E0B',
          href: '/practice/reading',
          icon: FileText,
          type: 'formal'
        },
      ]
    },
    {
      label: 'Goals',
      color: '#F43F5E',
      href: '/dashboard/goals',
      icon: Target,
    },
    {
      label: 'Analytics & Feedback',
      color: '#10B981',
      href: '/dashboard/feedback',
      icon: BarChart3,
    },
    {
      label: 'Settings',
      color: '#F59E0B',
      href: '/dashboard/settings',
      icon: Settings,
    },
    {
      label: 'My Vocabulary',
      color: '#0D9488',
      href: '/dashboard/vocabulary',
      icon: BookMarked,
    },
  ]

  return (
    <div className="hidden md:flex w-64 shrink-0 h-full overflow-y-auto bg-white/70 dark:bg-black/50 backdrop-blur border-r border-purple-200/60 dark:border-purple-500/30 flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-extrabold bg-linear-to-r from-[#2C5AA0] via-purple-500 to-teal-500 bg-clip-text text-transparent">Lexical</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/')

          if (item.subItems) {
            const isPracticeActive = pathname.startsWith('/practice')
            return (
              <div key={item.href} className="space-y-1">
                <button
                  onClick={() => setExpandedPractice(!expandedPractice)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isPracticeActive || expandedPractice
                      ? 'bg-linear-to-r from-[#2C5AA0]/20 via-purple-500/15 to-transparent border-l-4 border-purple-500 text-[#1F2937] dark:text-white font-semibold shadow-sm'
                      : 'text-[#6B7280] dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-500/10'
                  }`}
                >
                  <Icon className="w-5 h-5" style={{ color: item.color }} />
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
                                ? 'bg-linear-to-r from-[#2C5AA0]/20 via-purple-500/15 to-transparent border-l-4 border-purple-500 text-[#1F2937] dark:text-white font-semibold shadow-sm'
                                : 'text-[#6B7280] dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-500/10'
                            }`}
                          >
                            <SubIcon className="w-4 h-4" style={{ color: subItem.color }} />
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
                                ? 'bg-linear-to-r from-[#2C5AA0]/20 via-purple-500/15 to-transparent border-l-4 border-purple-500 text-[#1F2937] dark:text-white font-semibold shadow-sm'
                                : 'text-[#6B7280] dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-500/10'
                            }`}
                          >
                            <SubIcon className="w-4 h-4" style={{ color: subItem.color }} />
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
                  ? 'bg-linear-to-r from-[#2C5AA0]/20 via-purple-500/15 to-transparent border-l-4 border-purple-500 text-[#1F2937] dark:text-white font-semibold shadow-sm'
                  : 'text-[#6B7280] dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-500/10'
              }`}
            >
              <Icon className="w-5 h-5" style={{ color: item.color }} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* About: each heading from the About page, shown one section at a time */}
        <div className="space-y-1">
          <button
            onClick={() => setExpandedAbout(!expandedAbout)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              pathname.startsWith('/about') || expandedAbout
                ? 'bg-linear-to-r from-[#2C5AA0]/20 via-purple-500/15 to-transparent border-l-4 border-purple-500 text-[#1F2937] dark:text-white font-semibold shadow-sm'
                : 'text-[#6B7280] dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-500/10'
            }`}
          >
            <Info className="w-5 h-5 text-sky-500" />
            <span className="font-medium flex-1 text-left">About</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${expandedAbout ? 'rotate-180' : ''}`} />
          </button>

          {expandedAbout && (
            <div className="ml-6 space-y-1">
              <Suspense fallback={null}>
                <AboutLinks items={aboutItems} />
              </Suspense>
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}