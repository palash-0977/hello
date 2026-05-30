'use client'

import Sidebar from '@/app/components/Sidebar'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useParams } from 'next/navigation'
import {
  UserPlus,
  UserCheck,
  MoreVertical,
  Flag,
  Ban,
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
  const profileId = params.id as string

  const [profile, setProfile] =
    useState<Profile | null>(null)

  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)

  const [isFollowing, setIsFollowing] =
    useState(false)

  const [currentUserId, setCurrentUserId] =
    useState('')

  const [menuOpen, setMenuOpen] = useState(false)

  const [loading, setLoading] = useState(true)

  const [followLoading, setFollowLoading] =
    useState(false)

  useEffect(() => {
    if (profileId) {
      loadProfile()
    }
  }, [profileId])

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

      setCurrentUserId(user.id)

      // get profile
      const { data: profileData, error } =
        await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .maybeSingle()

      console.log(error)

      if (profileData) {
        setProfile(profileData)
      }

      // followers count
      const { count: followerCount } =
        await supabase
          .from('followers')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('following_id', profileId)

      // following count
      const { count: followingCount } =
        await supabase
          .from('followers')
          .select('*', {
            count: 'exact',
            head: true,
          })
          .eq('follower_id', profileId)

      setFollowers(followerCount || 0)
      setFollowing(followingCount || 0)

      // check follow
      const { data: followData } =
        await supabase
          .from('followers')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', profileId)
          .maybeSingle()

      setIsFollowing(!!followData)
    } catch (err) {
      console.error(err)
    }

    setLoading(false)
  }

  const toggleFollow = async () => {
    if (!currentUserId || followLoading) return

    setFollowLoading(true)

    try {
      // unfollow
      if (isFollowing) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profileId)

        if (error) {
          console.error(error)
          setFollowLoading(false)
          return
        }

        setFollowers((prev) => prev - 1)
        setIsFollowing(false)
      }

      // follow
      else {
        // insert follow
        const { error: followError } =
          await supabase
            .from('followers')
            .insert({
              follower_id: currentUserId,
              following_id: profileId,
            })

        if (followError) {
          console.error(followError)
          setFollowLoading(false)
          return
        }

        // notification insert
        const { error: notificationError } =
          await supabase
            .from('notifications')
            .insert({
              receiver_id: profileId,
              sender_id: currentUserId,
              type: 'follow',
              text: 'started following you',
              read: false,
            })

        console.log(notificationError)

        setFollowers((prev) => prev + 1)
        setIsFollowing(true)
      }
    } catch (err) {
      console.error(err)
    }

    setFollowLoading(false)
  }

  const blockUser = async () => {
    if (!currentUserId) return

    try {
      await supabase
        .from('blocked_users')
        .insert({
          blocker_id: currentUserId,
          blocked_id: profileId,
        })

      alert('User blocked')
    } catch (err) {
      console.error(err)
    }

    setMenuOpen(false)
  }

  // loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />

        <main className="sm:ml-[72px] px-4 py-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm">
              Loading...
            </div>
          </div>
        </main>
      </div>
    )
  }

  // no profile
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />

        <main className="sm:ml-[72px] px-4 py-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              User not found
            </div>
          </div>
        </main>
      </div>
    )
  }

  const isOwnProfile =
    currentUserId === profileId

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <main className="sm:ml-[72px] px-4 py-6 pb-24 sm:pb-6 sm:px-8">
        <div className="mx-auto max-w-3xl">

          {/* profile card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-7 shadow-sm">

            {/* top */}
            <div className="flex items-start justify-between gap-4">

              {/* left */}
              <div className="flex items-center gap-4 min-w-0">

                {/* avatar */}
                <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center">

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
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.full_name || 'User'}
                  </h1>

                  {profile.username && (
                    <p className="text-sm text-indigo-500 font-medium">
                      @{profile.username}
                    </p>
                  )}

                  {profile.bio && (
                    <p className="mt-2 text-sm text-gray-500">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>

              
                
            </div>

            {/* stats */}
            <div className="mt-6 grid grid-cols-2 gap-3">

              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold">
                  {followers}
                </p>

                <p className="text-xs text-gray-500">
                  Followers
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold">
                  {following}
                </p>

                <p className="text-xs text-gray-500">
                  Following
                </p>
              </div>
            </div>

            {/* follow button */}
            {!isOwnProfile && (
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={`mt-5 w-full flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                  isFollowing
                    ? 'bg-gray-100 text-gray-700 border border-gray-200'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {followLoading ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isFollowing ? (
                  <UserCheck size={16} />
                ) : (
                  <UserPlus size={16} />
                )}

                {followLoading
                  ? 'Loading...'
                  : isFollowing
                  ? 'Following'
                  : 'Follow'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}