'use client'

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
  useMemo,
  Suspense,
} from 'react'
import {
  Search,
  MoreVertical,
  Send,
  Trash2,
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  Play,
  Pause,
  Lock,
  UserPlus,
  Mic,
  MicOff,
  Image as ImageIcon,
  Paperclip,
  X,
  Pin,
  EyeOff,
  BellOff,
  Reply,
  Edit2,
  Copy,
  Smile,
  ChevronDown,
  Phone,
  Video,
  Download,
  Eye,
  Bell,
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type MessageType = 'text' | 'image' | 'file' | 'voice'

type Reaction = {
  emoji: string
  user_ids: string[]
}

type Message = {
  id: string
  content?: string
  created_at: string
  sender_id: string
  receiver_id: string
  type: MessageType
  file_url?: string
  file_name?: string
  file_size?: string
  duration?: number
  read: boolean
  delivered: boolean
  reply_to_id?: string
  reply_to_content?: string
  reply_to_sender?: string
  edited?: boolean
  deleted?: boolean
  reactions?: Reaction[]
}

type Contact = {
  id: string
  name: string
  username: string | null
  avatar_url: string | null
  online: boolean
  isMutual: boolean
  nickname?: string
  pinned?: boolean
  muted?: boolean
  unreadCount?: number
  lastMessage?: Message
}

type HiddenChatMeta = {
  contactId: string
  passwordHash: string
}

const EMOJI_LIST = ['❤️','😂','😮','😢','😡','👍','👎','🔥','🎉','👀']

function hashPassword(pw: string): string {
  let hash = 0
  for (let i = 0; i < pw.length; i++) {
    const char = pw.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString(36)
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const TypingIndicator = () => (
  <div className="flex justify-start mb-2">
    <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1 shadow-sm">
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.9s' }} />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '160ms', animationDuration: '0.9s' }} />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '320ms', animationDuration: '0.9s' }} />
    </div>
  </div>
)

const VoiceNote = memo(({ url, fromMe, duration }: { url: string; fromMe: boolean; duration: number }) => {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) audioRef.current.pause()
    else audioRef.current.play()
    setPlaying(!playing)
  }

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => {
          if (!audioRef.current) return
          setCurrentTime(audioRef.current.currentTime)
          setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100)
        }}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0) }}
      />
      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${fromMe ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-zinc-600 text-indigo-600 dark:text-gray-200'}`}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1">
        <div className="h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${fromMe ? 'bg-white/60' : 'bg-indigo-400'}`} style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[10px] opacity-60 mt-0.5">{formatDuration(playing ? currentTime : duration)}</p>
      </div>
    </div>
  )
})
VoiceNote.displayName = 'VoiceNote'

const LightboxViewer = ({ url, onClose }: { url: string; onClose: () => void }) => (
  <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={onClose}>
    <button className="absolute top-4 right-4 text-white/70 hover:text-white z-10"><X size={28} /></button>
    <a
      href={url}
      download
      className="absolute top-4 left-4 text-white/70 hover:text-white z-10"
      onClick={e => e.stopPropagation()}
    >
      <Download size={24} />
    </a>
    <img src={url} alt="full" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
  </div>
)

