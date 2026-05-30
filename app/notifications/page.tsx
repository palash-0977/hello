'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../components/Sidebar'
import { createClient } from '@/lib/supabaseClient'

type Notification = {
  id: string
  text: string
  type: string
  read: boolean
  created_at: string
  sender: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  }
}

export default function NotificationsPage() {
  const supabase = createClient()

  const [notifications, setNotifications] = useState<
    Notification[]
  >([])

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id,
        text,
        type,
        read,
        created_at,
        sender:sender_id (
          id,
          full_name,
          username,
          avatar_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    console.log(data)
    console.log(error)

    if (data) {
      setNotifications(data as any)

      // mark as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <main className="sm:ml-[72px] px-4 py-6 pb-24">
        <div className="mx-auto max-w-2xl">

          <h1 className="mb-6 text-2xl font-bold">
            Notifications
          </h1>

          {loading ? (
            <div className="rounded-3xl bg-white border border-gray-200 p-6 text-center text-sm text-gray-500">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-3xl bg-white border border-gray-200 p-10 text-center text-sm text-gray-500">
              No notifications yet
            </div>
          ) : (
            <div className="space-y-3">

              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={`/profile/${notification.sender.id}`}
                  className="flex items-center gap-4 rounded-3xl border border-gray-200 bg-white p-4 hover:border-indigo-200 transition"
                >
                  {/* avatar */}
                  <div className="h-14 w-14 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {notification.sender.avatar_url ? (
                      <img
                        src={
                          notification.sender.avatar_url
                        }
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-gray-400">
                        {(
                          notification.sender
                            .full_name ||
                          notification.sender
                            .username ||
                          'U'
                        )[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold">
                        {notification.sender.full_name ||
                          notification.sender.username}
                      </span>{' '}
                      {notification.text}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(
                        notification.created_at
                      ).toLocaleString()}
                    </p>
                  </div>

                  {!notification.read && (
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}