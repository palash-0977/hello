'use client'

import React, { useEffect, useState } from 'react'
import {
  MessageSquareText,
  UserSearch,
  CircleDot,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [avatar, setAvatar] = useState('')
  const [initial, setInitial] = useState('Y')

  // Hide mobile nav when inside a chat (chat=1 query param set by ChatWindow)
  const isChatOpen = searchParams.get('chat') === '1'

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile) {
        setAvatar(profile.avatar_url || '')
        const first = profile.full_name?.[0] || user.email?.[0] || 'Y'
        setInitial(first.toUpperCase())
      }
    }

    load()
  }, [])

  const navItems = [
    { href: '/messages', icon: MessageSquareText, label: 'Messages' },
    { href: '/status', icon: CircleDot, label: 'Status' },
    { href: '/search', icon: UserSearch, label: 'Search' },
  ]

  const AvatarBubble = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => (
    <Link href="/profile">
      <div
        className={`${size === 'md' ? 'w-9 h-9' : 'w-8 h-8'
          } overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-gray-700 dark:text-gray-200 text-xs font-semibold`}
      >
        {avatar ? (
          <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>
    </Link>
  )

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden sm:flex fixed left-0 top-0 h-screen w-[72px] flex-col items-center py-5 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-50 transition-colors">
        <Link href="/" className="mb-8 text-xl font-bold text-gray-900 dark:text-white">
          Hello
        </Link>

        <nav className="flex flex-col items-center gap-2 flex-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`group relative flex items-center justify-center w-11 h-11 rounded-2xl transition ${
                  active
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="absolute left-full ml-3 whitespace-nowrap rounded-lg bg-black dark:bg-white px-2 py-1 text-xs text-white dark:text-black opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  {label}
                </span>
              </Link>
            )
          })}
        </nav>

        <AvatarBubble />
      </aside>

      {/* ── Mobile Bottom Nav — hidden when chat is open ── */}
      {!isChatOpen && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-around px-2 z-50 transition-colors">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 ${
                  active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Icon size={22} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}

          <div className="flex flex-col items-center justify-center gap-1 flex-1">
            <AvatarBubble size="md" />
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">You</span>
          </div>
        </nav>
      )}
    </>
  )
}
