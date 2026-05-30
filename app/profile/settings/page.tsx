// app/profile/settings/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import {
  Moon,
  Sun,
  LogOut,
  User2,
  Camera,
  Save,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)

  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const loadTheme = localStorage.getItem('theme')

    if (loadTheme === 'dark') {
      document.documentElement.classList.add('dark')
      setDarkMode(true)
    }

    const load = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const currentUser = authData.user

      setUser(currentUser)

      if (currentUser) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, bio, avatar_url')
          .eq('id', currentUser.id)
          .single()

        if (data) {
          setFullName(data.full_name ?? '')
          setBio(data.bio ?? '')
          setAvatarUrl(data.avatar_url ?? '')
        }
      }
    }

    load()
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement

    if (darkMode) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }

    setDarkMode(!darkMode)
  }

  const uploadAvatar = async (file: File) => {
    if (!user) return

    setUploading(true)
    setError('')

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    setAvatarUrl(data.publicUrl)
    setUploading(false)
  }

  const saveProfile = async () => {
    if (!user) return

    setSaving(true)
    setError('')

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      bio,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/profile')
      router.refresh()
    }

    setSaving(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-dvh bg-gray-100 dark:bg-[#0f0f10] px-4 py-6 transition-colors duration-300">
      <div className="mx-auto max-w-2xl">

        {/* Top Bar */}
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/profile"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            <ArrowLeft size={18} />
            Back
          </Link>

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#1c1c1f] px-4 py-2 shadow-sm border border-gray-200 dark:border-white/10"
          >
            {darkMode ? (
              <>
                <Sun size={18} />
                <span className="text-sm">Light</span>
              </>
            ) : (
              <>
                <Moon size={18} />
                <span className="text-sm">Dark</span>
              </>
            )}
          </button>
        </div>

        {/* Settings Card */}
        <div className="rounded-3xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 p-6 shadow-sm transition-colors duration-300">

          <div className="mb-6 flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-black text-white flex items-center justify-center dark:bg-white dark:text-black">
              <User2 size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Settings
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your profile and account
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl bg-red-100 text-red-600 p-3 text-sm">
              {error}
            </div>
          )}

          {/* Avatar */}
          <div className="mb-6 flex flex-col items-center">
            <div className="relative">
              <img
                src={
                  avatarUrl ||
                  'https://ui-avatars.com/api/?name=User'
                }
                alt="Avatar"
                className="h-28 w-28 rounded-full object-cover border-4 border-white dark:border-[#222]"
              />

              <label className="absolute bottom-1 right-1 cursor-pointer rounded-full bg-black p-2 text-white shadow-lg">
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) await uploadAvatar(file)
                  }}
                />
              </label>
            </div>

            {uploading && (
              <p className="mt-2 text-sm text-gray-400">
                Uploading...
              </p>
            )}
          </div>

          {/* Full Name */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Full Name
            </label>

            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#101012] px-4 py-3 outline-none focus:ring-2 focus:ring-black dark:text-white"
            />
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Bio
            </label>

            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell something about yourself..."
              className="min-h-[120px] w-full resize-none rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#101012] px-4 py-3 outline-none focus:ring-2 focus:ring-black dark:text-white"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={saveProfile}
            disabled={saving || uploading}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Sign Out */}
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-600 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:hover:bg-red-500/20"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}