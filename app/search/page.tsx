'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import { Search, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'

type Profile = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  bio: string | null
}

export default function SearchPage() {
  const supabase = createClient()

  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setCurrentUserId(user.id)
      }
    }

    getUser()
  }, [])

  // search users
  useEffect(() => {
    if (!currentUserId) return

    const searchUsers = async () => {
      setLoading(true)

      let request = supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio')
        .neq('id', currentUserId)

      // search query
      if (query.trim()) {
        request = request.or(
          `full_name.ilike.%${query.trim()}%,username.ilike.%${query.trim()}%`
        )
      }

      // order users
      request = request.order('full_name', {
        ascending: true,
      })

      const { data, error } = await request.limit(50)

      console.log('SEARCH ERROR:', error)
      console.log('SEARCH DATA:', data)

      if (error) {
        console.error(error)
        setUsers([])
      } else {
        setUsers(data || [])
      }

      setLoading(false)
    }

    searchUsers()
  }, [query, currentUserId])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 sm:ml-[72px] px-4 py-6 pb-24 sm:pb-6">
        <div className="mx-auto max-w-2xl">

          {/* heading */}
          <h1 className="mb-6 text-2xl font-bold text-gray-900">
            Find People
          </h1>

          {/* search bar */}
          <div className="relative mb-6">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={query}
              onChange={(e) =>
                setQuery(e.target.value.toLowerCase())
              }
              placeholder="Search by name or @username..."
              className="w-full rounded-3xl border border-gray-200 bg-white py-4 pl-11 pr-4 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>

          {/* loading */}
          {loading ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              Searching...
            </div>
          ) : (
            <div className="space-y-2">

              {/* users */}
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/profile/${user.id}`}
                  className="flex items-center gap-4 rounded-3xl border border-gray-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm"
                >
                  {/* avatar */}
                  <div className="h-14 w-14 overflow-hidden rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name || 'User'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-gray-500">
                        {(user.full_name ||
                          user.username ||
                          'U')[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* info */}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold text-gray-900">
                      {user.full_name || 'User'}
                    </h2>

                    {user.username && (
                      <p className="truncate text-xs text-indigo-500 font-medium">
                        @{user.username}
                      </p>
                    )}

                    {user.bio && (
                      <p className="mt-1 line-clamp-1 text-xs text-gray-400">
                        {user.bio}
                      </p>
                    )}
                  </div>

                  {/* icon */}
                  <UserPlus
                    size={18}
                    className="text-gray-300 flex-shrink-0"
                  />
                </Link>
              ))}

              {/* empty */}
              {users.length === 0 && !loading && (
                <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Search
                      size={20}
                      className="text-gray-300"
                    />
                  </div>

                  <p className="text-sm font-medium text-gray-600">
                    No users found
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    Try a different name or username
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}