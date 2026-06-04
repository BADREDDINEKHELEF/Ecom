'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageSquare, Send, Loader2, Search, Package,
  CheckCheck, Clock,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import SellerSidebar from '@/components/seller/SellerSidebar'

interface Message {
  id:          string
  vendor_id:   string
  order_id:    string | null
  buyer_phone: string
  buyer_name:  string
  sender:      'buyer' | 'seller'
  content:     string
  is_read:     boolean
  created_at:  string
}

interface Thread {
  buyer_phone: string
  buyer_name:  string
  content:     string
  sender:      'buyer' | 'seller'
  created_at:  string
}

const QUICK_REPLIES = [
  'Bonjour ! Comment puis-je vous aider ?',
  'Votre commande a été confirmée. Livraison sous 48-72h.',
  'Votre colis est en route ! Vous recevrez votre numéro de suivi.',
  'Merci pour votre commande. Nous vous contacterons prochainement.',
  'Désolé pour le délai, nous traitons votre commande en priorité.',
]

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1)  return 'à l\'instant'
  if (mins < 60) return `il y a ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `il y a ${hrs}h`
  return new Date(iso).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short' })
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-rose-500', 'bg-cyan-500',
]
function avatarColor(phone: string) {
  const idx = phone.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

export default function SellerMessagesPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const [threads, setThreads]       = useState<Thread[]>([])
  const [unread, setUnread]         = useState<Record<string, number>>({})
  const [activePhone, setActivePhone] = useState<string | null>(null)
  const [messages, setMessages]     = useState<Message[]>([])
  const [draft, setDraft]           = useState('')
  const [sending, setSending]       = useState(false)
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [search, setSearch]         = useState('')
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  const activeThread = threads.find((t) => t.buyer_phone === activePhone)

  const loadInbox = useCallback(async () => {
    if (!vendor) return
    setLoadingThreads(true)
    const res  = await fetch('/api/seller/messages')
    const data = await res.json()
    setThreads(data.threads ?? [])
    setUnread(data.unreadCounts ?? {})
    setLoadingThreads(false)
  }, [vendor])

  const loadThread = useCallback(async (phone: string) => {
    setLoadingMsgs(true)
    const res  = await fetch(`/api/seller/messages?phone=${encodeURIComponent(phone)}`)
    const data = await res.json()
    setMessages(data.messages ?? [])
    setUnread((prev) => { const next = { ...prev }; delete next[phone]; return next })
    setLoadingMsgs(false)
  }, [])

  useEffect(() => { loadInbox() }, [loadInbox])

  useEffect(() => {
    if (!activePhone) return
    loadThread(activePhone)
  }, [activePhone, loadThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!draft.trim() || !activePhone || !activeThread) return
    setSending(true)
    const res = await fetch('/api/seller/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyerPhone: activePhone,
        buyerName:  activeThread.buyer_name,
        content:    draft.trim(),
      }),
    })
    if (res.ok) {
      const { message } = await res.json()
      setMessages((prev) => [...prev, message])
      setDraft('')
      setThreads((prev) => prev.map((t) =>
        t.buyer_phone === activePhone
          ? { ...t, content: draft.trim(), sender: 'seller', created_at: new Date().toISOString() }
          : t
      ))
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const filteredThreads = threads.filter((t) =>
    !search ||
    t.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
    t.buyer_phone.includes(search)
  )

  const totalUnread = Object.values(unread).reduce((s, n) => s + n, 0)

  if (loading || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50" dir="ltr">
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} unreadMessages={totalUnread} />

      <main className="flex-1 ml-60 flex h-screen overflow-hidden">
        {/* ── Thread list ────────────────────────────────────── */}
        <div className="w-72 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h1 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Messages
              {totalUnread > 0 && (
                <span className="ml-auto text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingThreads ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Aucun message pour le moment</p>
              </div>
            ) : (
              filteredThreads.map((t) => {
                const hasUnread = (unread[t.buyer_phone] ?? 0) > 0
                const isActive  = activePhone === t.buyer_phone
                return (
                  <button key={t.buyer_phone}
                    onClick={() => setActivePhone(t.buyer_phone)}
                    className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 text-left transition-colors ${
                      isActive ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''
                    }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold ${avatarColor(t.buyer_phone)}`}>
                      {initials(t.buyer_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-sm font-semibold truncate ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                          {t.buyer_name}
                        </p>
                        <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2">{timeAgo(t.created_at)}</span>
                      </div>
                      <p className={`text-xs truncate ${hasUnread ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                        {t.sender === 'seller' && <span className="text-gray-400">Vous: </span>}
                        {t.content}
                      </p>
                    </div>
                    {hasUnread && (
                      <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-emerald-600 text-white text-[10px] font-black rounded-full flex-shrink-0">
                        {unread[t.buyer_phone]}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Conversation ──────────────────────────────────── */}
        {activePhone && activeThread ? (
          <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
            {/* Chat header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-100">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${avatarColor(activePhone)}`}>
                {initials(activeThread.buyer_name)}
              </div>
              <div>
                <p className="font-bold text-gray-900">{activeThread.buyer_name}</p>
                <p className="text-xs text-gray-400">{activePhone}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Commencez la conversation</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isSeller = m.sender === 'seller'
                  return (
                    <div key={m.id} className={`flex items-end gap-2 ${isSeller ? 'justify-end' : 'justify-start'}`}>
                      {!isSeller && (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(activePhone)}`}>
                          {initials(activeThread.buyer_name)}
                        </div>
                      )}
                      <div className={`max-w-[70%] ${isSeller ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isSeller
                            ? 'bg-emerald-600 text-white rounded-br-sm'
                            : 'bg-white text-gray-900 shadow-sm rounded-bl-sm'
                        }`}>
                          {m.content}
                        </div>
                        <div className={`flex items-center gap-1 text-[11px] text-gray-400 ${isSeller ? 'justify-end' : ''}`}>
                          {timeAgo(m.created_at)}
                          {isSeller && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick replies */}
            {showQuickReplies && (
              <div className="px-6 pb-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {QUICK_REPLIES.map((r) => (
                    <button key={r} onClick={() => { setDraft(r); setShowQuickReplies(false); inputRef.current?.focus() }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 border-b border-gray-50 last:border-0 transition-colors">
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-6 py-4 bg-white border-t border-gray-100">
              <div className="flex items-end gap-3">
                <button onClick={() => setShowQuickReplies(!showQuickReplies)}
                  title="Réponses rapides"
                  className={`p-2.5 rounded-xl border text-sm font-bold transition-colors flex-shrink-0 ${
                    showQuickReplies
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}>
                  <Clock className="w-4 h-4" />
                </button>
                <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden focus-within:border-emerald-400 transition-colors">
                  <textarea ref={inputRef} value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                    }}
                    placeholder="Votre message… (Entrée pour envoyer)"
                    rows={1}
                    className="w-full px-4 py-3 text-sm focus:outline-none resize-none max-h-32 bg-white" />
                </div>
                <button onClick={sendMessage} disabled={!draft.trim() || sending}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-xl disabled:opacity-60 transition-colors flex-shrink-0">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
            <div className="text-center">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Sélectionnez une conversation</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
