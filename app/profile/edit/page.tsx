// app/profile/edit/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import {
  ArrowLeft,
  Camera,
  Save,
  User2,
} from 'lucide-react'
import Link from 'next/link'

export default function EditProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        router.push('/auth/login')
        return
      }

      setUser(data.user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, bio, avatar_url')
        .eq('id', data.user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || '')
        setBio(profile.bio || '')
        setAvatarUrl(profile.avatar_url || '')
      }
    } catch (err) {
      console.error(err)
    }

    setLoading(false)
  }

  const uploadAvatar = async (file: File) => {
    if (!user) return

    setUploading(true)
    setError('')

    try {
      const ext = file.name.split('.').pop()
      const fileName = `${user.id}.${ext}`

      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
        })

      if (error) throw error

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setAvatarUrl(data.publicUrl)
    } catch (err: any) {
      setError(err.message)
    }

    setUploading(false)
  }

  const saveProfile = async () => {
    if (!user) return

    setSaving(true)
    setError('')

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      router.push('/profile')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }

    setSaving(false)
  }

  const inputClass =
    'w-full rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white transition'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 p-4">
        <div className="mx-auto max-w-2xl">
          <div className="animate-pulse rounded-3xl bg-white dark:bg-zinc-900 p-6 space-y-6">
            <div className="h-8 w-40 rounded bg-gray-200 dark:bg-zinc-800" />
            <div className="mx-auto h-28 w-28 rounded-full bg-gray-200 dark:bg-zinc-800" />
            <div className="h-12 rounded bg-gray-200 dark:bg-zinc-800" />
            <div className="h-28 rounded bg-gray-200 dark:bg-zinc-800" />
            <div className="h-12 rounded bg-gray-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 px-4 py-6">
      <div className="mx-auto max-w-2xl">

        {/* Top */}
        <div className="mb-5">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            <ArrowLeft size={18} />
            Back
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 shadow-sm">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
              <User2 size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Profile
              </h1>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update your profile information
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl bg-red-100 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Avatar */}
          <div className="mb-8 flex flex-col items-center">

            <div className="relative">

              <img
                src={
                  avatarUrl ||
                  'https://ui-avatars.com/api/?name=User'
                }
                alt="Avatar"
                className="h-32 w-32 rounded-full object-cover border-4 border-white dark:border-zinc-800 shadow"
              />

              <label className="absolute bottom-2 right-2 cursor-pointer rounded-full bg-indigo-600 p-3 text-white shadow-lg hover:bg-indigo-700 transition">

                <Camera size={18} />

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0]

                    if (file) {
                      await uploadAvatar(file)
                    }
                  }}
                />
              </label>
            </div>

            {uploading && (
              <p className="mt-3 text-sm text-gray-500">
                Uploading image...
              </p>
            )}
          </div>

          {/* Name */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Full Name
            </label>

            <input
              value={fullName}
              onChange={e =>
                setFullName(e.target.value)
              }
              placeholder="Enter your full name"
              className={inputClass}
            />
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Bio
            </label>

            <textarea
              value={bio}
              onChange={e =>
                setBio(e.target.value)
              }
              placeholder="Tell people about yourself..."
              className={`${inputClass} min-h-[120px] resize-none`}
            />
          </div>

          {/* Save */}
          <button
            onClick={saveProfile}
            disabled={saving || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <Save size={18} />

            {saving
              ? 'Saving Changes...'
              : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}