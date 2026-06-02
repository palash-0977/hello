'use client'

import Sidebar from '@/app/components/Sidebar'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import {
  UserPlus,
  UserCheck,
  MessageCircle,
  Lock,
} from 'lucide-react'

type Profile = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  bio: string | null
}

export default function ProfilePage() {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const profileId = params.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [theyFollowMe, setTheyFollowMe] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (profileId) loadProfile()
  }, [profileId])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setCurrentUserId(user.id)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle()

      if (profileData) setProfile(profileData)

      const { count: followerCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId)

      const { count: followingCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileId)

      setFollowers(followerCount || 0)
      setFollowing(followingCount || 0)

      // do I follow them?
      const { data: followData } = await supabase
        .from('followers')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', profileId)
        .maybeSingle()
      setIsFollowing(!!followData)

      // do they follow me?
      const { data: reverseFollow } = await supabase
        .from('followers')
        .select('*')
        .eq('follower_id', profileId)
        .eq('following_id', user.id)
        .maybeSingle()
      setTheyFollowMe(!!reverseFollow)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const toggleFollow = async () => {
    if (!currentUserId || followLoading) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profileId)

        if (error) { console.error(error); setFollowLoading(false); return }
        setFollowers(prev => prev - 1)
        setIsFollowing(false)
      } else {
        const { error: followError } = await supabase
          .from('followers')
          .insert({ follower_id: currentUserId, following_id: profileId })

        if (followError) { console.error(followError); setFollowLoading(false); return }

        await supabase.from('notifications').insert({
          receiver_id: profileId,
          sender_id: currentUserId,
          type: 'follow',
          text: 'started following you',
          read: false,
        })

        setFollowers(prev => prev + 1)
        setIsFollowing(true)
      }
    } catch (err) {
      console.error(err)
    }
    setFollowLoading(false)
  }

  // mutual = I follow them AND they follow me → chat is unlocked
  const isMutual = isFollowing && theyFollowMe

  const openChat = () => {
    router.push(`/messages?openContact=${profileId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
        <Sidebar />
        <main className="sm:ml-[72px] px-4 py-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7 shadow-sm animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-zinc-700" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-40 rounded-full bg-gray-200 dark:bg-zinc-700" />
                  <div className="h-3 w-24 rounded-full bg-gray-100 dark:bg-zinc-800" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
        <Sidebar />
        <main className="sm:ml-[72px] px-4 py-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center shadow-sm text-gray-500 dark:text-gray-400">
              User not found
            </div>
          </div>
        </main>
      </div>
    )
  }

  const isOwnProfile = currentUserId === profileId

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors">
      <Sidebar />

      <main className="sm:ml-[72px] px-4 py-6 pb-24 sm:pb-6 sm:px-8">
        <div className="mx-auto max-w-3xl">

          <div className="rounded-3xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-7 shadow-sm">

            {/* top row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">

                {/* avatar */}
                <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || 'User'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-gray-400 dark:text-zinc-500">
                      {(profile.full_name || profile.username || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>

                {/* name / username / bio */}
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {profile.full_name || 'User'}
                  </h1>
                  {profile.username && (
                    <p className="text-sm text-indigo-500 font-medium">
                      @{profile.username}
                    </p>
                  )}
                  {profile.bio && (
                    <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* stats */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{followers}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Followers</p>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{following}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Following</p>
              </div>
            </div>

            {/* action buttons — only shown for other users */}
            {!isOwnProfile && (
              <div className="mt-5 flex gap-3">

                {/* Follow / Following button */}
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                    isFollowing
                      ? 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {followLoading ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isFollowing ? (
                    <UserCheck size={16} />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {followLoading ? 'Loading…' : isFollowing ? 'Following' : 'Follow'}
                </button>

                {/* Message button */}
                
              </div>
            )}

            {/* hint shown when only one side follows */}
            {!isOwnProfile && !isMutual && (
              <p className="mt-3 text-center text-xs text-gray-400 dark:text-zinc-500">
                {!isFollowing && !theyFollowMe && 'Follow each other to unlock messaging'}
                {isFollowing && !theyFollowMe && 'Waiting for them to follow back to unlock chat'}
                {!isFollowing && theyFollowMe && 'Follow back to unlock messaging'}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}