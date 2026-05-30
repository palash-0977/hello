'use client'

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
} from 'react'
import {
  Search,
  MoreVertical,
  Send,
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  Play,
  Pause,
  Lock,
  UserPlus,
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import Link from 'next/link'

type MessageType = 'text' | 'image' | 'file' | 'voice'

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
}

type Contact = {
  id: string
  name: string
  username: string | null
  avatar_url: string | null
  online: boolean
  isMutual: boolean
}

const TypingIndicator = () => (
  <div className="flex justify-start mb-2">
    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1 shadow-sm">
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.9s' }} />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '160ms', animationDuration: '0.9s' }} />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '320ms', animationDuration: '0.9s' }} />
    </div>
  </div>
)

const VoiceNote = memo(({ url, fromMe, duration }: { url: string; fromMe: boolean; duration: number }) => {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => {
          if (!audioRef.current) return
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)
        }}
        onEnded={() => {
          setPlaying(false)
          setProgress(0)
        }}
      />

      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          fromMe ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
        }`}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>

      <div className="flex-1">
        <div className="h-1 rounded-full bg-black/10 overflow-hidden">
          <div
            className={`h-full ${
              fromMe ? 'bg-indigo-300' : 'bg-gray-500'
            }`}
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <p className="text-[10px] text-gray-500 mt-1">
          {formatTime(duration)}
        </p>
      </div>
    </div>
  )
})

VoiceNote.displayName = 'VoiceNote'

const MessageBubble = memo(
  ({
    msg,
    currentUserId,
  }: {
    msg: Message
    currentUserId: string
  }) => {
    const fromMe = msg.sender_id === currentUserId

    const time = new Date(msg.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })

    return (
      <div
        className={`flex ${
          fromMe ? 'justify-end' : 'justify-start'
        } mb-2`}
      >
        <div
          className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
            fromMe
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
          }`}
        >
          {msg.type === 'image' && msg.file_url && (
            <img
              src={msg.file_url}
              alt="img"
              className="rounded-xl mb-1 max-h-72 object-cover"
            />
          )}

          {msg.type === 'file' && msg.file_url && (
            <a
              href={msg.file_url}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-3 rounded-xl p-3 ${
                fromMe ? 'bg-white/10' : 'bg-gray-100'
              }`}
            >
              <FileText size={20} className={fromMe ? 'text-white' : 'text-indigo-500'} />
              <div>
                <p className="text-xs font-medium">
                  {msg.file_name}
                </p>
                <p className={`text-[10px] ${fromMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {msg.file_size}
                </p>
              </div>
            </a>
          )}

          {msg.type === 'voice' && msg.file_url && (
            <VoiceNote
              url={msg.file_url}
              fromMe={fromMe}
              duration={msg.duration || 0}
            />
          )}

          {msg.content && (
            <p className="text-sm">
              {msg.content}
            </p>
          )}

          <div
            className={`flex items-center gap-1 mt-1 ${
              fromMe ? 'justify-end' : 'justify-start'
            }`}
          >
            <span className="text-[10px] opacity-70">
              {time}
            </span>

            {fromMe &&
              (msg.read ? (
                <CheckCheck size={12} />
              ) : (
                <Check size={12} />
              ))}
          </div>
        </div>
      </div>
    )
  }
)

MessageBubble.displayName = 'MessageBubble'

