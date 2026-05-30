import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseServer'
import AuthForm from '../../components/AuthForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>
}) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/messages')

  const params = await searchParams

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md space-y-3">
        {params.message && (
          <div className="rounded-xl bg-green-100 px-4 py-3 text-sm text-green-700 text-center shadow-sm">
            {params.message}
          </div>
        )}
        {params.error && (
          <div className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-600 text-center shadow-sm">
            {params.error}
          </div>
        )}
        <AuthForm mode="login" />
      </div>
    </div>
  )
}