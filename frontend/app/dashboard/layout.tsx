"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getToken, getCurrentUser, getUser } from '@/lib/auth'
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

    // PERFORMANCE: if we already know (from the login response saved in
    // sessionStorage) that this user finished the placement test, show the
    // dashboard immediately instead of waiting for a network round trip, and
    // verify in the background. Unknown/unfinished users still wait, as before.
    if (getUser()?.assessment_completed) {
      setChecking(false)
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
    <div className="flex h-screen app-bg">
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