'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import {
  Plus,
  X,
  Eye,
  ChevronRight,
  Image as ImageIcon,
  Type,
  Clock,
  CheckCheck,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
type StatusItem = {
  id: string
  user_id: string
  content: string | null
  image_url: string | null
  type: 'text' | 'image'
  bg_color: string
  created_at: string
  expires_at: string
  views: string[]   // array of viewer user_ids (stored as jsonb)
  profile: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  }
}

type GroupedStatus = {
  profile: StatusItem['profile']
  items: StatusItem[]
  seen: boolean
}

// ─── Constants ────────────────────────────────────────────────
const BG_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#2d6a4f', '#1b4332', '#7b2d8b', '#b5179e',
  '#d62828', '#023e8a', '#212529', '#343a40',
]

const TEXT_COLORS: Record<string, string> = {
  '#1a1a2e': '#e0e0ff', '#16213e': '#e0f0ff', '#0f3460': '#ffffff',
  '#533483': '#f0e6ff', '#2d6a4f': '#d0ffe8', '#1b4332': '#ccffe6',
  '#7b2d8b': '#ffe0ff', '#b5179e': '#fff0fa', '#d62828': '#fff0f0',
  '#023e8a': '#e0f0ff', '#212529': '#f8f9fa', '#343a40': '#f1f3f5',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function expiresIn(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'expired'
  const hrs = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hrs > 0) return `${hrs}h ${mins}m left`
  return `${mins}m left`
}

// ─── Avatar Helper ────────────────────────────────────────────
function UserAvatar({ profile, size = 12, ring = false, seen = true }: {
  profile: StatusItem['profile']
  size?: number
  ring?: boolean
  seen?: boolean
}) {
  const sz = `w-${size} h-${size}`
  const ringClass = ring
    ? seen
      ? 'ring-2 ring-gray-300 dark:ring-zinc-600'
      : 'ring-2 ring-indigo-500'
    : ''
  const colors = ['bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500']
  const color = colors[(profile.id?.charCodeAt(0) ?? 0) % colors.length]

  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name || 'User'}
        className={`${sz} rounded-full object-cover flex-shrink-0 ${ringClass}`}
      />
    )
  }
  return (
    <div className={`${sz} rounded-full ${color} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${ringClass}`}>
      {(profile.full_name || profile.username || 'U')[0].toUpperCase()}
    </div>
  )
}

