import { createSupabaseServerClient } from './supabase/server'

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  // Create profile
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
        },
      ])

    if (profileError) {
      console.error('Profile creation error:', profileError)
    }
  }

  return data
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

export async function resetPassword(email: string) {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function updatePassword(newPassword: string) {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    throw new Error(error.message)
  }
}
