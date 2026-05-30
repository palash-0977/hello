// components/FollowersList.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Users, UserPlus } from 'lucide-react'

type Counts = {
  followers: number
  following: number
}

export default function FollowersList() {
  const supabase = createClient()

  const [counts, setCounts] = useState<Counts>({
    followers: 0,
    following: 0,
  })

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData.user

      if (!user) return

      const [{ count: followerCount }, { count: followingCount }] =
        await Promise.all([
          supabase
            .from('followers')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', user.id),

          supabase
            .from('followers')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', user.id),
        ])

      setCounts({
        followers: followerCount ?? 0,
        following: followingCount ?? 0,
      })
    }

    load()
  }, [])

  return (
    <div className="rounded-3xl border border-gray-200 bg-white  bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-white">
        Social Stats
      </h2>

      <div className="grid grid-cols-2 gap-4">

        <div className="rounded-2xl bg-indigo-300  p-5">
          <div className="mb-3 flex items-center justify-between">
            <Users className="text-indigo-800" size={24} />
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {counts.followers}
            </span>
          </div>

          <p className="text-sm text-black">
            Followers
          </p>
        </div>

        <div className="rounded-2xl bg-pink-300 p-5">
          <div className="mb-3 flex items-center justify-between">
            <UserPlus className="text-black" size={24} />
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {counts.following}
            </span>
          </div>

          <p className="text-sm text-black">
            Following
          </p>
        </div>

      </div>
    </div>
  )
}