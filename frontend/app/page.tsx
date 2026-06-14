import { redirect } from 'next/navigation'

export default function Home() {
  // Open the app on the signup page by default
  redirect('/signup')
}
