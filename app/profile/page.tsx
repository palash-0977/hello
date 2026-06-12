'use client'

import Sidebar from '../components/Sidebar'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import {
  Settings,
  Users,
  Edit,
} from 'lucide-react'

type Profile = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  bio: string | null
}

export default function MyProfilePage() {
  const supabase = createClient()

  const [profile, setProfile] =
    useState<Profile | null>(null)

  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileData) {
        setProfile(profileData)
      }

      // followers
      const { count: followersCount } =
        await supabase
          .from('followers')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('following_id', user.id)

      // following
      const { count: followingCount } =
        await supabase
          .from('followers')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('follower_id', user.id)

      setFollowers(followersCount || 0)
      setFollowing(followingCount || 0)
    } catch (err) {
      console.error(err)
    }

    setLoading(false)
  }

  if (loading) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <main className="sm:ml-[72px] px-4 py-6 pb-24 sm:px-8">
        <div className="mx-auto max-w-3xl">

          <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm animate-pulse">

            {/* Top */}
            <div className="flex items-start justify-between gap-4">

              <div className="flex items-center gap-4 flex-1">

                {/* Avatar */}
                <div className="h-24 w-24 rounded-full bg-gray-200 flex-shrink-0" />

                {/* Info */}
                <div className="flex-1">
                  <div className="h-7 w-48 rounded bg-gray-200" />
                  <div className="mt-3 h-4 w-32 rounded bg-gray-200" />
                  <div className="mt-4 h-4 w-full rounded bg-gray-200" />
                  <div className="mt-2 h-4 w-3/4 rounded bg-gray-200" />
                </div>
              </div>

              {/* Settings */}
              <div className="h-12 w-12 rounded-2xl bg-gray-200" />
            </div>

            {/* Stats */}
            <div className="mt-7 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="mx-auto h-8 w-12 rounded bg-gray-200" />
                <div className="mx-auto mt-3 h-3 w-20 rounded bg-gray-200" />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="mx-auto h-8 w-12 rounded bg-gray-200" />
                <div className="mx-auto mt-3 h-3 w-20 rounded bg-gray-200" />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-5 flex gap-3">
              <div className="h-12 flex-1 rounded-2xl bg-gray-200" />
              <div className="h-12 w-36 rounded-2xl bg-gray-200" />
            </div>

          </div>

        </div>
      </main>
    </div>
  )
}

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />

        <main className="sm:ml-[72px] px-4 py-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center">
              Profile not found
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <main className="sm:ml-[72px] px-4 py-6 pb-24 sm:px-8">
        <div className="mx-auto max-w-3xl">

          {/* card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm">

            {/* top */}
            <div className="flex items-start justify-between gap-4">

              {/* left */}
              <div className="flex items-center gap-4 min-w-0">

                {/* avatar */}
                <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">

                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={
                        profile.full_name || 'User'
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-gray-400">
                      {(
                        profile.full_name ||
                        profile.username ||
                        'U'
                      )[0].toUpperCase()}
                    </span>
                  )}
                </div>

                {/* info */}
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold text-gray-900">
                    {profile.full_name || 'User'}
                  </h1>

                  {profile.username && (
                    <p className="text-sm text-indigo-500 font-medium mt-1">
                      @{profile.username}
                    </p>
                  )}

                  {profile.bio && (
                    <p className="mt-3 text-sm text-gray-500">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* settings */}
              <Link
                href="/profile/settings"
                className="p-3 rounded-2xl border border-gray-200 hover:bg-gray-50 transition"
              >
                <Settings
                  size={20}
                  className="text-gray-600"
                />
              </Link>
            </div>

            {/* stats */}
            <div className="mt-7 grid grid-cols-2 gap-4">

              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {followers}
                </p>

                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Followers
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {following}
                </p>

                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Following
                </p>
              </div>
            </div>

            {/* buttons */}
            <div className="mt-5 flex gap-3">

              <Link
                href="/profile/settings"
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition"
              >
                <Edit size={16} />
                Edit Profile
              </Link>

              <Link
                href="/profile/followers"
                className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <Users size={16} />
                Friends
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}