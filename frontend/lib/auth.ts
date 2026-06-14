import { API_URL } from "./api"

export interface User {
  id: number
  email: string
  full_name: string
  age?: number
  education?: string
}

export interface AuthResponse {
  token: string
  user: User
}

const TOKEN_KEY = "auth_token"
const USER_KEY = "auth_user"

export function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  if (typeof window === "undefined") return null
  const user = localStorage.getItem(USER_KEY)
  return user ? JSON.parse(user) : null
}

export function setAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function getCurrentUser() {
  try {
    const token = getToken()
    if (!token) return null

    const res = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      if (res.status === 401) {
        clearAuth()
      }
      return null
    }

    const user = await res.json()
    return user
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  age?: string,
  education?: string
) {
  try {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
        age: age ? parseInt(age) : undefined,
        education,
      }),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Signup failed")
    }

    const data: AuthResponse = await res.json()
    setAuth(data.token, data.user)
    return data.user
  } catch (error) {
    console.error("Signup error:", error)
    throw error
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Login failed")
    }

    const data: AuthResponse = await res.json()
    setAuth(data.token, data.user)
    return data.user
  } catch (error) {
    console.error("Login error:", error)
    throw error
  }
}

export async function signOut() {
  clearAuth()
}

