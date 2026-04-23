import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export interface User {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
  }
}

// Placeholder auth hook - backend will be implemented separately
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [, ] = useState(false) // loading - not used in placeholder
  const [, ] = useState<string | null>(null) // error - not used in placeholder
  const router = useRouter()

  const signUp = useCallback(
    async (_email: string, _password: string, _fullName: string) => {
      // TODO: Implement with separate backend
      throw new Error('Authentication not implemented - backend required')
    },
    []
  )

  const signIn = useCallback(
    async (_email: string, _password: string) => {
      // TODO: Implement with separate backend
      throw new Error('Authentication not implemented - backend required')
    },
    []
  )

  const signOut = useCallback(async () => {
    // TODO: Implement with separate backend
    setUser(null)
    setProfile(null)
    router.push('/')
  }, [router])

  return {
    user,
    profile,
    loading: false,
    error: null,
    signUp,
    signIn,
    signOut,
  }
}