const MessageBubble = memo(({
  msg,
  currentUserId,
  contactName,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onLightbox,
}: {
  msg: Message
  currentUserId: string
  contactName: string
  onReply: (msg: Message) => void
  onEdit: (msg: Message) => void
  onDelete: (msg: Message) => void
  onReact: (msgId: string, emoji: string) => void
  onLightbox: (url: string) => void
}) => {
  const fromMe = msg.sender_id === currentUserId
  const [showMenu, setShowMenu] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const touchStartX = useRef(0)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
        setShowReactions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true)
    }, 500)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current
    if (longPressTimer.current && Math.abs(dx) > 10) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (dx > 0 && dx < 80) setSwipeX(dx)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    if (swipeX > 50) onReply(msg)
    setSwipeX(0)
  }

  if (msg.deleted) {
    return (
      <div className={`flex ${fromMe ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className="text-xs text-gray-400 italic px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-2xl">
          {fromMe ? 'You deleted this message' : 'This message was deleted'}
        </div>
      </div>
    )
  }

  const myReaction = msg.reactions?.find(r => r.user_ids.includes(currentUserId))

  return (
    <div
      className={`flex ${fromMe ? 'justify-end' : 'justify-start'} mb-2 relative group`}
      style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform 0.2s' : 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {swipeX > 20 && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 text-indigo-400 opacity-80">
          <Reply size={18} />
        </div>
      )}

      <div className="relative max-w-[75%]" ref={menuRef}>
        {msg.reply_to_id && (
          <div className={`text-xs px-2 py-1 rounded-t-xl mb-0.5 border-l-2 ${fromMe ? 'bg-indigo-500 border-white/50 text-white/80' : 'bg-gray-100 dark:bg-zinc-700 border-indigo-400 text-gray-500 dark:text-gray-400'}`}>
            <span className="font-medium">{msg.reply_to_sender === currentUserId ? 'You' : contactName}</span>
            <p className="truncate">{msg.reply_to_content}</p>
          </div>
        )}

        <div
          className={`rounded-2xl px-3 py-2 shadow-sm ${fromMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-zinc-700'}`}
          onContextMenu={e => { e.preventDefault(); setShowMenu(true) }}
          onDoubleClick={() => setShowMenu(true)}
        >
          {msg.type === 'image' && msg.file_url && (
            <img
              src={msg.file_url}
              alt="img"
              className="rounded-xl mb-1 max-h-72 object-cover cursor-pointer"
              onClick={() => onLightbox(msg.file_url!)}
            />
          )}
          {msg.type === 'file' && msg.file_url && (
            <a href={msg.file_url} target="_blank" rel="noreferrer"
              className={`flex items-center gap-3 rounded-xl p-3 ${fromMe ? 'bg-white/10' : 'bg-gray-100 dark:bg-zinc-700'}`}>
              <FileText size={20} className={fromMe ? 'text-white' : 'text-indigo-500'} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{msg.file_name}</p>
                <p className={`text-[10px] ${fromMe ? 'text-indigo-200' : 'text-gray-400'}`}>{msg.file_size}</p>
              </div>
              <Download size={14} className="flex-shrink-0 opacity-60" />
            </a>
          )}
          {msg.type === 'voice' && msg.file_url && (
            <VoiceNote url={msg.file_url} fromMe={fromMe} duration={msg.duration || 0} />
          )}
          {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
          <div className={`flex items-center gap-1 mt-0.5 ${fromMe ? 'justify-end' : 'justify-start'}`}>
            {msg.edited && <span className="text-[9px] opacity-50">edited</span>}
            <span className="text-[10px] opacity-70">{formatTime(msg.created_at)}</span>
            {fromMe && (
              msg.read ? <CheckCheck size={12} className="text-indigo-200" /> :
              msg.delivered ? <CheckCheck size={12} className="opacity-50" /> :
              <Check size={12} className="opacity-50" />
            )}
          </div>
        </div>

        {msg.reactions && msg.reactions.filter(r => r.user_ids.length > 0).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${fromMe ? 'justify-end' : 'justify-start'}`}>
            {msg.reactions.filter(r => r.user_ids.length > 0).map(r => (
              <button
                key={r.emoji}
                onClick={() => onReact(msg.id, r.emoji)}
                className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${r.user_ids.includes(currentUserId) ? 'bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-300 dark:border-indigo-700' : 'bg-gray-100 dark:bg-zinc-700'}`}
              >
                {r.emoji} <span className="text-[10px] font-medium">{r.user_ids.length}</span>
              </button>
            ))}
          </div>
        )}

        {showMenu && (
          <div className={`absolute z-50 ${fromMe ? 'right-0' : 'left-0'} bottom-full mb-1 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl shadow-xl overflow-hidden min-w-[160px]`}>
            <div className="flex gap-1 px-2 py-2 border-b border-gray-100 dark:border-zinc-700">
              {EMOJI_LIST.slice(0, 6).map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { onReact(msg.id, emoji); setShowMenu(false) }}
                  className={`text-lg hover:scale-125 transition-transform ${myReaction?.emoji === emoji ? 'opacity-100 scale-110' : 'opacity-80'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {[
              { icon: Reply, label: 'Reply', action: () => { onReply(msg); setShowMenu(false) } },
              ...(fromMe ? [{ icon: Edit2, label: 'Edit', action: () => { onEdit(msg); setShowMenu(false) } }] : []),
              { icon: Copy, label: 'Copy', action: () => { navigator.clipboard.writeText(msg.content || ''); setShowMenu(false) } },
              ...(fromMe ? [{ icon: Trash2, label: 'Delete', action: () => { onDelete(msg); setShowMenu(false) }, red: true }] : []),
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors ${(item as any).red ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
MessageBubble.displayName = 'MessageBubble'

const Avatar = ({ contact, size = 10, showOnline = false }: { contact: Contact; size?: number; showOnline?: boolean }) => {
  const sz = `w-${size} h-${size}`
  const colors = ['bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500']
  const color = colors[contact.id.charCodeAt(0) % colors.length]
  return (
    <div className="relative flex-shrink-0">
      {contact.avatar_url ? (
        <img src={contact.avatar_url} alt={contact.name} className={`${sz} rounded-full object-cover`} />
      ) : (
        <div className={`${sz} rounded-full ${color} flex items-center justify-center text-white text-sm font-medium`}>
          {(contact.nickname || contact.name)[0].toUpperCase()}
        </div>
      )}
      {showOnline && contact.online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white dark:ring-zinc-900" />
      )}
    </div>
  )
}

const ContactRow = memo(({ contact, active, onClick, onLongPress }: {
  contact: Contact
  active: boolean
  onClick: () => void
  onLongPress: () => void
}) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(onLongPress, 600)
  }
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  const msg = contact.lastMessage
  const preview = msg
    ? msg.type === 'image' ? '📷 Photo'
      : msg.type === 'voice' ? '🎤 Voice note'
      : msg.type === 'file' ? `📄 ${msg.file_name || 'File'}`
      : msg.content || ''
    : ''

  return (
    <button
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={e => { e.preventDefault(); onLongPress() }}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-gray-100 dark:border-zinc-800 ${active ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'}`}
    >
      <div className="relative flex-shrink-0">
        <Avatar contact={contact} size={11} showOnline />
        {!contact.isMutual && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
            <Lock size={8} className="text-white" />
          </span>
        )}
        {contact.pinned && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-400 rounded-full flex items-center justify-center">
            <Pin size={7} className="text-white" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {contact.nickname || contact.name}
            {contact.muted && <BellOff size={11} className="inline ml-1 opacity-40" />}
          </span>
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {msg ? formatTime(msg.created_at) : ''}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5 gap-2">
          {contact.isMutual ? (
            <span className="text-xs text-gray-400 truncate">{preview}</span>
          ) : (
            <span className="text-xs text-amber-500">Follow each other to chat</span>
          )}
          {(contact.unreadCount ?? 0) > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {contact.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
})
ContactRow.displayName = 'ContactRow'

const LockedChat = ({ contact }: { contact: Contact }) => (
  <div className="flex flex-col flex-1 items-center justify-center text-center px-8 bg-[#efeae2] dark:bg-zinc-900">
    <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
      <Lock size={28} className="text-amber-500" />
    </div>
    <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Messaging locked</h2>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
      You and {contact.nickname || contact.name} need to follow each other to chat.
    </p>
    <Link
      href={`/profile/${contact.id}`}
      className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
    >
      <UserPlus size={16} /> View Profile
    </Link>
  </div>
)

function ChatWindowInner() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showList, setShowList] = useState(true)

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingMsg, setEditingMsg] = useState<Message | null>(null)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')

  const [contactMenuTarget, setContactMenuTarget] = useState<Contact | null>(null)
  const [showContactMenu, setShowContactMenu] = useState(false)

  const [showHiddenView, setShowHiddenView] = useState(false)
  const [hiddenContacts, setHiddenContacts] = useState<string[]>([])
  const [pinnedContacts, setPinnedContacts] = useState<string[]>([])
  const [mutedContacts, setMutedContacts] = useState<string[]>([])
  const [hiddenPasswordHash, setHiddenPasswordHash] = useState<string | null>(null)
  const [showHiddenSetup, setShowHiddenSetup] = useState(false)
  const [hiddenPwInput, setHiddenPwInput] = useState('')
  const [hiddenPwConfirm, setHiddenPwConfirm] = useState('')
  const [hiddenPwError, setHiddenPwError] = useState('')

  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const recordingSecondsRef = useRef(0)  // always-fresh mirror of recordingSeconds
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunks = useRef<Blob[]>([])
  const recordingTimer = useRef<NodeJS.Timeout | null>(null)
  const activeContactRef = useRef<Contact | null>(null)
  const currentUserIdRef = useRef<string | null>(null)

  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [previewFiles, setPreviewFiles] = useState<{ file: File; url: string; type: 'image' | 'file' }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [searchMessages, setSearchMessages] = useState<Message[]>([])
  const [showMsgSearch, setShowMsgSearch] = useState(false)
  const [msgSearchQuery, setMsgSearchQuery] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const headerMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('chat_hidden_users')
    if (stored) setHiddenContacts(JSON.parse(stored))
    const storedPins = localStorage.getItem('chat_pinned_users')
    if (storedPins) setPinnedContacts(JSON.parse(storedPins))
    const storedMutes = localStorage.getItem('chat_muted_users')
    if (storedMutes) setMutedContacts(JSON.parse(storedMutes))
    const storedPw = localStorage.getItem('chat_hidden_pw')
    if (storedPw) setHiddenPasswordHash(storedPw)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setShowHeaderMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openChat = (contact: Contact) => {
    activeContactRef.current = contact
    setActiveContact(contact)
    setShowList(false)
    setReplyTo(null)
    setEditingMsg(null)
    setInput('')
    const params = new URLSearchParams(searchParams.toString())
    params.set('chat', '1')
    router.replace(`/messages?${params.toString()}`, { scroll: false })
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const closeChat = () => {
    setShowList(true)
    setActiveContact(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('chat')
    const qs = params.toString()
    router.replace(`/messages${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)
      currentUserIdRef.current = user.id
      const loadedContacts = await loadContacts(user.id)
      await setupPresence(user.id)
      requestNotificationPermission()

      // Handle ?openContact=<id> deep-link from profile page
      const openContactId = searchParams.get('openContact')
      if (openContactId) {
        // Remove the param from URL immediately so back-navigation is clean
        const params = new URLSearchParams(searchParams.toString())
        params.delete('openContact')
        const qs = params.toString()
        router.replace(`/messages${qs ? `?${qs}` : ''}`, { scroll: false })

        // Find the contact in the already-loaded list, or fetch their profile
        let contact = loadedContacts?.find((c: Contact) => c.id === openContactId) ?? null
        if (!contact) {
          const { data: p } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .eq('id', openContactId)
            .maybeSingle()
          if (p) {
            contact = {
              id: p.id,
              name: p.full_name || p.username || 'User',
              username: p.username,
              avatar_url: p.avatar_url,
              online: false,
              isMutual: true,
            }
          }
        }
        if (contact) {
          activeContactRef.current = contact
          setActiveContact(contact)
          setShowList(false)
          const p2 = new URLSearchParams()
          p2.set('chat', '1')
          router.replace(`/messages?${p2.toString()}`, { scroll: false })
        }
      }
    }
    init()
  }, [])

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  const sendBrowserNotification = (title: string, body: string, contactId: string) => {
    if (Notification.permission === 'granted') {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: contactId,
      })
      n.onclick = () => {
        window.focus()
        router.push(`/messages?openContact=${contactId}`)
        n.close()
      }
    }
  }

  const setupPresence = async (userId: string) => {
    // Await removal so Supabase fully deregisters before we reuse the channel name.
    if (presenceChannelRef.current) {
      await supabase.removeChannel(presenceChannelRef.current)
      presenceChannelRef.current = null
    }

    // All .on() listeners MUST be registered before .subscribe() is called.
    const ch = supabase.channel('presence:online_users')

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ user_id: string }>()
      const onlineIds = new Set(
        Object.values(state).flat().map((p: any) => p.user_id)
      )
      setContacts(prev => prev.map(c => ({ ...c, online: onlineIds.has(c.id) })))
    })

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ user_id: userId })
      }
    })

    presenceChannelRef.current = ch
  }

  const loadContacts = async (userId: string) => {
    const { data: iFollow } = await supabase.from('followers').select('following_id').eq('follower_id', userId)
    const { data: followsMe } = await supabase.from('followers').select('follower_id').eq('following_id', userId)

    const iFollowIds = iFollow?.map(r => r.following_id) ?? []
    const followsMeIds = followsMe?.map(r => r.follower_id) ?? []
    const allIds = [...new Set([...iFollowIds, ...followsMeIds])]
    if (allIds.length === 0) return

    const { data: profiles } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', allIds)

    const storedNicknames: Record<string, string> = JSON.parse(localStorage.getItem('chat_nicknames') || '{}')
    const storedPins: string[] = JSON.parse(localStorage.getItem('chat_pinned_users') || '[]')
    const storedMutes: string[] = JSON.parse(localStorage.getItem('chat_muted_users') || '[]')

    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('*')
      .or(allIds.map(id => `and(sender_id.eq.${userId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${userId})`).join(','))
      .order('created_at', { ascending: false })

    const { data: unreadData } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', userId)
      .eq('read', false)

    const unreadCounts: Record<string, number> = {}
    unreadData?.forEach(m => { unreadCounts[m.sender_id] = (unreadCounts[m.sender_id] || 0) + 1 })

    const lastMsgMap: Record<string, Message> = {}
    lastMsgs?.forEach(m => {
      const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id
      if (!lastMsgMap[otherId]) lastMsgMap[otherId] = m
    })

    const contactList: Contact[] = (profiles ?? []).map(p => ({
      id: p.id,
      name: p.full_name || p.username || 'User',
      username: p.username,
      avatar_url: p.avatar_url,
      online: false,
      isMutual: iFollowIds.includes(p.id) && followsMeIds.includes(p.id),
      nickname: storedNicknames[p.id],
      pinned: storedPins.includes(p.id),
      muted: storedMutes.includes(p.id),
      unreadCount: unreadCounts[p.id] || 0,
      lastMessage: lastMsgMap[p.id],
    }))

    contactList.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0
      return bTime - aTime
    })

    setContacts(contactList)
    return contactList
  }

  useEffect(() => {
    if (!activeContact || !currentUserId) return
    setLoadingMessages(true)
    setMessages([])

    const fetchMsgs = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeContact.id}),and(sender_id.eq.${activeContact.id},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })

      setMessages((data || []) as Message[])
      setLoadingMessages(false)

      await supabase.from('messages').update({ read: true, delivered: true })
        .eq('sender_id', activeContact.id)
        .eq('receiver_id', currentUserId)
        .eq('read', false)

      setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, unreadCount: 0 } : c))
    }

    fetchMsgs()

    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel(`msgs-${currentUserId}-${activeContact.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${currentUserId}`,
      }, (payload) => {
        const msg = payload.new as Message
        if (msg.sender_id === activeContact.id) {
          setMessages(prev => [...prev, msg])
          setIsTyping(false)
          supabase.from('messages').update({ read: true, delivered: true }).eq('id', msg.id)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `sender_id=eq.${currentUserId}`,
      }, (payload) => {
        const updated = payload.new as Message
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'messages',
      }, (payload) => {
        const deleted = payload.old as Message
        setMessages(prev => prev.map(m => m.id === deleted.id ? { ...m, deleted: true, content: undefined } : m))
      })
      .subscribe()

    channelRef.current = channel

    if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current)
    const typingChannel = supabase
      .channel(`typing-${[currentUserId, activeContact.id].sort().join('-')}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user_id !== currentUserId) {
          setIsTyping(true)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000)
        }
      })
      .subscribe()

    typingChannelRef.current = typingChannel

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current)
    }
  }, [activeContact?.id, currentUserId])

  useEffect(() => {
    if (!currentUserId) return
    const globalChannel = supabase
      .channel(`global-inbox-${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${currentUserId}`,
      }, (payload) => {
        const msg = payload.new as Message
        if (msg.sender_id === activeContact?.id) return
        const sender = contacts.find(c => c.id === msg.sender_id)
        if (!sender) return

        if (!mutedContacts.includes(msg.sender_id)) {
          sendBrowserNotification(
            sender.nickname || sender.name,
            msg.type === 'text' ? (msg.content || '') : `Sent a ${msg.type}`,
            msg.sender_id
          )
        }

        setContacts(prev => {
          const updated = prev.map(c => {
            if (c.id !== msg.sender_id) return c
            return {
              ...c,
              unreadCount: (c.unreadCount || 0) + 1,
              lastMessage: msg,
            }
          })
          return updated.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1
            if (!a.pinned && b.pinned) return 1
            const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0
            const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0
            return bTime - aTime
          })
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(globalChannel) }
  }, [currentUserId, activeContact?.id, contacts, mutedContacts])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isTyping])

  const emitTyping = () => {
    if (!typingChannelRef.current || !currentUserId) return
    typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: currentUserId } })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    emitTyping()
  }

  const sendMessage = useCallback(async (
    type: MessageType = 'text',
    extra?: { file_url?: string; file_name?: string; file_size?: string; duration?: number }
  ) => {
    if (!currentUserId || !activeContact) return
    if (type === 'text' && !input.trim() && !editingMsg) return
    if (!activeContact.isMutual) return

    if (editingMsg) {
      await supabase.from('messages').update({ content: input.trim(), edited: true }).eq('id', editingMsg.id)
      setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: input.trim(), edited: true } : m))
      setEditingMsg(null)
      setInput('')
      return
    }

    // Always send content (null for non-text) so NOT NULL columns are satisfied
    const msgData: Record<string, unknown> = {
      sender_id: currentUserId,
      receiver_id: activeContact.id,
      type,
      content: type === 'text' ? input.trim() : null,
      ...(replyTo ? {
        reply_to_id: replyTo.id,
        reply_to_content: replyTo.content || `[${replyTo.type}]`,
        reply_to_sender: replyTo.sender_id,
      } : {}),
      ...extra,
    }

    const { data, error } = await supabase.from('messages').insert(msgData).select().single()
    if (error) {
      console.error('sendMessage insert error:', JSON.stringify(error))
    }
    if (!error && data) {
      setMessages(prev => [...prev, data as Message])
      setContacts(prev => {
        const updated = prev.map(c => c.id === activeContact.id ? { ...c, lastMessage: data as Message } : c)
        return updated.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1
          if (!a.pinned && b.pinned) return 1
          const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0
          const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0
          return bTime - aTime
        })
      })
    }

    if (type === 'text') setInput('')
    setReplyTo(null)
  }, [currentUserId, activeContact, input, replyTo, editingMsg])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    if (e.key === 'Escape') { setReplyTo(null); setEditingMsg(null); setInput('') }
  }

  const handleDeleteMsg = async (msg: Message) => {
    await supabase.from('messages').update({ deleted: true, content: null, file_url: null }).eq('id', msg.id)
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, deleted: true, content: undefined } : m))
  }

  const handleReact = async (msgId: string, emoji: string) => {
    if (!currentUserId) return
    const msg = messages.find(m => m.id === msgId)
    if (!msg) return
    const reactions: Reaction[] = msg.reactions ? [...msg.reactions] : []
    const existingIdx = reactions.findIndex(r => r.emoji === emoji)

    if (existingIdx >= 0) {
      const existing = reactions[existingIdx]
      if (existing.user_ids.includes(currentUserId)) {
        reactions[existingIdx] = { ...existing, user_ids: existing.user_ids.filter(id => id !== currentUserId) }
      } else {
        reactions[existingIdx] = { ...existing, user_ids: [...existing.user_ids, currentUserId] }
      }
    } else {
      reactions.push({ emoji, user_ids: [currentUserId] })
    }

    await supabase.from('messages').update({ reactions }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions } : m))
  }

  const startRecording = async () => {
    // Prevent double-trigger from onMouseDown + onTouchStart on mobile
    if (mediaRecorderRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Pick the best supported MIME type
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) || ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      recordingChunks.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) recordingChunks.current.push(e.data) }
      // Collect data every 250ms so chunks are never empty on stop
      mr.start(250)
      mediaRecorderRef.current = mr
      recordingSecondsRef.current = 0
      setRecordingSeconds(0)
      setIsRecording(true)
      recordingTimer.current = setInterval(() => {
        recordingSecondsRef.current += 1
        setRecordingSeconds(recordingSecondsRef.current)
      }, 1000)
    } catch (err) {
      console.error('Microphone error:', err)
    }
  }

  const stopRecording = () => {
    const mr = mediaRecorderRef.current
    if (!mr) return

    // Snapshot refs NOW before any async work, so values can't go stale
    const userId = currentUserIdRef.current
    const contact = activeContactRef.current
    const duration = recordingSecondsRef.current

    if (!userId || !contact) {
      mr.stream.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current = null
      setIsRecording(false)
      if (recordingTimer.current) clearInterval(recordingTimer.current)
      return
    }

    setIsRecording(false)
    if (recordingTimer.current) clearInterval(recordingTimer.current)

    // Assign onstop BEFORE calling stop() so it's guaranteed to fire
    mr.onstop = async () => {
      mediaRecorderRef.current = null
      const mimeType = mr.mimeType || 'audio/webm'
      const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm'
      const blob = new Blob(recordingChunks.current, { type: mimeType })
      if (blob.size === 0) {
        mr.stream.getTracks().forEach(t => t.stop())
        return
      }
      const path = `voice/${userId}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('messages').upload(path, blob)
      mr.stream.getTracks().forEach(t => t.stop())
      if (error) { console.error('Upload error:', error); return }
      const { data: urlData } = supabase.storage.from('messages').getPublicUrl(path)
      // content must be present (even as null) if the column is NOT NULL in your schema
      const msgData = {
        sender_id: userId,
        receiver_id: contact.id,
        type: 'voice' as const,
        content: null as null,
        file_url: urlData.publicUrl,
        duration,
      }
      const { data, error: insertError } = await supabase.from('messages').insert(msgData).select().single()
      if (insertError) console.error('Voice insert error:', JSON.stringify(insertError))
      if (!insertError && data) {
        setMessages(prev => [...prev, data as Message])
        setContacts(prev => {
          const updated = prev.map(c => c.id === contact.id ? { ...c, lastMessage: data as Message } : c)
          return updated.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1
            if (!a.pinned && b.pinned) return 1
            const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0
            const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0
            return bTime - aTime
          })
        })
      }
    }

    mr.stop()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type,
    }))
    setPreviewFiles(prev => [...prev, ...newPreviews])
    e.target.value = ''
  }

  const sendFiles = async () => {
    if (!currentUserId || !activeContact || !previewFiles.length) return
    setUploadingFiles(true)

    for (const item of previewFiles) {
      const ext = item.file.name.split('.').pop()
      const path = `${item.type === 'image' ? 'images' : 'files'}/${currentUserId}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('messages').upload(path, item.file)
      if (error) continue
      const { data: urlData } = supabase.storage.from('messages').getPublicUrl(path)
      await sendMessage(item.type === 'image' ? 'image' : 'file', {
        file_url: urlData.publicUrl,
        file_name: item.file.name,
        file_size: formatFileSize(item.file.size),
      })
    }

    setPreviewFiles([])
    setUploadingFiles(false)
  }

  const handlePinContact = (contactId: string) => {
    setPinnedContacts(prev => {
      const next = prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
      localStorage.setItem('chat_pinned_users', JSON.stringify(next))
      setContacts(prevC => prevC.map(c => c.id === contactId ? { ...c, pinned: !c.pinned } : c))
      return next
    })
    setShowContactMenu(false)
  }

  const handleMuteContact = (contactId: string) => {
    setMutedContacts(prev => {
      const next = prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
      localStorage.setItem('chat_muted_users', JSON.stringify(next))
      setContacts(prevC => prevC.map(c => c.id === contactId ? { ...c, muted: !c.muted } : c))
      return next
    })
    setShowContactMenu(false)
  }

  const handleHideContact = (contactId: string) => {
    if (!hiddenPasswordHash) {
      setContactMenuTarget(contacts.find(c => c.id === contactId) || null)
      setShowContactMenu(false)
      setShowHiddenSetup(true)
      return
    }
    const next = [...hiddenContacts, contactId]
    setHiddenContacts(next)
    localStorage.setItem('chat_hidden_users', JSON.stringify(next))
    setShowContactMenu(false)
    if (activeContact?.id === contactId) closeChat()
  }

  const handleDeleteContact = (contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId))
    setShowContactMenu(false)
    if (activeContact?.id === contactId) closeChat()
  }

  const setupHiddenPassword = () => {
    if (hiddenPwInput.length < 4) { setHiddenPwError('Password must be at least 4 characters'); return }
    if (hiddenPwInput !== hiddenPwConfirm) { setHiddenPwError('Passwords do not match'); return }
    const hash = hashPassword(hiddenPwInput)
    setHiddenPasswordHash(hash)
    localStorage.setItem('chat_hidden_pw', hash)

    if (contactMenuTarget) {
      const next = [...hiddenContacts, contactMenuTarget.id]
      setHiddenContacts(next)
      localStorage.setItem('chat_hidden_users', JSON.stringify(next))
    }
    setShowHiddenSetup(false)
    setHiddenPwInput('')
    setHiddenPwConfirm('')
    setHiddenPwError('')
    setContactMenuTarget(null)
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    if (hiddenPasswordHash && hashPassword(val) === hiddenPasswordHash) {
      setShowHiddenView(true)
      setSearch('')
    } else {
      setShowHiddenView(false)
    }
  }

  const setNickname = () => {
    if (!activeContact) return
    const nicknames = JSON.parse(localStorage.getItem('chat_nicknames') || '{}')
    if (nicknameInput.trim()) {
      nicknames[activeContact.id] = nicknameInput.trim()
    } else {
      delete nicknames[activeContact.id]
    }
    localStorage.setItem('chat_nicknames', JSON.stringify(nicknames))
    setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, nickname: nicknameInput.trim() || undefined } : c))
    setActiveContact(prev => prev ? { ...prev, nickname: nicknameInput.trim() || undefined } : null)
    setShowNicknameModal(false)
    setNicknameInput('')
  }

  const searchInMessages = () => {
    if (!msgSearchQuery.trim()) { setSearchMessages([]); return }
    const q = msgSearchQuery.toLowerCase()
    setSearchMessages(messages.filter(m => m.content?.toLowerCase().includes(q)))
  }

  useEffect(() => { searchInMessages() }, [msgSearchQuery, messages])

  const visibleContacts = useMemo(() => {
    const list = showHiddenView
      ? contacts.filter(c => hiddenContacts.includes(c.id))
      : contacts.filter(c => !hiddenContacts.includes(c.id))

    return list.filter(c =>
      (c.nickname || c.name).toLowerCase().includes(search.toLowerCase()) ||
      (c.username?.toLowerCase() ?? '').includes(search.toLowerCase())
    )
  }, [contacts, hiddenContacts, showHiddenView, search])

  return (
    <div className="flex h-full w-full min-w-0 bg-[#f0f2f5] dark:bg-zinc-950">

      {lightboxUrl && <LightboxViewer url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {showHiddenSetup && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={20} className="text-indigo-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Set Hidden Chat Password</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">Type this password in the search bar to access hidden chats.</p>
            <input
              type="password"
              placeholder="Password"
              value={hiddenPwInput}
              onChange={e => setHiddenPwInput(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-400 mb-3"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={hiddenPwConfirm}
              onChange={e => setHiddenPwConfirm(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-400 mb-2"
            />
            {hiddenPwError && <p className="text-xs text-red-500 mb-2">{hiddenPwError}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={() => { setShowHiddenSetup(false); setContactMenuTarget(null) }} className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={setupHiddenPassword} className="flex-1 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">Create</button>
            </div>
          </div>
        </div>
      )}

      {showNicknameModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Set Nickname</h2>
            <input
              type="text"
              placeholder={activeContact?.name || 'Nickname'}
              value={nicknameInput}
              onChange={e => setNicknameInput(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-400 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowNicknameModal(false)} className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={setNickname} className="flex-1 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {showContactMenu && contactMenuTarget && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowContactMenu(false)}>
          <div
            className="absolute bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden min-w-[200px] border border-gray-100 dark:border-zinc-800"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
              <Avatar contact={contactMenuTarget} size={9} />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{contactMenuTarget.nickname || contactMenuTarget.name}</p>
                {contactMenuTarget.username && <p className="text-xs text-gray-400">@{contactMenuTarget.username}</p>}
              </div>
            </div>
            {[
              { icon: Pin, label: contactMenuTarget.pinned ? 'Unpin Chat' : 'Pin Chat', action: () => handlePinContact(contactMenuTarget.id) },
              { icon: EyeOff, label: 'Hide Chat', action: () => handleHideContact(contactMenuTarget.id) },
              { icon: BellOff, label: contactMenuTarget.muted ? 'Unmute' : 'Mute', action: () => handleMuteContact(contactMenuTarget.id) },
          
            ].map(item => (
              <button key={item.label} onClick={item.action}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${(item as any).red ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}
              >
                <item.icon size={15} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`${showList ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-[360px] bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex-shrink-0`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            {showHiddenView && (
              <button onClick={() => setShowHiddenView(false)} className="text-gray-400 mr-1">
                <ArrowLeft size={18} />
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {showHiddenView ? (
                <span className="flex items-center gap-1.5 text-indigo-600"><Lock size={16} />Hidden Chats</span>
              ) : 'Messages'}
            </h1>
          </div>
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 rounded-xl px-3 py-2">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder={hiddenPasswordHash ? 'Search or enter password…' : 'Search conversations'}
              className="bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none flex-1 min-w-0"
            />
            {search && <button onClick={() => setSearch('')}><X size={14} className="text-gray-400" /></button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibleContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                {showHiddenView ? <Lock size={20} className="text-gray-400" /> : <UserPlus size={20} className="text-gray-400" />}
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {showHiddenView ? 'No hidden chats' : 'No conversations yet'}
              </p>
              {!showHiddenView && (
                <p className="text-xs text-gray-400 mt-1">Follow people to start chatting</p>
              )}
            </div>
          ) : (
            visibleContacts.map(contact => (
              <ContactRow
                key={contact.id}
                contact={contact}
                active={contact.id === activeContact?.id}
                onClick={() => openChat(contact)}
                onLongPress={() => { setContactMenuTarget(contact); setShowContactMenu(true) }}
              />
            ))
          )}
        </div>
      </div>

      <div className={`${!showList ? 'flex' : 'hidden'} sm:flex flex-col flex-1 min-w-0 h-full`}>
        {activeContact ? (
          <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex-shrink-0">
              <button onClick={closeChat} className="sm:hidden text-gray-600 dark:text-gray-300 mr-1">
                <ArrowLeft size={20} />
              </button>
              <Avatar contact={activeContact} size={10} showOnline />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {activeContact.nickname || activeContact.name}
                </p>
                <p className="text-xs">
                  {isTyping ? (
                    <span className="text-indigo-500 font-medium">typing...</span>
                  ) : activeContact.online ? (
                    <span className="text-green-500">Online</span>
                  ) : activeContact.username ? (
                    <span className="text-gray-400">@{activeContact.username}</span>
                  ) : (
                    <span className="text-gray-400">Last seen recently</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowMsgSearch(v => !v)}
                  className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <Search size={17} />
                </button>
                <div className="relative" ref={headerMenuRef}>
                  <button
                    onClick={() => setShowHeaderMenu(v => !v)}
                    className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {showHeaderMenu && (
                    <div className="absolute right-0 top-10 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl shadow-xl overflow-hidden min-w-[170px] z-30">
                      <Link
                        href={`/profile/${activeContact.id}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                        onClick={() => setShowHeaderMenu(false)}
                      >
                        <Eye size={14} /> View Profile
                      </Link>
                      <button
                        onClick={() => { setShowNicknameModal(true); setNicknameInput(activeContact.nickname || ''); setShowHeaderMenu(false) }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                      >
                        <Edit2 size={14} /> Set Nickname
                      </button>
                      <button
                        onClick={() => { handleMuteContact(activeContact.id); setShowHeaderMenu(false) }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                      >
                        {activeContact.muted ? <Bell size={14} /> : <BellOff size={14} />}
                        {activeContact.muted ? 'Unmute' : 'Mute'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {showMsgSearch && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
                <Search size={14} className="text-gray-400" />
                <input
                  value={msgSearchQuery}
                  onChange={e => setMsgSearchQuery(e.target.value)}
                  placeholder="Search messages…"
                  className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none"
                  autoFocus
                />
                <button onClick={() => { setShowMsgSearch(false); setMsgSearchQuery(''); setSearchMessages([]) }}>
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            )}

            {!activeContact.isMutual ? (
              <LockedChat contact={activeContact} />
            ) : (
              <>
                <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 bg-[#efeae2] dark:bg-zinc-950">
                  {loadingMessages && (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                  )}

                  {(msgSearchQuery ? searchMessages : messages).map(msg => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      currentUserId={currentUserId!}
                      contactName={activeContact.nickname || activeContact.name}
                      onReply={setReplyTo}
                      onEdit={(m) => { setEditingMsg(m); setInput(m.content || '') }}
                      onDelete={handleDeleteMsg}
                      onReact={handleReact}
                      onLightbox={setLightboxUrl}
                    />
                  ))}
                  {isTyping && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>

                {previewFiles.length > 0 && (
                  <div className="flex gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 overflow-x-auto">
                    {previewFiles.map((item, i) => (
                      <div key={i} className="relative flex-shrink-0">
                        {item.type === 'image' ? (
                          <img src={item.url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                            <FileText size={20} className="text-indigo-500" />
                          </div>
                        )}
                        <button
                          onClick={() => setPreviewFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                        >
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={sendFiles}
                      disabled={uploadingFiles}
                      className="flex-shrink-0 w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-white disabled:opacity-50"
                    >
                      {uploadingFiles ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  </div>
                )}

                {(replyTo || editingMsg) && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-100 dark:border-indigo-800">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {editingMsg ? 'Editing message' : `Reply to ${replyTo?.sender_id === currentUserId ? 'yourself' : activeContact.nickname || activeContact.name}`}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{editingMsg?.content || replyTo?.content || `[${replyTo?.type}]`}</p>
                    </div>
                    <button onClick={() => { setReplyTo(null); setEditingMsg(null); setInput('') }}>
                      <X size={16} className="text-gray-400" />
                    </button>
                  </div>
                )}

                <div className="sticky bottom-0 flex-shrink-0 bg-[#f0f2f5] dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20">
                  {isRecording ? (
                    <div className="flex items-center gap-3 bg-white dark:bg-zinc-800 rounded-full px-4 py-2.5 shadow-sm">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm text-red-500 font-medium">Recording {formatDuration(recordingSeconds)}</span>
                      <div className="flex-1" />
                      <button onClick={stopRecording} className="p-2 rounded-full bg-red-500 text-white">
                        <MicOff size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="flex gap-1">
                        <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileSelect(e, 'image')} />
                        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFileSelect(e, 'file')} />
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          className="p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <ImageIcon size={18} />
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Paperclip size={18} />
                        </button>
                      </div>

                      <div className="flex-1 flex items-center gap-2 bg-white dark:bg-zinc-800 rounded-full px-4 py-2.5 shadow-sm">
                        <input
                          ref={inputRef}
                          value={input}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Type a message…"
                          className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none"
                        />
                      </div>

                      {input.trim() ? (
                        <button
                          onClick={() => sendMessage()}
                          className="p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex-shrink-0"
                        >
                          <Send size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={startRecording}
                          className="p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex-shrink-0"
                        >
                          <Mic size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="hidden sm:flex flex-col flex-1 items-center justify-center text-center px-8 bg-[#efeae2] dark:bg-zinc-950">
            <div className="w-20 h-20 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center mb-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg font-bold">Hi</div>
            </div>
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">Hello Messaging</h2>
            <p className="text-sm text-gray-400">Select a conversation to start</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatWindow() {
  return (
    <Suspense fallback={null}>
      <ChatWindowInner />
    </Suspense>
  )
}