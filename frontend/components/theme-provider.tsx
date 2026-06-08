/**
 * Theme Provider Component
 * Applies theme on client-side to prevent hydration mismatch
 */

'use client'

import { useEffect } from 'react'
import { applyTheme, getTheme } from '@/lib/theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply saved theme on mount
    const theme = getTheme()
    applyTheme(theme)
  }, [])

  return <>{children}</>
}
