import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Send, Paperclip, X, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { STUDIO_TZ } from '../lib/studioTime'
import { getAdminProfileId, SUPPORT_DISPLAY_NAME, SUPPORT_AVATAR } from '../lib/support'
import './ChatPage.css'

function RoleBadge({ role }: { role: 'artist' | 'customer' | 'support' }) {
  const label = role === 'artist' ? 'Artist' : role === 'support' ? 'Support' : 'Customer'
  return <span className={`role-badge role-badge--${role} chat-role-badge`}>{label}</span>
}

type Message = {
  id: string
  sender_id: string
  body: string | null
  attachment_url: string | null
  attachment_type: string | null
  created_at: string
}

type ConvoMeta = {
  customer_id: string
  artist_id: string
  other_name: string
  other_avatar: string | null
  other_role: 'artist' | 'customer' | 'support'
  recipient_profile_id: string | null  // profile_id to notify on send
  my_display_name: string              // sender's name for the notification
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: STUDIO_TZ })
}

function dayLabel(iso: string) {
  const etDate = new Intl.DateTimeFormat('en-CA', { timeZone: STUDIO_TZ }).format(new Date(iso))
  const etToday = new Intl.DateTimeFormat('en-CA', { timeZone: STUDIO_TZ }).format(new Date())
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const etYesterday = new Intl.DateTimeFormat('en-CA', { timeZone: STUDIO_TZ }).format(yesterday)
  if (etDate === etToday) return 'Today'
  if (etDate === etYesterday) return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', timeZone: STUDIO_TZ })
}

function groupByDay(msgs: Message[]) {
  const groups: { label: string; messages: Message[] }[] = []
  let last = ''
  for (const m of msgs) {
    const label = dayLabel(m.created_at)
    if (label !== last) { groups.push({ label, messages: [] }); last = label }
    groups[groups.length - 1].messages.push(m)
  }
  return groups
}

