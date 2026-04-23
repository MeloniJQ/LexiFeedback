// Placeholder auth functions - backend will be implemented separately

export async function getCurrentUser() {
  // TODO: Implement with separate backend
  return null
}

export async function getCurrentProfile() {
  // TODO: Implement with separate backend
  return null
}

export async function signUpWithEmail(_email: string, _password: string, _fullName: string) {
  // TODO: Implement with separate backend
  throw new Error('Authentication not implemented - backend required')
}

export async function signInWithEmail(_email: string, _password: string) {
  // TODO: Implement with separate backend
  throw new Error('Authentication not implemented - backend required')
}

export async function signOut() {
  // TODO: Implement with separate backend
  throw new Error('Authentication not implemented - backend required')
}

export async function resetPassword(_email: string) {
  // TODO: Implement with separate backend
  throw new Error('Authentication not implemented - backend required')
}

export async function updatePassword(_newPassword: string) {
  // TODO: Implement with separate backend
  throw new Error('Authentication not implemented - backend required')
}