// ─── Status Viewer (full-screen story viewer) ─────────────────
function StatusViewer({
  group,
  onClose,
  currentUserId,
  onMarkViewed,
}: {
  group: GroupedStatus
  onClose: () => void
  currentUserId: string
  onMarkViewed: (id: string) => void
}) {
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [showViewers, setShowViewers] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const item = group.items[idx]
  const DURATION = 5000

  useEffect(() => {
    onMarkViewed(item.id)
    setProgress(0)
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (idx < group.items.length - 1) {
            setIdx(i => i + 1)
          } else {
            onClose()
          }
          return 0
        }
        return p + (100 / (DURATION / 100))
      })
    }, 100)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [idx])

  const goNext = () => {
    if (idx < group.items.length - 1) setIdx(i => i + 1)
    else onClose()
  }

  const goPrev = () => {
    if (idx > 0) setIdx(i => i - 1)
  }

  const isOwn = group.profile.id === currentUserId

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Progress bars */}
      <div className="flex gap-1 px-3 pt-3 pb-1 z-10">
        {group.items.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white transition-none rounded-full"
              style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 z-10">
        <UserAvatar profile={group.profile} size={10} />
        <div className="flex-1">
          <p className="text-white text-sm font-semibold">
            {isOwn ? 'My Status' : (group.profile.full_name || group.profile.username)}
          </p>
          <p className="text-white/60 text-xs">{timeAgo(item.created_at)} · {expiresIn(item.expires_at)}</p>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white p-1">
          <X size={22} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {item.type === 'image' && item.image_url ? (
          <img src={item.image_url} alt="status" className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center p-8"
            style={{ backgroundColor: item.bg_color }}
          >
            <p
              className="text-center text-2xl font-bold leading-snug"
              style={{ color: TEXT_COLORS[item.bg_color] || '#ffffff' }}
            >
              {item.content}
            </p>
          </div>
        )}

        {/* Tap zones */}
        <button className="absolute left-0 top-0 w-1/3 h-full" onClick={goPrev} />
        <button className="absolute right-0 top-0 w-1/3 h-full" onClick={goNext} />
      </div>

      {/* Footer — views (only own) */}
      {isOwn && (
        <div className="z-10">
          <button
            onClick={() => setShowViewers(v => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-black/40 backdrop-blur text-white"
          >
            <Eye size={16} />
            <span className="text-sm">{item.views?.length ?? 0} views</span>
            <ChevronRight size={16} className={`ml-auto transition-transform ${showViewers ? 'rotate-90' : ''}`} />
          </button>

          {showViewers && item.views && item.views.length > 0 && (
            <div className="bg-black/60 backdrop-blur px-4 pb-4 max-h-40 overflow-y-auto">
              {item.views.map(uid => (
                <div key={uid} className="flex items-center gap-2 py-2 border-b border-white/10">
                  <CheckCheck size={14} className="text-indigo-400" />
                  <span className="text-white/70 text-xs">{uid}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Compose Modal ────────────────────────────────────────────
function ComposeModal({ onClose, onPosted, userId }: {
  onClose: () => void
  onPosted: () => void
  userId: string
}) {
  const supabase = createClient()
  const [tab, setTab] = useState<'text' | 'image'>('text')
  const [text, setText] = useState('')
  const [bgColor, setBgColor] = useState(BG_COLORS[0])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const post = async () => {
    if (tab === 'text' && !text.trim()) return
    if (tab === 'image' && !imageFile) return

    setUploading(true)
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    try {
      if (tab === 'text') {
        await supabase.from('statuses').insert({
          user_id: userId,
          type: 'text',
          content: text.trim(),
          bg_color: bgColor,
          expires_at: expires,
          views: [],
        })
      } else if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `status/${userId}_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('statuses').upload(path, imageFile, { upsert: false })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('statuses').getPublicUrl(path)
        await supabase.from('statuses').insert({
          user_id: userId,
          type: 'image',
          image_url: urlData.publicUrl,
          bg_color: '#000000',
          expires_at: expires,
          views: [],
        })
      }
      onPosted()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">New Status</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pt-4">
          {(['text', 'image'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
                tab === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              {t === 'text' ? <Type size={14} /> : <ImageIcon size={14} />}
              {t === 'text' ? 'Text' : 'Image'}
            </button>
          ))}
        </div>

        <div className="px-5 py-4">
          {tab === 'text' ? (
            <>
              {/* Preview */}
              <div
                className="w-full h-48 rounded-2xl flex items-center justify-center mb-4 transition-colors"
                style={{ backgroundColor: bgColor }}
              >
                <p
                  className="text-center text-xl font-bold px-4 break-words"
                  style={{ color: TEXT_COLORS[bgColor] || '#fff' }}
                >
                  {text || 'Type something…'}
                </p>
              </div>

              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                maxLength={200}
                placeholder="What's on your mind?"
                className="w-full rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-400 resize-none h-20 mb-3"
              />

              {/* Color picker */}
              <p className="text-xs text-gray-400 mb-2">Background color</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {BG_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${bgColor === c ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="mb-4">
              {imagePreview ? (
                <div className="relative w-full h-56 rounded-2xl overflow-hidden mb-3">
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setImageFile(null); setImagePreview('') }}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-56 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-400 transition"
                >
                  <ImageIcon size={32} />
                  <span className="text-sm">Tap to choose image</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
            <Clock size={12} />
            <span>Status expires in 24 hours</span>
          </div>

          <button
            onClick={post}
            disabled={uploading || (tab === 'text' && !text.trim()) || (tab === 'image' && !imageFile)}
            className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {uploading ? 'Posting…' : 'Post Status'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function StatusPage() {
  const supabase = createClient()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<StatusItem['profile'] | null>(null)
  const [myStatuses, setMyStatuses] = useState<StatusItem[]>([])
  const [otherGroups, setOtherGroups] = useState<GroupedStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [viewingGroup, setViewingGroup] = useState<GroupedStatus | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile) setMyProfile(profile)

      await loadStatuses(user.id)
    }
    init()
  }, [])

  const loadStatuses = async (userId: string) => {
    setLoading(true)

    // Get people I follow
    const { data: iFollow } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', userId)

    const followingIds = iFollow?.map(r => r.following_id) ?? []
    const allIds = [...new Set([...followingIds, userId])]

    // Fetch non-expired statuses
    const { data: statusData } = await supabase
      .from('statuses')
      .select(`
        id, user_id, content, image_url, type, bg_color, created_at, expires_at, views,
        profile:profiles!statuses_user_id_fkey(id, full_name, username, avatar_url)
      `)
      .in('user_id', allIds)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    const items = (statusData || []) as unknown as StatusItem[]

    // My statuses
    const mine = items.filter(s => s.user_id === userId)
    setMyStatuses(mine)

    // Others grouped by user
    const otherItems = items.filter(s => s.user_id !== userId)
    const grouped: Record<string, GroupedStatus> = {}

    for (const item of otherItems) {
      const uid = item.user_id
      if (!grouped[uid]) {
        grouped[uid] = {
          profile: item.profile,
          items: [],
          seen: false,
        }
      }
      grouped[uid].items.push(item)
      if (item.views?.includes(userId)) grouped[uid].seen = true
    }

    // Sort: unseen first
    const sortedGroups = Object.values(grouped).sort((a, b) =>
      (a.seen ? 1 : 0) - (b.seen ? 1 : 0)
    )

    setOtherGroups(sortedGroups)
    setLoading(false)
  }

  const markViewed = async (statusId: string) => {
    if (!currentUserId) return
    // Add currentUserId to views array via rpc or manual fetch-update
    const { data } = await supabase.from('statuses').select('views').eq('id', statusId).single()
    if (!data) return
    const views: string[] = data.views || []
    if (views.includes(currentUserId)) return
    await supabase.from('statuses').update({ views: [...views, currentUserId] }).eq('id', statusId)
  }

  const myGroup: GroupedStatus | null = myProfile
    ? { profile: myProfile, items: myStatuses, seen: true }
    : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors">
      <Sidebar />

      <main className="sm:ml-[72px] px-4 py-6 pb-24 sm:pb-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-5 text-2xl font-bold text-gray-900 dark:text-white">Status</h1>

          {/* ── My Status ── */}
          <div className="mb-6">
            <div
              className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-700 transition"
              onClick={() => {
                if (myStatuses.length > 0 && myGroup) {
                  setViewingGroup(myGroup)
                } else {
                  setShowCompose(true)
                }
              }}
            >
              {/* Avatar with + ring */}
              <div className="relative flex-shrink-0">
                {myProfile && <UserAvatar profile={myProfile} size={14} />}
                <button
                  onClick={e => { e.stopPropagation(); setShowCompose(true) }}
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900"
                >
                  <Plus size={11} className="text-white" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">My Status</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {myStatuses.length > 0
                    ? `${myStatuses.length} update${myStatuses.length > 1 ? 's' : ''} · ${timeAgo(myStatuses[0].created_at)}`
                    : 'Tap to add a status update'}
                </p>
              </div>

              {myStatuses.length > 0 && (
                <div className="flex items-center gap-1 text-gray-400">
                  <Eye size={14} />
                  <span className="text-xs">{myStatuses[0].views?.length ?? 0}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Others' Statuses ── */}
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-6 text-center text-sm text-gray-400">
              Loading statuses…
            </div>
          ) : otherGroups.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-10 text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No recent updates</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Follow people to see their status</p>
            </div>
          ) : (
            <div>
              {/* Unseen */}
              {otherGroups.filter(g => !g.seen).length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Recent</p>
                  <div className="space-y-2 mb-5">
                    {otherGroups.filter(g => !g.seen).map(group => (
                      <StatusGroupRow
                        key={group.profile.id}
                        group={group}
                        currentUserId={currentUserId!}
                        onClick={() => setViewingGroup(group)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Seen */}
              {otherGroups.filter(g => g.seen).length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Viewed</p>
                  <div className="space-y-2">
                    {otherGroups.filter(g => g.seen).map(group => (
                      <StatusGroupRow
                        key={group.profile.id}
                        group={group}
                        currentUserId={currentUserId!}
                        onClick={() => setViewingGroup(group)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Compose Modal */}
      {showCompose && currentUserId && (
        <ComposeModal
          userId={currentUserId}
          onClose={() => setShowCompose(false)}
          onPosted={() => currentUserId && loadStatuses(currentUserId)}
        />
      )}

      {/* Status Viewer */}
      {viewingGroup && currentUserId && (
        <StatusViewer
          group={viewingGroup}
          currentUserId={currentUserId}
          onClose={() => { setViewingGroup(null); currentUserId && loadStatuses(currentUserId) }}
          onMarkViewed={markViewed}
        />
      )}
    </div>
  )
}

// ─── Status Group Row ─────────────────────────────────────────
function StatusGroupRow({ group, onClick }: {
  group: GroupedStatus
  currentUserId: string
  onClick: () => void
}) {
  const latest = group.items[0]
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-700 transition text-left"
    >
      <UserAvatar profile={group.profile} size={14} ring seen={group.seen} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {group.profile.full_name || group.profile.username}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {group.items.length} update{group.items.length > 1 ? 's' : ''} · {timeAgo(latest.created_at)}
        </p>
      </div>

      <ChevronRight size={16} className="text-gray-300 dark:text-zinc-600 flex-shrink-0" />
    </button>
  )
}