const Avatar = ({ contact, size = 10 }: { contact: Contact; size?: number }) => {
  const sz = `w-${size} h-${size}`
  if (contact.avatar_url) {
    return <img src={contact.avatar_url} alt={contact.name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
  }
  const colors = ['bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500']
  const color = colors[contact.id.charCodeAt(0) % colors.length]
  return (
    <div className={`${sz} rounded-full ${color} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
      {contact.name[0]}
    </div>
  )
}

const ContactRow = memo(({ contact, active, lastMsg, onClick }: {
  contact: Contact
  active: boolean
  lastMsg?: Message
  onClick: () => void
}) => {
  const time = lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-gray-100 ${
        active ? 'bg-indigo-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className="relative flex-shrink-0">
        <Avatar contact={contact} size={11} />
        {contact.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white" />}
        {!contact.isMutual && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
            <Lock size={8} className="text-white" />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900 truncate">{contact.name}</span>
          {time && <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">{time}</span>}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          {contact.isMutual ? (
            <span className="text-xs text-gray-400 truncate">
              {lastMsg?.content || (lastMsg?.type === 'image' ? '📷 Photo' : lastMsg?.type === 'voice' ? '🎤 Voice' : '')}
            </span>
          ) : (
            <span className="text-xs text-amber-500">Follow each other to chat</span>
          )}
        </div>
      </div>
    </button>
  )
})
ContactRow.displayName = 'ContactRow'

const LockedChat = ({ contact }: { contact: Contact }) => (
  <div className="flex flex-col flex-1 items-center justify-center text-center px-8 bg-[#efeae2]">
    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
      <Lock size={28} className="text-amber-500" />
    </div>
    <h2 className="text-base font-semibold text-gray-800 mb-1">Messaging locked</h2>
    <p className="text-sm text-gray-500 mb-4">You and {contact.name} need to follow each other to chat.</p>
    <Link
      href={`/profile/${contact.id}`}
      className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
    >
      <UserPlus size={16} /> View Profile
    </Link>
  </div>
)

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function ChatWindow() {
  const supabase = createClient()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [showList, setShowList] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)
      await loadContacts(user.id)
    }
    init()
  }, [])

  const loadContacts = async (userId: string) => {
    const { data: iFollow } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', userId)

    const { data: followsMe } = await supabase
      .from('followers')
      .select('follower_id')
      .eq('following_id', userId)

    const iFollowIds = iFollow?.map(r => r.following_id) ?? []
    const followsMeIds = followsMe?.map(r => r.follower_id) ?? []

    const allIds = [...new Set([...iFollowIds, ...followsMeIds])]
    if (allIds.length === 0) return

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', allIds)

    const contactList: Contact[] = (profiles ?? []).map(p => ({
      id: p.id,
      name: p.full_name || p.username || 'User',
      username: p.username,
      avatar_url: p.avatar_url,
      online: false,
      isMutual: iFollowIds.includes(p.id) && followsMeIds.includes(p.id),
    }))

    setContacts(contactList)
  }

  useEffect(() => {
    if (!activeContact || !currentUserId) return

    setLoadingMessages(true)
    setMessages([])

    const fetch = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${activeContact.id}),and(sender_id.eq.${activeContact.id},receiver_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true })

      setMessages(data || [])
      setLoadingMessages(false)

      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', activeContact.id)
        .eq('receiver_id', currentUserId)
        .eq('read', false)
    }

    fetch()

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`messages-${currentUserId}-${activeContact.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const msg = payload.new as Message
          if (msg.sender_id === activeContact.id) {
            setMessages(prev => [...prev, msg])
            setIsTyping(false)
            supabase.from('messages').update({ read: true }).eq('id', msg.id)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [activeContact?.id, currentUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isTyping])

  const sendMessage = useCallback(async (
    type: MessageType = 'text',
    extra?: { file_url?: string; file_name?: string; file_size?: string; duration?: number }
  ) => {
    if (!currentUserId || !activeContact) return
    if (type === 'text' && !input.trim()) return
    if (!activeContact.isMutual) return

    const msgData = {
      sender_id: currentUserId,
      receiver_id: activeContact.id,
      content: type === 'text' ? input.trim() : undefined,
      type,
      read: false,
      ...extra,
    }

    const { data, error } = await supabase.from('messages').insert(msgData).select().single()
    if (!error && data) {
      setMessages(prev => [...prev, data])
    }

    if (type === 'text') setInput('')
  }, [currentUserId, activeContact, input])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.username?.toLowerCase() ?? '').includes(search.toLowerCase())
  )

  const lastMessages: Record<string, Message> = {}
  messages.forEach(m => {
    const otherId = m.sender_id === currentUserId ? m.receiver_id : m.sender_id
    lastMessages[otherId] = m
  })

  return (
    <div className="flex h-full w-full min-w-0 bg-[#f0f2f5]">
      <div className={`${showList ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-[360px] bg-white border-r border-gray-200 flex-shrink-0`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">Hi</div>
            <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1 min-w-0"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <UserPlus size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Follow people to start chatting</p>
              <Link href="/search" className="mt-4 text-xs text-indigo-600 font-medium hover:underline">
                Browse people →
              </Link>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <ContactRow
                key={contact.id}
                contact={contact}
                active={contact.id === activeContact?.id}
                lastMsg={lastMessages[contact.id]}
                onClick={() => {
                  setActiveContact(contact)
                  setShowList(false)
                  setTimeout(() => inputRef.current?.focus(), 100)
                }}
              />
            ))
          )}
        </div>
      </div>

      <div className={`${!showList ? 'flex' : 'hidden'} sm:flex flex-col flex-1 min-w-0 h-full`}>
        {activeContact ? (
          <div className="flex flex-col h-full min-h-0">
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
              <button onClick={() => setShowList(true)} className="sm:hidden text-gray-600 mr-1">
                <ArrowLeft size={20} />
              </button>

              <div className="relative flex-shrink-0">
                <Avatar contact={activeContact} size={10} />
                {activeContact.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{activeContact.name}</p>
                <p className="text-xs">
                  {isTyping
                    ? <span className="text-indigo-500 font-medium">typing...</span>
                    : activeContact.username
                      ? <span className="text-gray-400">@{activeContact.username}</span>
                      : <span className="text-gray-400">{activeContact.online ? 'Online' : 'Last seen recently'}</span>
                  }
                </p>
              </div>

              <Link
                href={`/profile/${activeContact.id}`}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <MoreVertical size={18} />
              </Link>
            </div>

            {!activeContact.isMutual ? (
              <LockedChat contact={activeContact} />
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 sm:pb-4 bg-[#efeae2]">
                  {loadingMessages && (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                  )}

                  {messages.map(msg => (
                    <MessageBubble key={msg.id} msg={msg} currentUserId={currentUserId!} />
                  ))}

                  {isTyping && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>

                <div className="fixed bottom-0 left-0 right-0 sm:static sm:bottom-auto z-20 bg-[#f0f2f5] border-t border-gray-200 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                  <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-sm">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message…"
                      className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                    />
                    <button
                      onClick={() => sendMessage()}
                      className="p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex-shrink-0"
                      disabled={!input.trim()}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="hidden sm:flex flex-col flex-1 items-center justify-center text-center px-8 bg-[#efeae2]">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg font-bold">Hi</div>
            </div>
            <h2 className="text-base font-semibold text-gray-700 mb-1">Hi Messaging</h2>
            <p className="text-sm text-gray-400">Select a conversation to start</p>
          </div>
        )}
      </div>
    </div>
  )
}