function isImageType(type: string | null, url: string | null) {
  if (type === 'image') return true
  if (!url) return false
  return /\.(jpe?g|png|gif|webp|heic|heif)(\?|$)/i.test(url)
}

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [meta, setMeta] = useState<ConvoMeta | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attachPreview, setAttachPreview] = useState<{ file: File; url: string } | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Stable ref so the realtime callback always sees the current user id without re-subscribing
  const userRef = useRef<string | undefined>(user?.id)
  useEffect(() => { userRef.current = user?.id }, [user])

  useEffect(() => {
    if (!conversationId || !user) return
    loadConvo()
  }, [conversationId, user])

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return

    // Reload messages from DB — merges with any already in state so nothing is lost
    async function syncMessages() {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, body, attachment_url, attachment_type, created_at')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true })
      if (!data) return
      setMessages(prev => {
        const ids = new Set(data.map((m: Message) => m.id))
        const extra = prev.filter(m => !ids.has(m.id))
        return [...data as Message[], ...extra].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
    }

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          scrollBottom()
          // If the incoming message is from the other person, mark it read immediately
          // and clear the unread indicator on the conversation
          if (msg.sender_id !== userRef.current) {
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then(() => {})
            supabase.from('conversations').update({ last_sender_id: null }).eq('id', conversationId!).then(() => {})
          }
        }
      )
      .subscribe((status) => {
        // On every (re)connect, sync messages to catch anything missed during a disconnect
        if (status === 'SUBSCRIBED') syncMessages()
      })

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  // Scroll to bottom on new messages
  useEffect(() => { scrollBottom() }, [messages])

  function scrollBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  async function loadConvo() {
    if (!conversationId || !user) return
    setLoading(true)

    // Load conversation metadata
    const { data: convo } = await supabase
      .from('conversations')
      .select(`
        customer_id, artist_id,
        customer:profiles!conversations_customer_id_fkey(full_name, avatar_url, role),
        artist:artists(name, avatar_url, profile_id)
      `)
      .eq('id', conversationId)
      .single()

    if (!convo) { setLoading(false); return }

    const artistProfileId = (convo.artist as any)?.profile_id
    const iAmArtist = user.id === artistProfileId
    const customerName = (convo.customer as any)?.full_name ?? 'Customer'
    const artistName   = (convo.artist as any)?.name ?? 'Artist'
    const customerRole = (convo.customer as any)?.role as string | null

    // Detect if the OTHER party is the admin/support account.
    // Only flag as support when the admin is NOT the current user.
    const adminProfileId = await getAdminProfileId()
    const isAdminArtist   = !!artistProfileId && artistProfileId === adminProfileId && !iAmArtist
    const isAdminCustomer = !!adminProfileId && convo.customer_id === adminProfileId && iAmArtist
    const isSupport = isAdminArtist || isAdminCustomer

    // Determine what role the OTHER person has from this user's perspective
    let otherRole: ConvoMeta['other_role'] = 'customer'
    if (isSupport) {
      otherRole = 'support'
    } else if (iAmArtist) {
      otherRole = (customerRole === 'artist' || customerRole === 'manager') ? 'artist' : 'customer'
    } else {
      otherRole = 'artist'
    }

    const otherName = isSupport
      ? SUPPORT_DISPLAY_NAME
      : iAmArtist ? customerName : artistName

    const otherAvatar = isSupport
      ? SUPPORT_AVATAR
      : iAmArtist
        ? ((convo.customer as any)?.avatar_url ?? null)
        : ((convo.artist as any)?.avatar_url ?? null)

    setMeta({
      customer_id: convo.customer_id,
      artist_id: convo.artist_id,
      other_name: otherName,
      other_avatar: otherAvatar,
      other_role: otherRole,
      recipient_profile_id: iAmArtist ? convo.customer_id : (artistProfileId ?? null),
      my_display_name: iAmArtist ? artistName : customerName,
    })

    // Load messages — merge with any realtime messages that arrived during this async load
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, sender_id, body, attachment_url, attachment_type, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    const incoming = (msgs as Message[]) ?? []
    setMessages(prev => {
      if (prev.length === 0) return incoming
      const ids = new Set(incoming.map(m => m.id))
      const extra = prev.filter(m => !ids.has(m.id))
      return [...incoming, ...extra].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })

    // Mark all unread messages from the other person as read
    // AND clear the unread indicator on the conversation list
    await Promise.all([
      supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null),
      supabase
        .from('conversations')
        .update({ last_sender_id: null })
        .eq('id', conversationId)
        .not('last_sender_id', 'is', null)
        .neq('last_sender_id', user.id),
    ])

    setLoading(false)
  }

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  async function handleSend() {
    if (!user || !conversationId) return
    const body = text.trim()
    if (!body && !attachPreview) return

    setSending(true)
    let attachment_url: string | null = null
    let attachment_type: string | null = null

    if (attachPreview) {
      setUploading(true)
      const file = attachPreview.file
      const ext = file.name.split('.').pop()
      const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from('message-attachments')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (!uploadErr && uploaded) {
        const { data: urlData } = supabase.storage.from('message-attachments').getPublicUrl(uploaded.path)
        attachment_url = urlData.publicUrl
        attachment_type = file.type.startsWith('image/') ? 'image' : 'file'
      }
      setUploading(false)
    }

    const payload: Record<string, unknown> = {
      conversation_id: conversationId,
      sender_id: user.id,
      body: body || null,
      attachment_url,
      attachment_type,
    }

    const { data: inserted, error: sendErr } = await supabase
      .from('messages')
      .insert(payload)
      .select('id, sender_id, body, attachment_url, attachment_type, created_at')
      .single()

    if (sendErr) {
      setSending(false)
      return
    }

    if (inserted) {
      setMessages(prev => prev.some(m => m.id === (inserted as Message).id) ? prev : [...prev, inserted as Message])
    }

    // Notification is sent by the DB trigger trg_notify_recipient_on_message — no client insert needed.

    setText('')
    setAttachPreview(null)
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    setSending(false)
    scrollBottom()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAttachPreview({ file, url })
    e.target.value = ''
  }

  const groups = groupByDay(messages)

  if (loading) return (
    <div className="page chat-page">
      <div className="chat-page__loading">Loading…</div>
    </div>
  )

  if (!meta) return (
    <div className="page chat-page">
      <div className="chat-page__loading">Conversation not found.</div>
    </div>
  )

  return (
    <div className="page page--flush chat-page">
      {/* Header */}
      <div className="chat-page__header">
        <button className="chat-page__back" onClick={() => navigate('/messages')} aria-label="Back">
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <div className={`chat-page__header-avatar${meta.other_role === 'support' ? ' chat-page__header-avatar--support' : ''}`}>
          {meta.other_avatar
            ? <img src={meta.other_avatar} alt="" />
            : <span>{(meta.other_name[0] ?? '?').toUpperCase()}</span>
          }
        </div>
        <div className="chat-page__header-info">
          <span className="chat-page__header-name">{meta.other_name}</span>
          <RoleBadge role={meta.other_role} />
        </div>
      </div>

      {/* Messages */}
      <div className="chat-page__messages">
        {messages.length === 0 && (
          <div className="chat-page__empty">
            Send a message to start the conversation.
          </div>
        )}

        {groups.map(group => (
          <div key={group.label}>
            <div className="chat-page__day-label">{group.label}</div>
            {group.messages.map(m => {
              const mine = m.sender_id === user?.id
              return (
                <div key={m.id} className={`chat-bubble-row${mine ? ' chat-bubble-row--mine' : ''}`}>
                  <div className={`chat-bubble${mine ? ' chat-bubble--mine' : ' chat-bubble--theirs'}`}>
                    {m.attachment_url && isImageType(m.attachment_type, m.attachment_url) && (
                      <a href={m.attachment_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={m.attachment_url}
                          alt="attachment"
                          className="chat-bubble__img"
                          loading="lazy"
                        />
                      </a>
                    )}
                    {m.attachment_url && !isImageType(m.attachment_type, m.attachment_url) && (
                      <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="chat-bubble__file">
                        <FileText size={18} strokeWidth={1.5} />
                        <span>View attachment</span>
                      </a>
                    )}
                    {m.body && <p className="chat-bubble__text">{m.body}</p>}
                    <span className="chat-bubble__time">{timeLabel(m.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="chat-page__input-bar">
        {attachPreview && (
          <div className="chat-page__attach-preview">
            {attachPreview.file.type.startsWith('image/')
              ? <img src={attachPreview.url} alt="preview" />
              : (
                <div className="chat-page__attach-file">
                  <FileText size={20} />
                  <span>{attachPreview.file.name}</span>
                </div>
              )
            }
            <button className="chat-page__attach-remove" onClick={() => setAttachPreview(null)} aria-label="Remove">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="chat-page__input-row">
          <button
            type="button"
            className="chat-page__attach-btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
          >
            <Paperclip size={20} strokeWidth={1.5} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="chat-page__file-input"
            onChange={handleFileChange}
          />
          <textarea
            ref={textareaRef}
            className="chat-page__textarea"
            placeholder="Type a message…"
            value={text}
            rows={1}
            onChange={e => { setText(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="chat-page__send-btn"
            onClick={handleSend}
            disabled={sending || uploading || (!text.trim() && !attachPreview)}
            aria-label="Send"
          >
            <Send size={18} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
