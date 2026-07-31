"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getToken, getCurrentUser } from '@/lib/auth'
import { WordOfDayModal } from '@/components/word-of-day-modal'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace('/login')
      return
    }

    // Gate the dashboard on the CEFR placement test (Feature 1) — this
    // covers direct navigation/bookmarks/refresh, not just the login flow.
    getCurrentUser().then((user) => {
      if (user && !user.assessment_completed) {
        router.replace('/assessment')
        return
      }
      setChecking(false)
    })
  }, [router])

  if (checking) {
    return <div className="flex items-center justify-center h-screen">Checking authentication...</div>
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#0F172A]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
      <WordOfDayModal />
    </div>
  )
}