'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import {
  Plus, X, Eye, ChevronRight, Clock, CheckCheck, Trash2, EyeOff, Pause,
  Music, Search, Play, Square, Image as ImageIcon, Type, Loader2,
} from 'lucide-react'

type ITunesSong = {
  trackId: number
  name: string
  duration: number
  image?: { quality: string; url: string }[]
  previewUrl?: string
  artists?: { primary?: { id: string; name: string }[] }
  primaryGenreName?: string
  collectionName?: string
  trackViewUrl?: string
}

type StatusProfile = {
  id: string
  full_name?: string | null
  username?: string | null
  avatar_url?: string | null
}

type StatusItem = {
  id: string
  user_id: string
  content: string | null
  type: 'text' | 'image'
  bg_color: string
  image_url: string | null
  music_url: string | null
  music_title: string | null
  music_artist: string | null
  music_start_time: number | null
  created_at: string
  expires_at: string
  views: string[] | null
  profile: StatusProfile
}

type GroupedStatus = {
  profile: StatusProfile
  items: StatusItem[]
  seen: boolean
  lastViewedIndex: number
}

async function searchITunes(q: string): Promise<ITunesSong[]> {
  if (!q.trim()) return []
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=25`)
    const json = await res.json()
    const results = json?.results || []
    return Array.isArray(results)
      ? results.map((t: any) => ({
          trackId: Number(t.trackId ?? Date.now()),
          name: t.trackName ?? t.collectionName ?? 'Unknown',
          duration: Number(t.trackTimeMillis ?? 0),
          image: t.artworkUrl100
            ? [
                { quality: '100x100', url: t.artworkUrl100 },
                { quality: '200x200', url: t.artworkUrl100.replace('100x100bb', '200x200bb') },
                { quality: '500x500', url: t.artworkUrl100.replace('100x100bb', '500x500bb') },
              ]
            : [],
          previewUrl: t.previewUrl ?? '',
          artists: { primary: [{ id: String(t.artistId ?? ''), name: t.artistName ?? 'Unknown Artist' }] },
          primaryGenreName: t.primaryGenreName ?? '',
          collectionName: t.collectionName ?? '',
          trackViewUrl: t.trackViewUrl ?? '',
        }))
      : []
  } catch (err) {
    console.error(err)
    return []
  }
}

const QUICK_LANGS = [
  { label: '🇺🇸 English', query: 'pop hits 2024' },
  { label: '🇮🇳 Hindi', query: 'bollywood hindi songs' },
  { label: '🇮🇳 Assamese', query: 'assamese bihu song' },
  { label: '🇮🇳 Bengali', query: 'bengali songs' },
  { label: '🇮🇳 Punjabi', query: 'punjabi bhangra' },
  { label: '🇮🇳 Tamil', query: 'tamil kollywood' },
  { label: '🇮🇳 Telugu', query: 'telugu tollywood' },
  { label: '🇰🇷 K-Pop', query: 'kpop bts blackpink' },
  { label: '🎸 Lo-fi', query: 'lofi chill beats' },
]

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

function UserAvatar({
  profile,
  size = 12,
  ring = false,
  seen = true,
}: {
  profile: StatusProfile
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
  const label = (profile.full_name || profile.username || 'U')[0].toUpperCase()

  if (profile.avatar_url) {
    return <img src={profile.avatar_url} alt={profile.full_name || 'User'} className={`${sz} rounded-full object-cover flex-shrink-0 ${ringClass}`} />
  }

  return (
    <div className={`${sz} rounded-full ${color} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${ringClass}`}>
      {label}
    </div>
  )
}

function buildWaveform(seed: string, bars: number): number[] {
  const w: number[] = []
  for (let i = 0; i < bars; i++) {
    const c = seed.charCodeAt(i % seed.length) || 65
    const h = 15 + Math.abs(Math.sin(i * 0.4 + c * 0.1) * 55 + Math.cos(i * 0.7 + c * 0.05) * 25)
    w.push(Math.max(8, Math.min(80, h)))
  }
  return w
}

function fmtSec(s: number) {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

const CLIP_SEC = 30
const WFORM_BARS = 60

function TrimStep({
  track,
  onConfirm,
  onBack,
}: {
  track: ITunesSong
  onConfirm: (startTime: number) => void
  onBack: () => void
}) {
  const [audioDuration, setAudioDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [curTime, setCurTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const dragging = useRef(false)
  const dragX0 = useRef(0)
  const dragV0 = useRef(0)

  const total = Math.max(audioDuration, CLIP_SEC)
  const maxStart = Math.max(0, total - CLIP_SEC)
  const waveform = buildWaveform(track.name + (track.artists?.primary?.[0]?.name || ''), WFORM_BARS)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !playing) return
    audio.currentTime = startTime
    audio.play().catch(() => {})
  }, [startTime, playing])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const tick = () => {
      if (!audio) return
      setCurTime(audio.currentTime)
      if (audio.currentTime >= startTime + CLIP_SEC) audio.currentTime = startTime
      rafRef.current = requestAnimationFrame(tick)
    }

    if (playing) rafRef.current = requestAnimationFrame(tick)
    else if (rafRef.current) cancelAnimationFrame(rafRef.current)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, startTime])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const togglePlay = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      a.currentTime = startTime
      a.play().catch(() => {})
      setPlaying(true)
    }
  }

  const pxToSec = (px: number) => {
    if (!barRef.current) return 0
    return Math.max(0, Math.min(maxStart, (px / barRef.current.clientWidth) * total))
  }

  const onPtrDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    dragX0.current = e.clientX
    dragV0.current = startTime
  }

  const onPtrMove = (e: React.PointerEvent) => {
    if (!dragging.current || !barRef.current) return
    const dx = e.clientX - dragX0.current
    const delta = (dx / barRef.current.clientWidth) * total
    setStartTime(Math.max(0, Math.min(maxStart, dragV0.current + delta)))
  }

  const onPtrUp = () => {
    dragging.current = false
  }

  const onBarClick = (e: React.MouseEvent) => {
    if (!barRef.current) return
    const rect = barRef.current.getBoundingClientRect()
    setStartTime(pxToSec(e.clientX - rect.left))
  }

  const winLeft = (startTime / total) * 100
  const winW = (CLIP_SEC / total) * 100
  const playheadPct = playing ? Math.max(0, Math.min(100, ((curTime - startTime) / CLIP_SEC) * 100)) : null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 transition">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <img src={track.image?.[2]?.url || track.image?.[0]?.url || ''} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{track.name}</p>
          <p className="text-xs text-gray-400 truncate">{track.artists?.primary?.[0]?.name || 'Unknown Artist'}</p>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={track.previewUrl}
        preload="metadata"
        onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
      />

      <div className="flex-1 flex flex-col justify-center px-5 pb-6 gap-5">
        <p className="text-xs text-center text-gray-400 dark:text-zinc-500">
          Drag the highlighted window to pick which <span className="text-indigo-500 font-semibold">{CLIP_SEC}s</span> plays with your status
        </p>

        <div>
          <div
            ref={barRef}
            className="relative flex items-end gap-px h-20 cursor-pointer rounded-xl overflow-visible"
            onClick={onBarClick}
          >
            <div className="absolute inset-0 pointer-events-none z-10 rounded-xl overflow-hidden">
              <div className="absolute top-0 bottom-0 left-0 bg-white/70 dark:bg-zinc-900/70" style={{ width: `${winLeft}%` }} />
              <div className="absolute top-0 bottom-0 right-0 bg-white/70 dark:bg-zinc-900/70" style={{ left: `${winLeft + winW}%` }} />
            </div>

            {waveform.map((h, i) => {
              const pct = (i / WFORM_BARS) * 100
              const inWin = pct >= winLeft && pct < winLeft + winW
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${inWin ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-zinc-600'}`}
                  style={{ height: `${h}%` }}
                />
              )
            })}

            <div
              className="absolute top-0 bottom-0 z-20 border-2 border-indigo-500 rounded-xl cursor-grab active:cursor-grabbing touch-none"
              style={{ left: `${winLeft}%`, width: `${winW}%` }}
              onPointerDown={onPtrDown}
              onPointerMove={onPtrMove}
              onPointerUp={onPtrUp}
              onPointerCancel={onPtrUp}
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center">
                <div className="w-1 h-8 bg-indigo-400 rounded-full" />
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-5 flex items-center justify-center">
                <div className="w-1 h-8 bg-indigo-400 rounded-full" />
              </div>
              {playheadPct !== null && (
                <div
                  className="absolute top-1 bottom-1 w-0.5 bg-white rounded-full pointer-events-none"
                  style={{ left: `${playheadPct}%`, transform: 'translateX(-50%)' }}
                />
              )}
            </div>
          </div>

          <div className="flex justify-between mt-2 px-0.5">
            <span className="text-[10px] text-gray-400 tabular-nums">{fmtSec(Math.max(0, startTime))}</span>
            <span className="text-[10px] text-indigo-500 font-semibold">{CLIP_SEC}s clip selected</span>
            <span className="text-[10px] text-gray-400 tabular-nums">{fmtSec(Math.min(total, startTime + CLIP_SEC))}</span>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={togglePlay}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition ${
              playing
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600'
            }`}
          >
            {playing ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                Stop preview
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                Preview clip
              </>
            )}
          </button>
        </div>

        <button
          onClick={() => {
            audioRef.current?.pause()
            onConfirm(Math.round(startTime * 100) / 100)
          }}
          className="w-full py-3 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
        >
          Use this clip
        </button>
      </div>
    </div>
  )
}

function MusicPicker({
  onSelect,
  onClose,
}: {
  onSelect: (track: ITunesSong | null, startTime?: number) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [tracks, setTracks] = useState<ITunesSong[]>([])
  const [loading, setLoading] = useState(false)
  const [previewingId, setPreviewingId] = useState<number | null>(null)
  const [trimTrack, setTrimTrack] = useState<ITunesSong | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setDebouncedQ(query), 500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [query])

  useEffect(() => {
    if (!debouncedQ.trim()) {
      setTracks([])
      setLoading(false)
      return
    }
    setLoading(true)
    searchITunes(debouncedQ).then(r => {
      setTracks(r)
      setLoading(false)
    })
  }, [debouncedQ])

  useEffect(() => () => {
    audioRef.current?.pause()
  }, [])

  const togglePreview = (t: ITunesSong) => {
    if (previewingId === t.trackId) {
      audioRef.current?.pause()
      setPreviewingId(null)
      return
    }
    audioRef.current?.pause()
    audioRef.current = new Audio(t.previewUrl)
    audioRef.current.play().catch(() => {})
    audioRef.current.onended = () => setPreviewingId(null)
    setPreviewingId(t.trackId)
  }

  const goTrim = (t: ITunesSong) => {
    audioRef.current?.pause()
    setPreviewingId(null)
    setTrimTrack(t)
  }

  const quickSearch = (q: string) => {
    setQuery(q)
    setDebouncedQ(q)
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[88vh]">
        {trimTrack ? (
          <TrimStep
            track={trimTrack}
            onBack={() => setTrimTrack(null)}
            onConfirm={(st) => {
              onSelect(trimTrack, st)
              onClose()
            }}
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Music size={18} className="text-indigo-500" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add Music</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="px-4 pt-3 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 rounded-2xl px-3 py-2.5">
                <Search size={15} className="text-gray-400 flex-shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search any song, artist, language…"
                  className="bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none flex-1"
                  autoFocus
                />
                {query && (
                  <button onClick={() => { setQuery(''); setTracks([]) }}>
                    <X size={14} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 px-4 pb-3 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
              {QUICK_LANGS.map(l => (
                <button
                  key={l.label}
                  onClick={() => quickSearch(l.query)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    debouncedQ === l.query
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="px-4 pb-2 flex-shrink-0">
              <button
                onClick={() => { onSelect(null); onClose() }}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-gray-400 hover:border-indigo-300 hover:text-indigo-400 transition text-sm font-medium"
              >
                <X size={15} /> No music
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                  <Loader2 size={18} className="animate-spin" /><span className="text-sm">Searching…</span>
                </div>
              )}

              {!loading && !debouncedQ && (
                <div className="text-center py-8">
                  <Music size={32} className="text-indigo-200 dark:text-indigo-900 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Search any song in any language</p>
                  <p className="text-xs text-gray-300 dark:text-zinc-600 mt-1">Then trim to pick the perfect {CLIP_SEC} seconds</p>
                </div>
              )}

              {!loading && debouncedQ && tracks.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">No tracks found — try different words</div>
              )}

              {!loading && tracks.map(t => (
                <div key={t.trackId} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition">
                  <div className="relative flex-shrink-0">
                    <img src={t.image?.[2]?.url || t.image?.[0]?.url || ''} alt={t.name} className="w-12 h-12 rounded-xl object-cover" />
                    {previewingId === t.trackId && (
                      <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center gap-0.5">
                        {[1, 2, 3].map(i => (
                          <div
                            key={i}
                            className="w-0.5 bg-white rounded-full animate-bounce"
                            style={{ height: `${6 + i * 4}px`, animationDelay: `${i * 100}ms`, animationDuration: '0.6s' }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.name}</p>
                    <p className="text-xs text-gray-400 truncate">{t.artists?.primary?.[0]?.name ?? 'Unknown Artist'}</p>
                    <p className="text-[10px] text-gray-300 dark:text-zinc-600">{t.primaryGenreName || ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => togglePreview(t)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                        previewingId === t.trackId
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600'
                      }`}
                    >
                      {previewingId === t.trackId ? <Square size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
                    </button>
                    <button
                      onClick={() => goTrim(t)}
                      className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition whitespace-nowrap"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

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
  const pressTimer = useRef<NodeJS.Timeout | null>(null)
  const item = group.items[idx]
  const DURATION = 30000
  const isOwn = group.profile.id === currentUserId
  const currentGroupIndex = allGroups.findIndex(g => g.profile.id === group.profile.id)

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
      const audio = new Audio(item.music_url)
      const startAt = item.music_start_time ?? 0
      audio.currentTime = startAt
      audio.play().catch(() => {})
      const loopHandler = () => {
        if (audio.currentTime >= startAt + CLIP_SEC) audio.currentTime = startAt
      }
      audio.addEventListener('timeupdate', loopHandler)
      audioRef.current = audio
      ;(audioRef.current as any)._loopCleanup = () => audio.removeEventListener('timeupdate', loopHandler)
    }

    intervalRef.current = setInterval(() => {
      setProgress(p => (p >= 100 ? 0 : p + (100 / (DURATION / 100))))
    }, 100)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (audioRef.current) {
        ;(audioRef.current as any)._loopCleanup?.()
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [idx, item.id])

  useEffect(() => {
    if (progress >= 100) handleNext()
  }, [progress, handleNext])

  useEffect(() => {
    if (!showViewers || !item.views?.length) return
    const unknown = item.views.filter(uid => !viewerNames[uid])
    if (!unknown.length) return
    supabase.from('profiles').select('id, full_name, username').in('id', unknown).then(({ data }) => {
      if (!data) return
      setViewerNames(prev => {
        const n = { ...prev }
        data.forEach((p: any) => {
          n[p.id] = p.full_name || p.username || p.id
        })
        return n
      })
    })
  }, [showViewers, item.id])

  const handlePrev = useCallback(() => {
    if (idx > 0) {
      setIdx(i => i - 1)
    } else if (currentGroupIndex > 0) {
      setAllGroups(prev => prev.map((g, i) => i === currentGroupIndex ? { ...g, lastViewedIndex: idx } : g))
      window.dispatchEvent(new CustomEvent('statusPrevUser', { detail: { groupIndex: currentGroupIndex - 1 } }))
    }
  }, [idx, currentGroupIndex, allGroups, setAllGroups])

  const deleteItem = async () => {
    await supabase.from('statuses').delete().eq('id', item.id)
    onDeleted(item.id)
    if (group.items.length === 1) onAutoClose()
    else if (idx >= group.items.length - 1) setIdx(i => i - 1)
    setShowMenu(false)
  }

  const pressStart = () => {
    pressTimer.current = setTimeout(() => {
      setIsPaused(true)
      audioRef.current?.pause()
    }, 500)
  }

  const pressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    setIsPaused(false)
    if (audioRef.current && item.music_url) {
      audioRef.current.play().catch(() => {})
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onMouseDown={pressStart}
      onMouseUp={pressEnd}
      onMouseLeave={pressEnd}
      onTouchStart={pressStart}
      onTouchEnd={pressEnd}
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
          <p className="text-white text-sm font-semibold">{isOwn ? 'My Status' : (group.profile.full_name || group.profile.username || 'User')}</p>
          <p className="text-white/60 text-xs">{timeAgo(item.created_at)} · {expiresIn(item.expires_at)}</p>
        </div>

        {item.music_title && (
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded-full max-w-[140px]">
            <span className="text-white text-xs animate-pulse">🎵</span>
            <div className="min-w-0">
              <p className="text-white text-[10px] font-medium truncate">{item.music_title}</p>
              {item.music_artist && <p className="text-white/60 text-[9px] truncate">{item.music_artist}</p>}
            </div>
          </div>
        )}

        <div className="relative">
          <button onClick={() => setShowMenu(v => !v)} className="text-white/70 hover:text-white p-1 text-lg font-bold">⋮</button>
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

        <button onClick={onClose} className="text-white/70 hover:text-white p-1">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 relative">
        {item.type === 'image' && item.image_url ? (
          <img src={item.image_url} alt="status" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-8" style={{ backgroundColor: item.bg_color }}>
            <p className="text-center text-2xl font-bold leading-snug break-words max-w-full" style={{ color: TEXT_COLORS[item.bg_color] || '#fff' }}>
              {item.content}
            </p>
          </div>
        )}

        {item.type === 'image' && item.content && (
          <div className="absolute bottom-6 left-4 right-4 z-10">
            <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-4 py-2.5">
              <p className="text-white text-sm font-medium text-center">{item.content}</p>
            </div>
          </div>
        )}

        <button className="absolute left-0 top-0 w-1/3 h-full z-10" onClick={e => { e.stopPropagation(); handlePrev() }} />
        <button className="absolute right-0 top-0 w-1/3 h-full z-10" onClick={e => { e.stopPropagation(); handleNext() }} />
      </div>

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

function ComposeModal({
  onClose,
  onPosted,
  userId,
}: {
  onClose: () => void
  onPosted: () => void
  userId: string
}) {
  const supabase = createClient()
  const [tab, setTab] = useState<'text' | 'image'>('text')
  const [text, setText] = useState('')
  const [bgColor, setBgColor] = useState(BG_COLORS[0])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [selectedTrack, setSelectedTrack] = useState<ITunesSong | null>(null)
  const [selectedStartTime, setSelectedStartTime] = useState<number>(0)
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const post = async () => {
    if (tab === 'text' && !text.trim()) return
    if (tab === 'image' && !imageFile) return
    setUploading(true)
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    try {
      let image_url: string | null = null

      if (tab === 'image' && imageFile) {
        const ext = imageFile.name.split('.').pop() || 'jpg'
        const path = `status-images/${userId}_${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('statuses').upload(path, imageFile, { upsert: false })
        if (upErr) {
          alert('Image upload failed: ' + upErr.message)
          setUploading(false)
          return
        }
        const { data: urlData } = supabase.storage.from('statuses').getPublicUrl(path)
        image_url = urlData.publicUrl
      }

      const { error: insertError } = await supabase.from('statuses').insert({
        user_id: userId,
        type: tab,
        content: tab === 'text' ? text.trim() : (caption.trim() || null),
        bg_color: tab === 'text' ? bgColor : '#000000',
        image_url,
        music_url: selectedTrack?.previewUrl ?? null,
        music_title: selectedTrack?.name ?? null,
        music_artist: selectedTrack?.artists?.primary?.[0]?.name ?? null,
        music_start_time: selectedTrack ? selectedStartTime : null,
        expires_at: expires,
        views: [],
      })

      if (insertError) {
        alert('Failed to post: ' + insertError.message)
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

  const canPost = uploading ? false : tab === 'text' ? !!text.trim() : !!imageFile

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[93vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10 flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">New Status</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={20} />
            </button>
          </div>

          <div className="flex gap-2 px-5 pt-4 pb-2 flex-shrink-0">
            <button
              onClick={() => setTab('text')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition flex-1 justify-center ${tab === 'text' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300'}`}
            >
              <Type size={14} /> Text
            </button>
            <button
              onClick={() => setTab('image')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition flex-1 justify-center ${tab === 'image' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300'}`}
            >
              <ImageIcon size={14} /> Photo
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-3 space-y-4">
            {tab === 'text' && (
              <>
                <div className="w-full h-44 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden transition-colors" style={{ backgroundColor: bgColor }}>
                  <p className="text-center text-xl font-bold px-4 break-words z-10" style={{ color: TEXT_COLORS[bgColor] || '#fff' }}>
                    {text || 'Type something…'}
                  </p>
                  {selectedTrack && (
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <span className="text-white text-xs">🎵</span>
                      <p className="text-white text-xs truncate flex-1">{selectedTrack.name} · {selectedTrack.artists?.primary?.[0]?.name || 'Unknown Artist'}</p>
                    </div>
                  )}
                </div>

                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  maxLength={200}
                  placeholder="What's on your mind?"
                  className="w-full rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-400 resize-none h-20"
                />

                <div>
                  <p className="text-xs text-gray-400 mb-2">Background color</p>
                  <div className="flex flex-wrap gap-2">
                    {BG_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setBgColor(c)}
                        className={`w-7 h-7 rounded-full transition-transform ${bgColor === c ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === 'image' && (
              <>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                {imagePreview ? (
                  <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '9/16', maxHeight: 320 }}>
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    <button onClick={() => { setImageFile(null); setImagePreview(null) }} className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white">
                      <X size={14} />
                    </button>
                    {selectedTrack && (
                      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                        <span className="text-white text-xs">🎵</span>
                        <p className="text-white text-xs truncate flex-1">{selectedTrack.name} · {selectedTrack.artists?.primary?.[0]?.name || 'Unknown Artist'}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 py-14 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition group"
                  >
                    <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 flex items-center justify-center transition">
                      <ImageIcon size={24} className="text-gray-400 group-hover:text-indigo-500 transition" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">Tap to choose a photo</p>
                      <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP</p>
                    </div>
                  </button>
                )}

                <input
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  maxLength={150}
                  placeholder="Add a caption… (optional)"
                  className="w-full rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-400"
                />
              </>
            )}

            <div>
              {selectedTrack ? (
                <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-4 py-3">
                  <img src={selectedTrack.image?.[2]?.url || selectedTrack.image?.[0]?.url || ''} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedTrack.name}</p>
                    <p className="text-xs text-gray-400 truncate">{selectedTrack.artists?.primary?.[0]?.name || 'Unknown Artist'}</p>
                    <p className="text-[10px] text-indigo-400 mt-0.5">
                      Clip: {fmtSec(selectedStartTime)} – {fmtSec(selectedStartTime + CLIP_SEC)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setShowMusicPicker(true)} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      Change
                    </button>
                    <button onClick={() => { setSelectedTrack(null); setSelectedStartTime(0) }} className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center ml-1 hover:bg-red-100 hover:text-red-500 transition">
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
                    <p className="text-xs text-gray-400">Search songs</p>
                  </div>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock size={12} /><span>Expires in 24 hours</span>
            </div>

            <button
              onClick={post}
              disabled={!canPost}
              className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {uploading ? 'Posting…' : 'Post Status'}
            </button>
          </div>
        </div>
      </div>

      {showMusicPicker && (
        <MusicPicker
          onSelect={(t, st) => {
            setSelectedTrack(t)
            setSelectedStartTime(st ?? 0)
          }}
          onClose={() => setShowMusicPicker(false)}
        />
      )}
    </>
  )
}

function StatusGroupRow({
  group,
  onClick,
}: {
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
      <div className="relative flex-shrink-0">
        <UserAvatar profile={group.profile} size={14} ring seen={group.seen} />
        {latest.type === 'image' && latest.image_url && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
            <ImageIcon size={10} className="text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{group.profile.full_name || group.profile.username || 'User'}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {group.items.length} update{group.items.length > 1 ? 's' : ''} · {timeAgo(latest.created_at)}
          {latest.music_title && ` · 🎵 ${latest.music_title}`}
        </p>
      </div>
      <ChevronRight size={16} className="text-gray-300 dark:text-zinc-600 flex-shrink-0" />
    </button>
  )
}

export default function StatusPage() {
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<StatusProfile | null>(null)
  const [myStatuses, setMyStatuses] = useState<StatusItem[]>([])
  const [otherGroups, setOtherGroups] = useState<GroupedStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [viewingGroup, setViewingGroup] = useState<GroupedStatus | null>(null)
  const [hiddenUsers, setHiddenUsers] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      return new Set(JSON.parse(localStorage.getItem('status_hidden_users') || '[]'))
    } catch {
      return new Set()
    }
  })

  const loadStatuses = async (userId: string) => {
    setLoading(true)
    const { data: iFollow } = await supabase.from('followers').select('following_id').eq('follower_id', userId)
    const followingIds = iFollow?.map((r: any) => r.following_id) ?? []
    const allIds = [...new Set([...followingIds, userId])]

    const { data: statusData } = await supabase
      .from('statuses')
      .select(`
        id, user_id, content, type, bg_color, image_url, music_url, music_title, music_artist,
        music_start_time, created_at, expires_at, views,
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

    setOtherGroups(Object.values(grouped).sort((a, b) => (a.seen ? 1 : 0) - (b.seen ? 1 : 0)))
    setLoading(false)
  }

  const refreshStatuses = useCallback(() => {
    if (currentUserId) loadStatuses(currentUserId)
  }, [currentUserId])

  const handleCloseViewer = useCallback(() => {
    setViewingGroup(null)
    refreshStatuses()
  }, [refreshStatuses])

  useEffect(() => {
    const next = (e: CustomEvent) => {
      const g = otherGroups[e.detail.groupIndex]
      if (g) setViewingGroup({ ...g, lastViewedIndex: 0 })
      else {
        setViewingGroup(null)
        refreshStatuses()
      }
    }
    const prev = (e: CustomEvent) => {
      const g = otherGroups[e.detail.groupIndex]
      if (g) setViewingGroup({ ...g, lastViewedIndex: g.items.length - 1 })
    }
    window.addEventListener('statusNextUser' as any, next as any)
    window.addEventListener('statusPrevUser' as any, prev as any)
    return () => {
      window.removeEventListener('statusNextUser' as any, next as any)
      window.removeEventListener('statusPrevUser' as any, prev as any)
    }
  }, [otherGroups, refreshStatuses])

  const hideUser = (uid: string) => {
    setHiddenUsers(prev => {
      const n = new Set(prev).add(uid)
      localStorage.setItem('status_hidden_users', JSON.stringify([...n]))
      return n
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

  const markViewed = async (statusId: string) => {
    if (!currentUserId) return
    const { data } = await supabase.from('statuses').select('views').eq('id', statusId).single()
    if (!data) return
    const views: string[] = data.views || []
    if (views.includes(currentUserId)) return
    await supabase.from('statuses').update({ views: [...views, currentUserId] }).eq('id', statusId)
  }

  const handleDeleted = (id: string) => {
    setMyStatuses(prev => prev.filter(s => s.id !== id))
    setOtherGroups(prev => prev.map(g => ({ ...g, items: g.items.filter(s => s.id !== id) })).filter(g => g.items.length > 0))
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
                  <Eye size={14} /><span className="text-xs">{myStatuses[0].views?.length ?? 0}</span>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-4 animate-pulse flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-zinc-800" />
                    <div className="h-2 w-3/4 rounded bg-gray-200 dark:bg-zinc-800" />
                  </div>
                </div>
              ))}
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
                    {otherGroups.filter(g => !g.seen).map(g => (
                      <StatusGroupRow key={g.profile.id} group={g} currentUserId={currentUserId!} onClick={() => setViewingGroup(g)} />
                    ))}
                  </div>
                </>
              )}

              {otherGroups.filter(g => g.seen).length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Viewed</p>
                  <div className="space-y-2">
                    {otherGroups.filter(g => g.seen).map(g => (
                      <StatusGroupRow key={g.profile.id} group={g} currentUserId={currentUserId!} onClick={() => setViewingGroup(g)} />
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