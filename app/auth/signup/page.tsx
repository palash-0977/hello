import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseServer'
import AuthForm from '../../components/AuthForm'

export default async function SignupPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/messages')

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-100 px-4">
      <AuthForm mode="signup" />
    </div>
  )
}