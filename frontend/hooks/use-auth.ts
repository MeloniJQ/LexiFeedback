import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  getCurrentUser,
  signUpWithEmail as signUpAPI,
  signInWithEmail as signInAPI,
  signOut as signOutAPI,
  User,
  getUser,
} from '@/lib/auth'

export type { User }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true)
        const storedUser = getUser()
        if (storedUser) {
          setUser(storedUser)
          setProfile(storedUser)
          // Verify token is still valid
          const currentUser = await getCurrentUser()
          if (currentUser) {
            setUser(currentUser)
            setProfile(currentUser)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      age?: string,
      education?: string
    ) => {
      try {
        setLoading(true)
        setError(null)
        const newUser = await signUpAPI(email, password, fullName, age, education)
        setUser(newUser)
        setProfile(newUser)
        // Brand-new users always need the CEFR placement test before they
        // ever see the dashboard (Feature 1).
        router.push(newUser.assessment_completed ? '/dashboard' : '/assessment')
        return newUser
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Signup failed'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true)
        setError(null)
        const loggedInUser = await signInAPI(email, password)
        setUser(loggedInUser)
        setProfile(loggedInUser)
        router.push(loggedInUser.assessment_completed ? '/dashboard' : '/assessment')
        return loggedInUser
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      await signOutAPI()
      setUser(null)
      setProfile(null)
      setError(null)
      router.push('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [router])

  return {
    user,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
  }
}
