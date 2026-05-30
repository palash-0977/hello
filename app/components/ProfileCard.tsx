'use client'

import Sidebar from '../components/Sidebar'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { Settings } from 'lucide-react'

type Profile = {
  full_name: string | null
  avatar_url: string | null
  bio: string | null
}

export default function ProfileCard() {
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: authData } =
        await supabase.auth.getUser()

      const currentUser = authData.user

      setUser(currentUser)

      if (currentUser) {
        const { data } = await supabase
          .from('profiles')
          .select(
            'full_name, avatar_url, bio'
          )
          .eq('id', currentUser.id)
          .single()

        setProfile(data)
      }
    }

    load()
  }, [])

  if (!user) return null

  const avatar =
    profile?.avatar_url ||
    user.user_metadata?.avatar_url ||
    ''

  const name =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email ||
    'User'

  return (
    <div className=" bg-gray-50 bg-white">
      <Sidebar />

      {/* Main Content */}
      <main className="sm:ml-[72px] px-4 py-6 sm:px-8">

        <div className="mx-auto max-w-4xl">

          {/* Profile Card */}
          <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] p-4 sm:p-6 shadow-sm">

            {/* Top */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

              {/* Left */}
              <div className="flex items-center gap-4 min-w-0">

                {/* Avatar */}
                <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full bg-gray-200 flex-shrink-0">

                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl sm:text-3xl font-bold text-gray-700">
                      {name[0]}
                    </div>
                  )}

                </div>

                {/* User Info */}
                <div className="min-w-0 flex-1">

                  <h1 className="truncate text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {name}
                  </h1>

                  <p className="mt-1 truncate text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>

                  {profile?.bio && (
                    <p className="mt-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 break-words">
                      {profile.bio}
                    </p>
                  )}

                </div>
              </div>

              {/* Settings */}
              <Link
                href="/profile/settings"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#101012] px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#202024] transition"
              >
                <Settings size={15} />
                Settings
              </Link>

            </div>

          

              

              

         

          </div>

        </div>

      </main>
    </div>
  )
}