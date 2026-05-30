'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type AuthFormProps = {
  mode?: 'login' | 'signup'
}

export default function AuthForm({ mode = 'login' }: AuthFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (mode !== 'signup' || username.trim().length < 3) {
      setUsernameStatus('idle')
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setUsernameStatus('checking')
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle()

      if (data) {
        setUsernameStatus('taken')
        // generate suggestions
        const base = username.trim().toLowerCase().replace(/\s+/g, '_')
        setSuggestions([
          `${base}_${Math.floor(Math.random() * 90 + 10)}`,
          `${base}_${new Date().getFullYear()}`,
          `the_${base}`,
        ])
      } else {
        setUsernameStatus('available')
        setSuggestions([])
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (mode === 'signup' && usernameStatus === 'taken') {
      setError('Please choose a different username.')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim().toLowerCase(),
              full_name: fullName.trim(),
            },
          },
        })

        if (signUpError) throw signUpError

        // upsert profile row immediately
        if (signUpData.user) {
          await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            username: username.trim().toLowerCase(),
            full_name: fullName.trim(),
          })
        }

        router.push('/auth/login?message=Check your email before logging in')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        router.push('/messages')
        router.refresh()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      if (message.includes('Invalid login credentials')) {
        setError('Wrong email or password. Please try again.')
      } else if (message.includes('Email not confirmed')) {
        setError('Please verify your email first.')
      } else if (message.includes('User already registered')) {
        setError('This email is already registered.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#101012] px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-[#18181b] transition-all"

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl dark:bg-[#18181b]">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white text-xl font-bold mb-4">
          Hi
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {mode === 'login' ? 'Login to continue to Hi' : 'Sign up to start messaging'}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
          <XCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <>
            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                  className={`${inputClass} pl-8 pr-10`}
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && <Loader2 size={16} className="animate-spin text-gray-400" />}
                  {usernameStatus === 'available' && <CheckCircle2 size={16} className="text-green-500" />}
                  {usernameStatus === 'taken' && <XCircle size={16} className="text-red-500" />}
                </div>
              </div>
              {usernameStatus === 'taken' && (
                <div className="mt-2">
                  <p className="text-xs text-red-500 mb-1">Username taken. Try one of these:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setUsername(s); setSuggestions([]) }}
                        className="text-xs px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 transition"
                      >
                        @{s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {usernameStatus === 'available' && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">Username is available!</p>
              )}
            </div>
          </>
        )}

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        {/* Password */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || (mode === 'signup' && usernameStatus === 'taken')}
          className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </span>
          ) : mode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {mode === 'login' ? (
          <>Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="font-semibold text-indigo-600 dark:text-indigo-400">Sign Up</Link>
          </>
        ) : (
          <>Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-indigo-600 dark:text-indigo-400">Login</Link>
          </>
        )}
      </div>
    </div>
  )
}