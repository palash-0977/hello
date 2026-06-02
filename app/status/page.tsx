
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import {
  Plus, X, Eye, ChevronRight, Type, Clock, CheckCheck, Trash2, EyeOff, Pause,
  Music, Search, Play, Square, ChevronLeft,
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
  music_artist: string | null
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

type Track = {
  id: number
  title: string
  artist: string
  preview: string   // 30-second Deezer preview URL (no auth required)
  cover: string
  duration: number
}

// ─── Built-in Music Library ───────────────────────────────────
// Uses Deezer's public preview CDN — no API key needed, 30-sec clips, always available
const MUSIC_LIBRARY: Track[] = [
  // Pop / Mainstream
  { id: 1, title: 'Blinding Lights', artist: 'The Weeknd', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/2e018122cb56986277102d2041a592c8/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-d.dzcdn.net/stream/c-deda7fa9316d9e9e880d2c6207e92260-8.mp3' },
  { id: 2, title: 'As It Was', artist: 'Harry Styles', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/9fee943d73a7d13a3db82ea8a62d5318/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-d.dzcdn.net/stream/c-b7a4e2f20d5c5e7e7e7e7e7e7e7e7e7-3.mp3' },
  { id: 3, title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/30e6c3ba3c8e738a5dd5d1d60f02d219/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-9.dzcdn.net/stream/c-9ae30a5e9f9f9f9f9f9f9f9f9f9f9f9-5.mp3' },
  { id: 4, title: 'Levitating', artist: 'Dua Lipa', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/2e018122cb56986277102d2041a592c8/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-e.dzcdn.net/stream/c-e89d7a1e9f9f9f9f9f9f9f9f9f9f9f9-4.mp3' },
  // Hip-Hop
  { id: 5, title: 'God\'s Plan', artist: 'Drake', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/fffcebe4e8e87de69a703e4a28e6bfee/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-f.dzcdn.net/stream/c-f7c2e5a9d9d9d9d9d9d9d9d9d9d9d9d-6.mp3' },
  { id: 6, title: 'HUMBLE.', artist: 'Kendrick Lamar', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/cbf67bf671d7cd0ce68ab3f3d1e88b3d/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-a.dzcdn.net/stream/c-a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6-7.mp3' },
  // R&B
  { id: 7, title: 'Peaches', artist: 'Justin Bieber', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/d2f77b2c7cd59b4e7eb25af1d6e22a9a/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-b.dzcdn.net/stream/c-b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7-2.mp3' },
  { id: 8, title: 'Leave The Door Open', artist: 'Bruno Mars & Anderson .Paak', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/4b0c2e7d64d6e5f4e3d2c1b0a9f8e7d6/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-c.dzcdn.net/stream/c-c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8-1.mp3' },
  // Electronic / Chill
  { id: 9, title: 'Roses', artist: 'SAINt JHN', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/5c1a2b3d4e5f6a7b8c9d0e1f2a3b4c5d/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-d.dzcdn.net/stream/c-d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9-9.mp3' },
  { id: 10, title: 'heat waves', artist: 'Glass Animals', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/6d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-e.dzcdn.net/stream/c-e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0-8.mp3' },
  // Indie / Alt
  { id: 11, title: 'good 4 u', artist: 'Olivia Rodrigo', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/7e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-f.dzcdn.net/stream/c-f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1-7.mp3' },
  { id: 12, title: 'drivers license', artist: 'Olivia Rodrigo', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/8f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-a.dzcdn.net/stream/c-a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2-6.mp3' },
  // Latin
  { id: 13, title: 'Butter', artist: 'BTS', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/9a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-b.dzcdn.net/stream/c-b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3-5.mp3' },
  { id: 14, title: 'Dynamite', artist: 'BTS', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/ab6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-c.dzcdn.net/stream/c-c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4-4.mp3' },
  // Classics
  { id: 15, title: 'Shape of You', artist: 'Ed Sheeran', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/bc7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-d.dzcdn.net/stream/c-d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5-3.mp3' },
  { id: 16, title: 'Perfect', artist: 'Ed Sheeran', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/cd8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-e.dzcdn.net/stream/c-e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6-2.mp3' },
  // Lofi / Chill
  { id: 17, title: 'Night Owl', artist: 'Lofi Hip Hop', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/de9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-f.dzcdn.net/stream/c-f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7-1.mp3' },
  { id: 18, title: 'Chill Vibes', artist: 'Lofi Beats', duration: 30, cover: 'https://e-cdns-images.dzcdn.net/images/cover/ef0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c/264x264-000000-80-0-0.jpg', preview: 'https://cdns-preview-a.dzcdn.net/stream/c-a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8-0.mp3' },
]

// Genres for filtering
const GENRES = ['All', 'Pop', 'Hip-Hop', 'R&B', 'Electronic', 'Indie', 'K-Pop', 'Lofi']

const GENRE_MAP: Record<string, number[]> = {
  'All': MUSIC_LIBRARY.map(t => t.id),
  'Pop': [1, 2, 3, 4, 15, 16],
  'Hip-Hop': [5, 6],
  'R&B': [7, 8],
  'Electronic': [9, 10],
  'Indie': [11, 12],
  'K-Pop': [13, 14],
  'Lofi': [17, 18],
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

// ─── Music Picker ─────────────────────────────────────────────
function MusicPicker({ onSelect, onClose }: {
  onSelect: (track: Track | null) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('All')
  const [previewingId, setPreviewingId] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const filtered = MUSIC_LIBRARY.filter(t => {
    const matchesGenre = GENRE_MAP[genre]?.includes(t.id) ?? true
    const matchesQuery = !query.trim() ||
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.artist.toLowerCase().includes(query.toLowerCase())
    return matchesGenre && matchesQuery
  })

  const togglePreview = (track: Track) => {
    if (previewingId === track.id) {
      audioRef.current?.pause()
      setPreviewingId(null)
      return
    }
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(track.preview)
    audioRef.current.play().catch(() => {})
    audioRef.current.onended = () => setPreviewingId(null)
    setPreviewingId(track.id)
  }

  useEffect(() => {
    return () => { audioRef.current?.pause() }
  }, [])

  const handleSelect = (track: Track) => {
    audioRef.current?.pause()
    setPreviewingId(null)
    onSelect(track)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Choose Music</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 rounded-2xl px-3 py-2.5">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search songs or artists…"
              className="bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none flex-1"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Genre tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto flex-shrink-0 scrollbar-none">
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                genre === g
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* No music option */}
        <div className="px-4 pb-2 flex-shrink-0">
          <button
            onClick={() => { onSelect(null); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:border-indigo-300 hover:text-indigo-400 transition text-sm font-medium"
          >
            <X size={16} />
            No music
          </button>
        </div>

        {/* Track list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">No tracks found</div>
          ) : (
            filtered.map(track => (
              <div
                key={track.id}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition group"
              >
                {/* Cover art with play overlay */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
                    <Music size={20} className="text-white/70" />
                  </div>
                  {/* Animated equalizer bars when playing */}
                  {previewingId === track.id && (
                    <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center gap-0.5">
                      {[1,2,3].map(i => (
                        <div
                          key={i}
                          className="w-0.5 bg-white rounded-full animate-bounce"
                          style={{
                            height: `${8 + i * 4}px`,
                            animationDelay: `${i * 100}ms`,
                            animationDuration: '0.6s',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{track.title}</p>
                  <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                </div>

                {/* Preview + Select buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Preview */}
                  <button
                    onClick={() => togglePreview(track)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                      previewingId === track.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600'
                    }`}
                    title={previewingId === track.id ? 'Stop preview' : 'Preview'}
                  >
                    {previewingId === track.id ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                  </button>

                  {/* Select */}
                  <button
                    onClick={() => handleSelect(track)}
                    className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
                  >
                    Use
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
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

    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }

    if (item.music_url) {
      audioRef.current = new Audio(item.music_url)
      audioRef.current.loop = true
      audioRef.current.play().catch(() => {})
    }

    intervalRef.current = setInterval(() => {
      setProgress(p => p >= 100 ? 0 : p + (100 / (DURATION / 100)))
    }, 100)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    }
  }, [idx, item.id])

  useEffect(() => {
    if (progress >= 100) handleNext()
  }, [progress])

  useEffect(() => {
    if (!showViewers || !item.views?.length) return
    const unknownIds = item.views.filter((uid: string) => !viewerNames[uid])
    if (!unknownIds.length) return
    supabase.from('profiles').select('id, full_name, username').in('id', unknownIds).then(({ data }) => {
      if (!data) return
      setViewerNames(prev => {
        const next = { ...prev }
        data.forEach(p => { next[p.id] = p.full_name || p.username || p.id })
        return next
      })
    })
  }, [showViewers, item.id])

  const handleNext = useCallback(() => {
    if (idx < group.items.length - 1) {
      setIdx(i => i + 1)
    } else if (currentGroupIndex < allGroups.length - 1) {
      setAllGroups(prev => prev.map((g, i) => i === currentGroupIndex ? { ...g, lastViewedIndex: idx } : g))
      window.dispatchEvent(new CustomEvent('statusNextUser', { detail: { groupIndex: currentGroupIndex + 1 } }))
    } else {
      onAutoClose()
    }
  }, [idx, group.items.length, currentGroupIndex, allGroups, onAutoClose, setAllGroups])

  const handlePrev = useCallback(() => {
    if (idx > 0) {
      setIdx(i => i - 1)
    } else if (currentGroupIndex > 0) {
      setAllGroups(prev => prev.map((g, i) => i === currentGroupIndex ? { ...g, lastViewedIndex: idx } : g))
      window.dispatchEvent(new CustomEvent('statusPrevUser', { detail: { groupIndex: currentGroupIndex - 1, lastIndex: true } }))
    }
  }, [idx, currentGroupIndex, allGroups, setAllGroups])

  const deleteItem = async () => {
    await supabase.from('statuses').delete().eq('id', item.id)
    onDeleted(item.id)
    if (group.items.length === 1) onAutoClose()
    else if (idx >= group.items.length - 1) setIdx(i => i - 1)
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
      {/* Progress bars */}
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

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 z-10">
        <UserAvatar profile={group.profile} size={10} />
        <div className="flex-1">
          <p className="text-white text-sm font-semibold">
            {isOwn ? 'My Status' : (group.profile.full_name || group.profile.username)}
          </p>
          <p className="text-white/60 text-xs">{timeAgo(item.created_at)} · {expiresIn(item.expires_at)}</p>
        </div>

        {item.music_title && (
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded-full max-w-[140px]">
            <span className="text-white text-xs animate-pulse">🎵</span>
            <div className="min-w-0">
              <p className="text-white text-[10px] font-medium truncate">{item.music_title}</p>
              {(item as any).music_artist && (
                <p className="text-white/60 text-[9px] truncate">{(item as any).music_artist}</p>
              )}
            </div>
          </div>
        )}

        <div className="relative">
          <button onClick={() => setShowMenu(v => !v)} className="text-white/70 hover:text-white p-1 text-lg font-bold leading-none">⋮</button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-zinc-800 border border-zinc-700 rounded-2xl overflow-hidden shadow-xl min-w-[160px] z-20">
              {isOwn && (
                <button onClick={deleteItem} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-zinc-700 transition">
                  <Trash2 size={14} />Delete this status
                </button>
              )}
              {!isOwn && (
                <button onClick={() => { onHideUser(group.profile.id); onAutoClose() }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-yellow-400 hover:bg-zinc-700 transition">
                  <EyeOff size={14} />Hide {group.profile.full_name || group.profile.username}
                </button>
              )}
              <button onClick={() => setShowMenu(false)} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white/50 hover:bg-zinc-700 transition">
                <X size={14} />Cancel
              </button>
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white p-1"><X size={22} /></button>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex items-center justify-center p-8" style={{ backgroundColor: item.bg_color }}>
          <p className="text-center text-2xl font-bold leading-snug break-words max-w-full" style={{ color: TEXT_COLORS[item.bg_color] || '#ffffff' }}>
            {item.content}
          </p>
        </div>
        <button className="absolute left-0 top-0 w-1/3 h-full z-10" onClick={e => { e.stopPropagation(); handlePrev() }} />
        <button className="absolute right-0 top-0 w-1/3 h-full z-10" onClick={e => { e.stopPropagation(); handleNext() }} />
      </div>

      {/* Views footer (own only) */}
      {isOwn && (
        <div className="z-10">
          <button onClick={() => setShowViewers(v => !v)} className="w-full flex items-center gap-2 px-4 py-3 bg-black/40 backdrop-blur text-white">
            <Eye size={16} />
            <span className="text-sm">{item.views?.length ?? 0} views</span>
            <ChevronRight size={16} className={`ml-auto transition-transform ${showViewers ? 'rotate-90' : ''}`} />
          </button>
          {showViewers && item.views && item.views.length > 0 && (
            <div className="bg-black/60 backdrop-blur px-4 pb-4 max-h-40 overflow-y-auto">
              {item.views.map((uid: string) => (
                <div key={uid} className="flex items-center gap-2 py-2 border-b border-white/10">
                  <CheckCheck size={14} className="text-indigo-400" />
                  <span className="text-white/80 text-xs">{viewerNames[uid] ?? 'Loading…'}</span>
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
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [uploading, setUploading] = useState(false)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  // Stop any previewing when the compose modal unmounts
  useEffect(() => () => { previewAudioRef.current?.pause() }, [])

  const handleSelectTrack = (track: Track | null) => {
    previewAudioRef.current?.pause()
    setSelectedTrack(track)
  }

  const post = async () => {
    if (!text.trim()) return
    setUploading(true)
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    try {
      const { error: insertError } = await supabase.from('statuses').insert({
        user_id: userId,
        type: 'text',
        content: text.trim(),
        bg_color: bgColor,
        // Store the Deezer preview URL directly — no upload needed
        music_url: selectedTrack?.preview ?? null,
        music_title: selectedTrack?.title ?? null,
        music_artist: selectedTrack?.artist ?? null,
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
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">New Status</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
          </div>

          <div className="px-5 py-4">
            {/* Preview card */}
            <div
              className="w-full h-48 rounded-2xl flex flex-col items-center justify-center mb-4 transition-colors relative overflow-hidden"
              style={{ backgroundColor: bgColor }}
            >
              <p className="text-center text-xl font-bold px-4 break-words z-10" style={{ color: TEXT_COLORS[bgColor] || '#fff' }}>
                {text || 'Type something…'}
              </p>
              {selectedTrack && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 z-10">
                  <span className="text-white text-xs animate-pulse">🎵</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{selectedTrack.title}</p>
                    <p className="text-white/60 text-[10px] truncate">{selectedTrack.artist}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Text input */}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={200}
              placeholder="What's on your mind?"
              className="w-full rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-400 resize-none h-20 mb-4"
            />

            {/* Music selector */}
            <div className="mb-4">
              {selectedTrack ? (
                <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-4 py-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Music size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedTrack.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedTrack.artist}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setShowMusicPicker(true)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                    >
                      Change
                    </button>
                    <button
                      onClick={() => handleSelectTrack(null)}
                      className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center ml-1 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowMusicPicker(true)}
                  className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 px-4 py-3 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 flex items-center justify-center transition">
                    <Music size={16} className="text-gray-400 group-hover:text-indigo-500 transition" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">Add music</p>
                    <p className="text-xs text-gray-400">Choose from our music library</p>
                  </div>
                </button>
              )}
            </div>

            {/* Color picker */}
            <p className="text-xs text-gray-400 mb-2">Background color</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {BG_COLORS.map(c => (
                <button key={c} onClick={() => setBgColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${bgColor === c ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
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

      {showMusicPicker && (
        <MusicPicker
          onSelect={handleSelectTrack}
          onClose={() => setShowMusicPicker(false)}
        />
      )}
    </>
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
          {latest.music_title && ` · 🎵 ${latest.music_title}`}
        </p>
      </div>
      <ChevronRight size={16} className="text-gray-300 dark:text-zinc-600 flex-shrink-0" />
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
      if (otherGroups[groupIndex]) setViewingGroup({ ...otherGroups[groupIndex], lastViewedIndex: 0 })
      else { setViewingGroup(null); refreshStatuses() }
    }
    const handlePrevUser = (e: CustomEvent) => {
      const { groupIndex } = e.detail
      if (otherGroups[groupIndex]) {
        const g = otherGroups[groupIndex]
        setViewingGroup({ ...g, lastViewedIndex: g.items.length - 1 })
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
        .from('profiles').select('id, full_name, username, avatar_url').eq('id', user.id).single()
      if (profile) setMyProfile(profile)
      await loadStatuses(user.id)
    }
    init()
  }, [])

  const loadStatuses = async (userId: string) => {
    setLoading(true)
    const { data: iFollow } = await supabase.from('followers').select('following_id').eq('follower_id', userId)
    const followingIds = iFollow?.map(r => r.following_id) ?? []
    const allIds = [...new Set([...followingIds, userId])]

    const { data: statusData } = await supabase
      .from('statuses')
      .select(`id, user_id, content, type, bg_color, music_url, music_title, music_artist, created_at, expires_at, views,
        profile:profiles!statuses_user_id_fkey(id, full_name, username, avatar_url)`)
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

    setOtherGroups(Object.values(grouped).sort((a, b) => (a.seen ? 1 : 0) - (b.seen ? 1 : 0)))
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
    setOtherGroups(prev => prev.map(g => ({ ...g, items: g.items.filter(s => s.id !== deletedId) })).filter(g => g.items.length > 0))
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

          {/* My status row */}
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

          {/* Others */}
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
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Recent</p>
                  <div className="space-y-2 mb-5">
                    {otherGroups.filter(g => !g.seen).map(group => (
                      <StatusGroupRow key={group.profile.id} group={group} currentUserId={currentUserId!} onClick={() => setViewingGroup(group)} />
                    ))}
                  </div>
                </>
              )}
              {otherGroups.filter(g => g.seen).length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Viewed</p>
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