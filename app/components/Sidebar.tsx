// components/Sidebar.tsx

'use client'

import React, { useEffect, useState } from 'react'
import {
  MessageSquareText,
  UserSearch,
  Users,
  Bell,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

type Profile = {
  full_name: string | null
  avatar_url: string | null
}

export default function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()

  const [hasUnread, setHasUnread] = useState(false)
  const [avatar, setAvatar] = useState('')
  const [initial, setInitial] = useState('Y')

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile) {
        setAvatar(profile.avatar_url || '')

        const first =
          profile.full_name?.[0] ||
          user.email?.[0] ||
          'Y'

        setInitial(first.toUpperCase())
      }

      // Check unread notifications
      const { count } = await supabase
        .from('notifications')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('user_id', user.id)
        .eq('read', false)

      setHasUnread((count ?? 0) > 0)
    }

    load()

    // Live updates
    const channel = supabase
      .channel('notifications-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) return

          const { count } = await supabase
            .from('notifications')
            .select('*', {
              count: 'exact',
              head: true,
            })
            .eq('user_id', user.id)
            .eq('read', false)

          setHasUnread((count ?? 0) > 0)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const navItems = [
    {
      href: '/messages',
      icon: MessageSquareText,
      label: 'Messages',
    },
    {
      href: '/search',
      icon: UserSearch,
      label: 'Search',
    },

    {
      href: '/notifications',
      icon: Bell,
      label: 'Notifications',
      notification: hasUnread,
    },
  ]

  const Avatar = ({
    size = 'sm',
  }: {
    size?: 'sm' | 'md'
  }) => (
    <Link href="/profile">
      <div
        className={`${
          size === 'md'
            ? 'w-9 h-9'
            : 'w-8 h-8'
        } overflow-hidden rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-semibold`}
      >
        {avatar ? (
          <img
            src={avatar}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          initial
        )}
      </div>
    </Link>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex fixed left-0 top-0 h-screen w-[72px] flex-col items-center py-5 border-r border-gray-200 bg-white z-50">

        <Link
          href="/"
          className="mb-8 text-2xl font-bold text-gray-900"
        >
          Hello
        </Link>

        <nav className="flex flex-col items-center gap-2 flex-1">

          {navItems.map(
            ({
              href,
              icon: Icon,
              label,
              notification,
            }) => {
              const active =
                pathname === href

              return (
                <Link
                  key={href}
                  href={href}
                  className={`group relative flex items-center justify-center w-11 h-11 rounded-2xl transition ${
                    active
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="relative">
                    <Icon size={20} />

                    {notification && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
                    )}
                  </div>

                  <span className="absolute left-full ml-3 whitespace-nowrap rounded-lg bg-black px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition">
                    {label}
                  </span>
                </Link>
              )
            }
          )}
        </nav>

        <Avatar />
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-gray-200 bg-white flex items-center justify-around px-2 z-50">

        {navItems.map(
          ({
            href,
            icon: Icon,
            label,
            notification,
          }) => {
            const active =
              pathname === href

            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 ${
                  active
                    ? 'text-indigo-600'
                    : 'text-gray-500'
                }`}
              >
                <div className="relative">
                  <Icon size={22} />

                  {notification && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
                  )}
                </div>

                <span className="text-[10px] font-medium">
                  {label}
                </span>
              </Link>
            )
          }
        )}

        <div className="flex flex-col items-center justify-center gap-1 flex-1">
          <Avatar size="md" />
          <span className="text-[10px] font-medium text-gray-500">
            You
          </span>
        </div>
      </nav>
    </>
  )
}