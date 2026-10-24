import { LoginFormComponent } from '@/components/auth/login-component'

export default function LoginPage() {
  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#2C5AA0] mb-2">Lexical</h1>
          <p className="text-[#6B7280] dark:text-gray-400">Master English through AI-powered feedback</p>
        </div>
        <LoginFormComponent />
      </div>
    </div>
  )
}
