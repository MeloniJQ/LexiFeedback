import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, password } = await request.json()

    // Validate input
    if (!fullName || !email || !password) {
      return NextResponse.json(
        { message: 'Full name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              console.error('Cookie error:', error)
            }
          },
        },
      }
    )

    // Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        { message: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { message: 'Signup failed' },
        { status: 400 }
      )
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: authData.user.email,
          full_name: fullName,
          created_at: new Date().toISOString(),
        },
      ])

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Note: User is created in auth, but profile failed. 
      // In production, you might want to handle this differently
    }

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { message: 'An error occurred during signup' },
      { status: 500 }
    )
  }
}
