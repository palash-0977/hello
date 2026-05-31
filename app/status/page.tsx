'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import {
  Plus, X, Eye, ChevronRight, Type, Clock, CheckCheck, Trash2, EyeOff, Pause,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
type StatusItem = {
  id: string
  user_id: string
  content: string | null
  type: 'text'
  bg_color: string
  music_url: string | null
  music_title: string | null
  created_at: string
  expires_at: string
  views: string[]
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
  lastViewedIndex: number
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

// ─── Status Viewer ────────────────────────────────────────────
function StatusViewer({
  group,
  onClose,
  currentUserId,
  onMarkViewed,
  onDeleted,
  onHideUser,
  allGroups,
  setAllGroups,
  onAutoClose,
}: {
  group: GroupedStatus
  onClose: () => void
  currentUserId: string
  onMarkViewed: (id: string) => void
  onDeleted: (id: string) => void
  onHideUser: (uid: string) => void
  allGroups: GroupedStatus[]
  setAllGroups: React.Dispatch<React.SetStateAction<GroupedStatus[]>>
  onAutoClose: () => void
}) {
  const supabase = createClient()
  const [idx, setIdx] = useState(group.lastViewedIndex || 0)
  const [progress, setProgress] = useState(0)
  const [showViewers, setShowViewers] = useState(false)
  const [viewerNames, setViewerNames] = useState<Record<string, string>>({})
  const [showMenu, setShowMenu] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pressHoldTimer = useRef<NodeJS.Timeout | null>(null)
  const item = group.items[idx]
  const DURATION = 5000
  const isOwn = group.profile.id === currentUserId

  const currentGroupIndex = allGroups.findIndex(g => g.profile.id === group.profile.id)

  useEffect(() => {
    onMarkViewed(item.id)
    setProgress(0)
    setShowViewers(false)
    setIsPaused(false)

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    if (item.music_url) {
      audioRef.current = new Audio(item.music_url)
      audioRef.current.loop = true
      audioRef.current.play().catch(() => {})
    }

    intervalRef.current = setInterval(() => {
      if (!isPaused) {
        setProgress(p => {
          if (p >= 100) {
            return 0
          }
          return p + (100 / (DURATION / 100))
        })
      }
    }, 100)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [idx, item.id])

  // Handle auto-advance separately
  useEffect(() => {
    const timer = setTimeout(() => {
      if (progress >= 100) {
        handleNext()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [progress])

  useEffect(() => {
    if (!showViewers || !item.views?.length) return
    const unknownIds = item.views.filter((uid: string) => !viewerNames[uid])
    if (!unknownIds.length) return

    supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', unknownIds)
      .then(({ data }) => {
        if (!data) return
        setViewerNames(prev => {
          const next = { ...prev }
          data.forEach(p => {
            next[p.id] = p.full_name || p.username || p.id
          })
          return next
        })
      })
  }, [showViewers, item.id])

  const handleNext = useCallback(() => {
    if (idx < group.items.length - 1) {
      setIdx(i => i + 1)
    } else if (currentGroupIndex < allGroups.length - 1) {
      setAllGroups(prev => prev.map((g, i) => 
        i === currentGroupIndex ? { ...g, lastViewedIndex: idx } : g
      ))
      const event = new CustomEvent('statusNextUser', { detail: { groupIndex: currentGroupIndex + 1 } })
      window.dispatchEvent(event)
    } else {
      onAutoClose()
    }
  }, [idx, group.items.length, currentGroupIndex, allGroups, onAutoClose, setAllGroups])

  const handlePrev = useCallback(() => {
    if (idx > 0) {
      setIdx(i => i - 1)
    } else if (currentGroupIndex > 0) {
      setAllGroups(prev => prev.map((g, i) => 
        i === currentGroupIndex ? { ...g, lastViewedIndex: idx } : g
      ))
      const event = new CustomEvent('statusPrevUser', { detail: { groupIndex: currentGroupIndex - 1, lastIndex: true } })
      window.dispatchEvent(event)
    }
  }, [idx, currentGroupIndex, allGroups, setAllGroups])

  const deleteItem = async () => {
    await supabase.from('statuses').delete().eq('id', item.id)
    onDeleted(item.id)
    if (group.items.length === 1) {
      onAutoClose()
    } else if (idx >= group.items.length - 1) {
      setIdx(i => i - 1)
    }
    setShowMenu(false)
  }

  const handlePressStart = () => {
    pressHoldTimer.current = setTimeout(() => {
      setIsPaused(true)
      if (audioRef.current) audioRef.current.pause()
    }, 500)
  }

  const handlePressEnd = () => {
    if (pressHoldTimer.current) clearTimeout(pressHoldTimer.current)
    setIsPaused(false)
    if (audioRef.current && item.music_url) audioRef.current.play().catch(() => {})
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
    >
      <div className="flex gap-1 px-3 pt-3 pb-1 z-10">
        {group.items.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 px-4 py-2 z-10">
        <UserAvatar profile={group.profile} size={10} />
        <div className="flex-1">
          <p className="text-white text-sm font-semibold">
            {isOwn ? 'My Status' : (group.profile.full_name || group.profile.username)}
          </p>
          <p className="text-white/60 text-xs">{timeAgo(item.created_at)} · {expiresIn(item.expires_at)}</p>
        </div>

        {item.music_title && (
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-2 py-1 rounded-full">
            <span className="text-white text-xs">🎵</span>
            <span className="text-white text-xs truncate max-w-[100px]">{item.music_title}</span>
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="text-white/70 hover:text-white p-1 text-lg font-bold leading-none"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden shadow-xl min-w-[160px] z-20">
              {isOwn && (
                <button
                  onClick={deleteItem}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-zinc-700 transition"
                >
                  <Trash2 size={14} />
                  Delete this status
                </button>
              )}
              {!isOwn && (
                <button
                  onClick={() => { onHideUser(group.profile.id); onAutoClose() }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-yellow-400 hover:bg-zinc-700 transition"
                >
                  <EyeOff size={14} />
                  Hide {group.profile.full_name || group.profile.username}
                </button>
              )}
              <button
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white/50 hover:bg-zinc-700 transition"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          )}
        </div>

        <button onClick={onClose} className="text-white/70 hover:text-white p-1">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 relative">
        <div
          className="absolute inset-0 flex items-center justify-center p-8"
          style={{ backgroundColor: item.bg_color }}
        >
          <p
            className="text-center text-2xl font-bold leading-snug break-words max-w-full"
            style={{ color: TEXT_COLORS[item.bg_color] || '#ffffff' }}
          >
            {item.content}
          </p>
        </div>
        
        <button 
          className="absolute left-0 top-0 w-1/3 h-full z-10" 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        />
        <button 
          className="absolute right-0 top-0 w-1/3 h-full z-10" 
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
        />
      </div>

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
              {item.views.map((uid: string) => (
                <div key={uid} className="flex items-center gap-2 py-2 border-b border-white/10">
                  <CheckCheck size={14} className="text-indigo-400" />
                  <span className="text-white/80 text-xs">
                    {viewerNames[uid] ?? 'Loading…'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/60 backdrop-blur rounded-full p-4">
            <Pause size={32} className="text-white" />
          </div>
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
  const [text, setText] = useState('')
  const [bgColor, setBgColor] = useState(BG_COLORS[0])
  const [musicFile, setMusicFile] = useState<File | null>(null)
  const [musicTitle, setMusicTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const musicFileRef = useRef<HTMLInputElement>(null)

  const post = async () => {
    if (!text.trim()) return
    setUploading(true)
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    
    let musicUrl = null
    let musicTitleFinal = null
    
    try {
      if (musicFile) {
        const ext = musicFile.name.split('.').pop() || 'mp3'
        const path = `status-music/${userId}_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('status-music').upload(path, musicFile, { upsert: false })
        if (upErr) {
          console.error('Music upload error:', upErr)
          musicUrl = null
          musicTitleFinal = null
        } else {
          const { data: urlData } = supabase.storage.from('status-music').getPublicUrl(path)
          musicUrl = urlData.publicUrl
          musicTitleFinal = musicTitle || musicFile.name.replace(/\.[^/.]+$/, '')
        }
      }
      
      const { error: insertError } = await supabase.from('statuses').insert({
        user_id: userId, 
        type: 'text', 
        content: text.trim(),
        bg_color: bgColor,
        music_url: musicUrl,
        music_title: musicTitleFinal,
        expires_at: expires, 
        views: [],
      })
      
      if (insertError) {
        console.error('Status insert error:', insertError)
        alert('Failed to post status: ' + insertError.message)
        setUploading(false)
        return
      }
      
      onPosted()
      onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to post status')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">New Status</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
        </div>
        
        <div className="px-5 py-4">
          <div className="w-full h-48 rounded-2xl flex items-center justify-center mb-4 transition-colors" style={{ backgroundColor: bgColor }}>
            <p className="text-center text-xl font-bold px-4 break-words" style={{ color: TEXT_COLORS[bgColor] || '#fff' }}>
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
          
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Add music (optional)</p>
            {musicFile ? (
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 rounded-xl px-3 py-2">
                <span className="text-lg">🎵</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">{musicTitle || musicFile.name}</p>
                  <p className="text-xs text-gray-400">{(musicFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button 
                  onClick={() => { setMusicFile(null); setMusicTitle('') }}
                  className="text-gray-400 hover:text-red-400 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => musicFileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 py-3 text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition"
              >
                + Add music (optional)
              </button>
            )}
            <input
              ref={musicFileRef}
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setMusicFile(file)
                  setMusicTitle('')
                }
              }}
              className="hidden"
            />
            {musicFile && (
              <input
                type="text"
                value={musicTitle}
                onChange={(e) => setMusicTitle(e.target.value)}
                placeholder="Music title (optional)"
                className="w-full mt-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-400"
              />
            )}
          </div>
          
          <p className="text-xs text-gray-400 mb-2">Background color</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {BG_COLORS.map(c => (
              <button key={c} onClick={() => setBgColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${bgColor === c ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
            <Clock size={12} /><span>Status expires in 24 hours</span>
          </div>
          
          <button 
            onClick={post}
            disabled={uploading || !text.trim()}
            className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {uploading ? 'Posting…' : 'Post Status'}
          </button>
        </div>
      </div>
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
      <ChevronRight size={16} className="text-gray-300 dark:zinc-600 flex-shrink-0" />
    </button>
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
  const [hiddenUsers, setHiddenUsers] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem('status_hidden_users')
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch { return new Set() }
  })

  const refreshStatuses = useCallback(() => {
    if (currentUserId) loadStatuses(currentUserId)
  }, [currentUserId])

  const handleCloseViewer = useCallback(() => {
    setViewingGroup(null)
    refreshStatuses()
  }, [refreshStatuses])

  useEffect(() => {
    const handleNextUser = (e: CustomEvent) => {
      const { groupIndex } = e.detail
      if (otherGroups[groupIndex]) {
        setViewingGroup({ ...otherGroups[groupIndex], lastViewedIndex: 0 })
      } else {
        setViewingGroup(null)
        refreshStatuses()
      }
    }
    
    const handlePrevUser = (e: CustomEvent) => {
      const { groupIndex } = e.detail
      if (otherGroups[groupIndex]) {
        const group = otherGroups[groupIndex]
        setViewingGroup({ ...group, lastViewedIndex: group.items.length - 1 })
      }
    }
    
    window.addEventListener('statusNextUser' as any, handleNextUser as any)
    window.addEventListener('statusPrevUser' as any, handlePrevUser as any)
    return () => {
      window.removeEventListener('statusNextUser' as any, handleNextUser as any)
      window.removeEventListener('statusPrevUser' as any, handlePrevUser as any)
    }
  }, [otherGroups, refreshStatuses])

  const hideUser = (uid: string) => {
    setHiddenUsers(prev => {
      const next = new Set(prev).add(uid)
      localStorage.setItem('status_hidden_users', JSON.stringify([...next]))
      return next
    })
    setOtherGroups(prev => prev.filter(g => g.profile.id !== uid))
  }

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
    const { data: iFollow } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', userId)

    const followingIds = iFollow?.map(r => r.following_id) ?? []
    const allIds = [...new Set([...followingIds, userId])]

    const { data: statusData } = await supabase
      .from('statuses')
      .select(`
        id, user_id, content, type, bg_color, music_url, music_title, created_at, expires_at, views,
        profile:profiles!statuses_user_id_fkey(id, full_name, username, avatar_url)
      `)
      .in('user_id', allIds)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    const items = (statusData || []) as unknown as StatusItem[]
    setMyStatuses(items.filter(s => s.user_id === userId))

    const otherItems = items.filter(s => s.user_id !== userId)
    const grouped: Record<string, GroupedStatus> = {}

    for (const item of otherItems) {
      const uid = item.user_id
      if (hiddenUsers.has(uid)) continue
      if (!grouped[uid]) grouped[uid] = { profile: item.profile, items: [], seen: false, lastViewedIndex: 0 }
      grouped[uid].items.push(item)
      if (item.views?.includes(userId)) grouped[uid].seen = true
    }

    setOtherGroups(
      Object.values(grouped).sort((a, b) => (a.seen ? 1 : 0) - (b.seen ? 1 : 0))
    )
    setLoading(false)
  }

  const markViewed = async (statusId: string) => {
    if (!currentUserId) return
    const { data } = await supabase.from('statuses').select('views').eq('id', statusId).single()
    if (!data) return
    const views: string[] = data.views || []
    if (views.includes(currentUserId)) return
    await supabase.from('statuses').update({ views: [...views, currentUserId] }).eq('id', statusId)
  }

  const handleDeleted = (deletedId: string) => {
    setMyStatuses(prev => prev.filter(s => s.id !== deletedId))
    setOtherGroups(prev =>
      prev
        .map(g => ({ ...g, items: g.items.filter(s => s.id !== deletedId) }))
        .filter(g => g.items.length > 0)
    )
  }

  const myGroup: GroupedStatus | null = myProfile
    ? { profile: myProfile, items: myStatuses, seen: true, lastViewedIndex: 0 }
    : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors">
      <Sidebar />
      <main className="sm:ml-[72px] px-4 py-6 pb-24 sm:pb-6">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-5 text-2xl font-bold text-gray-900 dark:text-white">Status</h1>

          <div className="mb-6">
            <div
              className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-700 transition"
              onClick={() => { if (myStatuses.length > 0 && myGroup) setViewingGroup(myGroup); else setShowCompose(true) }}
            >
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
              {otherGroups.filter(g => !g.seen).length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-400 dark:gray-500 uppercase tracking-widest mb-3 px-1">Recent</p>
                  <div className="space-y-2 mb-5">
                    {otherGroups.filter(g => !g.seen).map(group => (
                      <StatusGroupRow key={group.profile.id} group={group} currentUserId={currentUserId!} onClick={() => setViewingGroup(group)} />
                    ))}
                  </div>
                </>
              )}
              {otherGroups.filter(g => g.seen).length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-400 dark:gray-500 uppercase tracking-widest mb-3 px-1">Viewed</p>
                  <div className="space-y-2">
                    {otherGroups.filter(g => g.seen).map(group => (
                      <StatusGroupRow key={group.profile.id} group={group} currentUserId={currentUserId!} onClick={() => setViewingGroup(group)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {showCompose && currentUserId && (
        <ComposeModal
          userId={currentUserId}
          onClose={() => setShowCompose(false)}
          onPosted={() => currentUserId && loadStatuses(currentUserId)}
        />
      )}

      {viewingGroup && currentUserId && (
        <StatusViewer
          group={viewingGroup}
          currentUserId={currentUserId}
          onClose={handleCloseViewer}
          onMarkViewed={markViewed}
          onDeleted={handleDeleted}
          onHideUser={hideUser}
          allGroups={otherGroups}
          setAllGroups={setOtherGroups}
          onAutoClose={handleCloseViewer}
        />
      )}
    </div>
  )
}