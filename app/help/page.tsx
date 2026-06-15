'use client'

import { useState } from 'react'
import Sidebar from '@/app/components/Sidebar'
import {
  MessageCircle, Shield, Bell, Search, Users, Settings,
  ChevronDown, ChevronRight, Lock, Mic, Image, FileText,
  MapPin, BarChart2, CreditCard, Camera, Music, Eye,
  UserPlus, Hash, Star, Zap, HelpCircle, Phone, Mail,
  CheckCheck, Reply, Trash2, Edit2, Smile, Pin, EyeOff,
  BellOff, Download, Play, Send, Paperclip, Video,
  Globe, Heart,
} from 'lucide-react'

type Section = {
  id: string
  icon: React.ElementType
  color: string
  title: string
  description: string
  features: {
    title: string
    desc: string
    icon?: React.ElementType
  }[]
}

const SECTIONS: Section[] = [
  {
    id: 'messaging',
    icon: MessageCircle,
    color: 'bg-indigo-500',
    title: 'Messaging',
    description: 'Everything you can do inside a conversation.',
    features: [
      { icon: Send,      title: 'Send messages',        desc: 'Type in the input bar and press Enter or tap the send button to send a text message.' },
      { icon: Reply,     title: 'Reply to a message',   desc: 'Swipe right on any message (mobile) or long-press → Reply to quote it. A reply preview appears above the input bar.' },
      { icon: Edit2,     title: 'Edit your message',    desc: 'Long-press or right-click your own message → Edit. The input bar switches to edit mode. Press Enter to save.' },
      { icon: Trash2,    title: 'Delete a message',     desc: 'Long-press or right-click your own message → Delete. The message is replaced with "You deleted this message".' },
      { icon: CheckCheck,title: 'Message status',       desc: 'One grey tick = sent. Two grey ticks = delivered. Two blue ticks = read by the other person.' },
      { icon: Smile,     title: 'Emoji reactions',      desc: 'Long-press any message to open the action menu. Pick an emoji from the top row. Tap it again to remove your reaction.' },
      { icon: Search,    title: 'Search messages',      desc: 'Tap the search icon in the chat header to search all messages in the current conversation.' },
      { icon: Lock,      title: 'End-to-end encryption', desc: 'Every message is encrypted with AES-256-GCM before being stored. Only you and the recipient can read them. Look for the green shield icon next to the contact name.' },
    ],
  },
  {
    id: 'attachments',
    icon: Paperclip,
    color: 'bg-orange-500',
    title: 'Attachments',
    description: 'Tap the paperclip icon to open the attachment menu — a 4×2 grid just like WhatsApp.',
    features: [
      { icon: Camera,    title: 'Camera',    desc: 'Opens your device camera directly inside Kivo. Snap a photo and send it instantly without leaving the app.' },
      { icon: Image,     title: 'Photo',     desc: 'Pick one or multiple images from your gallery. Preview thumbnails appear above the input bar before sending.' },
      { icon: FileText,  title: 'Document',  desc: 'Share any file type — PDF, Word, Excel, ZIP and more. The recipient can download it with one tap.' },
      { icon: BarChart2, title: 'Poll',      desc: 'Create a WhatsApp-style poll. Add a question and up to 12 options. Both people can vote and see live animated results.' },
      { icon: MapPin,    title: 'Location',  desc: 'Share your current GPS location. The message includes a map preview and a link to Google Maps.' },
      { icon: Users,     title: 'Contact',   desc: 'Share a contact card from your address book directly in chat.' },
      { icon: Mic,       title: 'Audio',     desc: 'Send any audio file from your device. The recipient can play it with the built-in player.' },
      { icon: CreditCard,title: 'Payment',   desc: 'Send a ₹ payment request with an optional note. Useful for splitting bills or requesting money.' },
    ],
  },
  {
    id: 'voice',
    icon: Mic,
    color: 'bg-rose-500',
    title: 'Voice Notes',
    description: 'Record and send voice messages directly in chat.',
    features: [
      { icon: Mic,  title: 'Record a voice note', desc: 'Tap the microphone button (appears when the text input is empty). Recording starts immediately.' },
      { icon: Play, title: 'Stop & send',          desc: 'Tap the red stop button to finish recording. The note is uploaded and sent automatically.' },
      { icon: Play, title: 'Play voice notes',     desc: 'Tap the play button on any voice bubble. A progress bar shows playback position and duration.' },
    ],
  },
  {
    id: 'polls',
    icon: BarChart2,
    color: 'bg-amber-500',
    title: 'Polls',
    description: 'Create interactive polls and see real-time results.',
    features: [
      { icon: BarChart2, title: 'Create a poll',         desc: 'Tap the paperclip → Poll. Write your question, then add 2–12 options. Tap Send in the top right.' },
      { icon: CheckCheck,title: 'Vote',                  desc: 'Tap any option on a received poll to cast your vote. The animated progress bars update instantly.' },
      { icon: Eye,       title: 'See results',           desc: 'After voting, each option shows a percentage bar and vote count. Tap your own choice again to change it.' },
      { icon: Users,     title: 'Multiple answers toggle', desc: 'The "Allow multiple answers" toggle lets voters pick more than one option.' },
    ],
  },
  {
    id: 'status',
    icon: Eye,
    color: 'bg-purple-500',
    title: 'Status',
    description: 'Share text or photo updates that disappear after 24 hours.',
    features: [
      { icon: Edit2,     title: 'Post a text status',  desc: 'Tap "My Status" → the + button. Choose the Text tab, type your message (up to 200 chars), pick a background colour, optionally add music, then Post.' },
      { icon: Image,     title: 'Post a photo status', desc: 'Choose the Photo tab, pick an image from your gallery, add an optional caption and music, then Post.' },
      { icon: Music,     title: 'Add music',           desc: 'Search any song in any language (English, Hindi, Assamese, K-Pop and more) using the iTunes-powered music picker. Select a 15-second clip using the trim slider.' },
      { icon: Eye,       title: 'View statuses',       desc: 'Tap any contact\'s ring in the Status page to view their updates. Progress bars at the top show how many slides they have.' },
      { icon: CheckCheck,title: 'Views list',          desc: 'On your own status, tap the eye icon at the bottom to see who has viewed each slide — with names, not IDs.' },
      { icon: Trash2,    title: 'Delete a status',     desc: 'While viewing your own status, tap ⋮ → Delete this status.' },
      { icon: EyeOff,    title: 'Hide a user\'s status', desc: 'While viewing someone\'s status, tap ⋮ → Hide. They won\'t see that you hid them.' },
    ],
  },
  {
    id: 'chat-management',
    icon: Settings,
    color: 'bg-teal-500',
    title: 'Chat Management',
    description: 'Organise your conversations your way.',
    features: [
      { icon: Pin,    title: 'Pin a chat',     desc: 'Long-press any conversation → Pin Chat. Pinned chats always appear at the top of your list.' },
      { icon: EyeOff, title: 'Hide a chat',    desc: 'Long-press → Hide Chat. Hidden chats disappear from the main list and need a password to access.' },
      { icon: Lock,   title: 'Hidden chats password', desc: 'The first time you hide a chat, you create a 4+ character password. Type that password into the search bar to reveal the Hidden Chats section.' },
      { icon: BellOff,title: 'Mute a chat',   desc: 'Long-press → Mute. No in-app notifications or browser notifications for that conversation.' },
      { icon: Edit2,  title: 'Set a nickname', desc: 'Inside a chat, tap ⋮ → Set Nickname. The nickname replaces the real name everywhere in that chat.' },
      { icon: Trash2, title: 'Remove a chat',  desc: 'Long-press → Remove. Removes the conversation from your list (does not delete messages from their side).' },
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    color: 'bg-yellow-500',
    title: 'Notifications',
    description: 'Stay informed even when you\'re in a different tab.',
    features: [
      { icon: Bell,        title: 'Browser notifications', desc: 'Grant notification permission when prompted. You\'ll get a system notification whenever a new message arrives and the tab is in the background.' },
      { icon: MessageCircle, title: 'In-app toasts',      desc: 'When you\'re in a different chat, a slide-down toast pops up at the top of the screen with the sender\'s avatar and message preview. Tap to jump to that chat.' },
      { icon: BellOff,     title: 'Muted contacts',       desc: 'Muted contacts produce no notification of any kind. Manage this from the long-press chat menu.' },
    ],
  },
  {
    id: 'search',
    icon: Search,
    color: 'bg-cyan-500',
    title: 'Search',
    description: 'Find people and music from the Search page.',
    features: [
      { icon: Users,  title: 'People search',   desc: 'Search any user by full name or @username. Tap a result to visit their profile.' },
      { icon: Music,  title: 'Music search',    desc: 'Switch to the Music tab to search 90 million+ songs in any language via Apple iTunes. Preview a 30-second clip before using it in a status.' },
      { icon: Globe,  title: 'Language picks',  desc: 'Quick-pick buttons let you browse English, Hindi, Assamese, Bengali, Punjabi, Tamil, Telugu, K-Pop, Lo-fi and more with one tap.' },
      { icon: Download,title: 'Copy preview URL', desc: 'Copy the iTunes preview URL of any track to paste into a status or share externally.' },
    ],
  },
  {
    id: 'profiles',
    icon: UserPlus,
    color: 'bg-emerald-500',
    title: 'Profiles & Following',
    description: 'Kivo uses a mutual-follow model to unlock messaging.',
    features: [
      { icon: UserPlus,  title: 'Follow someone',     desc: 'Visit a profile and tap Follow. They receive a notification that you followed them.' },
      { icon: CheckCheck,title: 'Mutual follow = chat unlocked', desc: 'You can only message someone if you both follow each other. The chat shows a lock icon until both sides follow.' },
      { icon: Users,     title: 'Followers / Following count', desc: 'Every profile shows how many people follow them and how many they follow.' },
      { icon: Eye,       title: 'View profile from chat', desc: 'Tap ⋮ inside any chat → View Profile to go to that person\'s profile.' },
    ],
  },
  {
    id: 'online',
    icon: Zap,
    color: 'bg-green-500',
    title: 'Online Status & Typing',
    description: 'Real-time presence indicators.',
    features: [
      { icon: Zap,    title: 'Green online dot',    desc: 'A green dot on an avatar means that person is currently active on Kivo. Powered by Supabase Realtime Presence.' },
      { icon: Edit2,  title: 'Typing indicator',    desc: 'Three animated dots appear in the chat header when the other person is typing. It disappears 2 seconds after they stop.' },
    ],
  },
  {
    id: 'security',
    icon: Shield,
    color: 'bg-blue-600',
    title: 'Privacy & Security',
    description: 'Your data is protected at every layer.',
    features: [
      { icon: Lock,   title: 'End-to-end encryption', desc: 'All text messages are encrypted with AES-256-GCM using a key derived from your user IDs. The key never leaves your device.' },
      { icon: Shield, title: 'E2E indicator',          desc: 'A green ShieldCheck icon appears next to every contact name inside a chat to confirm encryption is active.' },
      { icon: EyeOff, title: 'Hidden chats',           desc: 'Password-protected hidden chats add an extra layer of privacy for sensitive conversations.' },
      { icon: BellOff,title: 'Mute without blocking',  desc: 'Muting stops notifications without blocking or affecting the other person\'s experience.' },
    ],
  },
]

const FAQ = [
  { q: 'Why can\'t I message someone?', a: 'Kivo requires a mutual follow — both you and the other person must follow each other before the chat unlocks. Visit their profile and follow them; once they follow back, the lock disappears.' },
  { q: 'How do I access my hidden chats?', a: 'Type the hidden-chats password you created directly into the search bar on the Messages page. The list will switch to show only hidden conversations.' },
  { q: 'Are my messages really private?', a: 'Yes. Every text message is encrypted with AES-256-GCM before it reaches Supabase. Only your device and the recipient\'s device can decrypt them.' },
  { q: 'How long does a status last?', a: 'All statuses automatically expire after 24 hours and are deleted from the database.' },
  { q: 'Can I use Kivo on mobile?', a: 'Yes. Kivo is fully responsive. On mobile the send and mic buttons move inside the input pill to save space, and you can swipe right on messages to reply.' },
  { q: 'How do I record a voice note?', a: 'Tap the microphone button in the chat input bar (it appears when the text field is empty). Tap the red stop button when you\'re done — it uploads and sends automatically.' },
  { q: 'Can I search songs in Hindi or Assamese?', a: 'Yes. The music search in the Search page and status composer is powered by Apple iTunes and covers songs in every language. Use the language quick-pick buttons or type any song or artist name.' },
  { q: 'How do I delete my status?', a: 'Open your status by tapping "My Status", then tap ⋮ in the top-right corner and choose "Delete this status".' },
]

function FeatureCard({ section, open, onToggle }: {
  section: Section
  open: boolean
  onToggle: () => void
}) {
  const Icon = section.icon
  return (
    <div className={`rounded-3xl border transition-all duration-300 overflow-hidden ${open ? 'border-indigo-200 dark:border-indigo-800 shadow-md' : 'border-gray-100 dark:border-zinc-800'} bg-white dark:bg-zinc-900`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <div className={`w-10 h-10 rounded-2xl ${section.color} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{section.title}</p>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 truncate">{section.description}</p>
        </div>
        <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`transition-all duration-300 ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="px-5 pb-5 space-y-3 border-t border-gray-50 dark:border-zinc-800 pt-4">
          {section.features.map((f, i) => {
            const FIcon = f.icon
            return (
              <div key={i} className="flex items-start gap-3">
                {FIcon && (
                  <div className="w-7 h-7 rounded-xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FIcon size={13} className="text-indigo-500" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{f.title}</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function HelpPage() {
  const [openSection, setOpenSection] = useState<string | null>('messaging')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const filteredSections = SECTIONS.filter(s =>
    !search.trim() ||
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.features.some(f =>
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.desc.toLowerCase().includes(search.toLowerCase())
    )
  )

  const filteredFaqs = FAQ.filter(f =>
    !search.trim() ||
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors">
      <Sidebar />

      <main className="sm:ml-[72px] px-4 py-6 pb-24 sm:pb-8">
        <div className="mx-auto max-w-2xl">

          {/* Hero */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-500/30">
              <HelpCircle size={26} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Help & Features</h1>
            <p className="mt-2 text-sm text-gray-400 dark:text-zinc-500 max-w-sm mx-auto">
              Everything you need to know about Kivo — all in one place.
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search features, tips, FAQs…"
              className="w-full rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-3 pl-10 pr-4 text-sm text-gray-900 dark:text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition"
            />
          </div>

          {/* Quick feature pills */}
          {!search && (
            <div className="flex flex-wrap gap-2 mb-8">
              {SECTIONS.map(s => {
                const Icon = s.icon
                return (
                  <button
                    key={s.id}
                    onClick={() => setOpenSection(s.id === openSection ? null : s.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      openSection === s.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    <Icon size={12} />
                    {s.title}
                  </button>
                )
              })}
            </div>
          )}

          {/* Feature sections */}
          <div className="space-y-3 mb-10">
            {filteredSections.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-10 text-center">
                <p className="text-sm text-gray-400">No results for "{search}"</p>
              </div>
            ) : (
              filteredSections.map(section => (
                <FeatureCard
                  key={section.id}
                  section={section}
                  open={search ? true : openSection === section.id}
                  onToggle={() => setOpenSection(openSection === section.id ? null : section.id)}
                />
              ))
            )}
          </div>

          {/* FAQ */}
          {filteredFaqs.length > 0 && (
            <div className="mb-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Star size={18} className="text-yellow-400" />
                Frequently Asked Questions
              </h2>
              <div className="space-y-2">
                {filteredFaqs.map((faq, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
                    >
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{faq.q}</p>
                      <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`transition-all duration-200 ${openFaq === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                      <p className="px-5 pb-4 text-sm text-gray-500 dark:text-zinc-400 leading-relaxed border-t border-gray-50 dark:border-zinc-800 pt-3">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          )}

         

          {/* Version */}
          <p className="text-center text-xs text-gray-300 dark:text-zinc-600 mt-6">
            Kivo v1.0 · Powered by Proxima · Built with Next.js & Supabase
          </p>

        </div>
      </main>
    </div>
  )
}