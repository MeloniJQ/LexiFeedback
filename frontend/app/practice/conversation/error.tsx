'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'

export default function ConversationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Always log the full error object to the console — this is the exact
    // thing we've been missing: whatever crashes during rendering will now
    // show up here instead of silently resetting the page.
    console.error('[CasualConversation] Render crashed:', error)
  }, [error])

  return (
    <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-semibold text-[#1F2937] dark:text-white">
        Something went wrong loading your feedback
      </h2>
      <p className="text-sm text-[#6B7280] dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 font-mono break-words">
        {error.message || 'Unknown error'}
      </p>
      <Button onClick={reset} className="flex items-center gap-2">
        <RotateCcw className="w-4 h-4" />
        Try again
      </Button>
    </div>
  )
}