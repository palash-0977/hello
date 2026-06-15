// app/profile/settings/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronRight,
  LogOut,
  Moon,
  Palette,
  Shield,
  Bell,
  User2,
  Sun,
  Info,
} from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme')

    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark')
      setDarkMode(true)
    } else {
      document.documentElement.classList.remove('dark')
      setDarkMode(false)
    }
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement

    if (darkMode) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setDarkMode(false)
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setDarkMode(true)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 px-4 py-6 transition-colors">

      <div className="mx-auto max-w-2xl">

        {/* Back */}
        <div className="mb-5">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            <ArrowLeft size={18} />
            Back
          </Link>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="p-6 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <Palette size={22} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Settings
                </h1>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage your account preferences
                </p>
              </div>
            </div>
          </div>

          {/* Settings List */}
          <div className="p-4 space-y-3">

            {/* Edit Profile */}
            <Link
              href="/profile/edit"
              className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-zinc-700 p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <User2
                    size={20}
                    className="text-indigo-600 dark:text-indigo-400"
                  />
                </div>

                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Edit Profile
                  </p>

                  <p className="text-sm text-gray-500">
                    Change avatar, name and bio
                  </p>
                </div>
              </div>

              <ChevronRight
                size={18}
                className="text-gray-400"
              />
            </Link>

           

           {/* About */}
           <Link
             href="/help"
             className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-zinc-700 p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
           >
             <div className="flex items-center gap-4">
               <div className="h-11 w-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                 <Info
                   size={20}
                   className="text-indigo-600 dark:text-indigo-400"
                 />
                </div>

                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Help & About
                  </p>

                  <p className="text-sm text-gray-500">
                    Learn more about Kivo and how to use it
                  </p>
                </div>
              </div>

              <ChevronRight
                size={18}
                className="text-gray-400"
              />
            </Link>
            

            {/* Theme */}
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 p-4">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-4">

                  <div className="h-11 w-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">

                    {darkMode ? (
                      <Moon
                        size={20}
                        className="text-indigo-500"
                      />
                    ) : (
                      <Sun
                        size={20}
                        className="text-amber-500"
                      />
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {darkMode
                        ? 'Dark Mode'
                        : 'Light Mode'}
                    </p>

                    <p className="text-sm text-gray-500">
                      Switch app appearance
                    </p>
                  </div>
                </div>

                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    darkMode
                      ? 'bg-indigo-600'
                      : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      darkMode
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Sign Out */}
            <button
              onClick={signOut}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-4 font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
            >
              <LogOut size={18} />
              Sign Out
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}