import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export interface User {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user as User | null)
      if (user) {
        fetchProfile(user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user as User | null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    }
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        setError(null)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })

        if (error) throw error

        // Create profile
        if (data.user) {
          await supabase.from('profiles').insert([
            {
              id: data.user.id,
              email: data.user.email,
              full_name: fullName,
            },
          ])
        }

        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign up failed'
        setError(message)
        throw err
      }
    },
    []
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null)
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
        router.push('/dashboard')
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign in failed'
        setError(message)
        throw err
      }
    },
    [router]
  )

  const signOut = useCallback(async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed'
      setError(message)
      throw err
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
