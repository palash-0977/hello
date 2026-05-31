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
  Palette,
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
    // Apply stored theme on mount
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
      setDarkMode(true)
    } else {
      document.documentElement.classList.remove('dark')
      setDarkMode(false)
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
      setDarkMode(false)
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setDarkMode(true)
    }
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

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
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
    router.push('/auth/login')
    router.refresh()
  }

  const inputClass =
    'w-full rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white text-gray-900 transition'

  return (
    <div className="min-h-dvh bg-gray-100 dark:bg-zinc-950 px-4 py-6 transition-colors duration-300">
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
        </div>

        {/* Settings Card */}
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 shadow-sm transition-colors duration-300 space-y-6">

          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
              <User2 size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your profile and account</p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 text-sm">
              {error}
            </div>
          )}

          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                src={avatarUrl || 'https://ui-avatars.com/api/?name=User'}
                alt="Avatar"
                className="h-28 w-28 rounded-full object-cover border-4 border-white dark:border-zinc-800"
              />
              <label className="absolute bottom-1 right-1 cursor-pointer rounded-full bg-indigo-600 p-2 text-white shadow-lg hover:bg-indigo-700 transition">
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (file) await uploadAvatar(file)
                  }}
                />
              </label>
            </div>
            {uploading && <p className="mt-2 text-sm text-gray-400">Uploading…</p>}
          </div>

          {/* Full Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Enter your name"
              className={inputClass}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell something about yourself…"
              className={`${inputClass} min-h-[100px] resize-none`}
            />
          </div>

          {/* Save */}
          <button
            onClick={saveProfile}
            disabled={saving || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <Save size={18} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>

          {/* Divider */}
          <hr className="border-gray-100 dark:border-zinc-800" />

          {/* ── Theme Section ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Palette size={18} className="text-indigo-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Appearance</h2>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon size={20} className="text-indigo-400" /> : <Sun size={20} className="text-amber-500" />}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {darkMode ? 'Dark Mode' : 'Light Mode'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                  darkMode ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-100 dark:border-zinc-800" />

          {/* Sign Out */}
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}