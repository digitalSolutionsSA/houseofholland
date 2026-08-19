import { useEffect, useRef, useState } from 'react'
import { X, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SUPPORT_DISPLAY_NAME, SUPPORT_AVATAR, getAdminProfileId } from '../../lib/support'
import './SupportChatPopup.css'

type Message = {
  id: string
  sender_id: string
  body: string | null
  created_at: string
}

function timeLabel(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
}

type Props = {
  conversationId: string | undefined
  userId: string
  onClose: () => void
  onConversationCreated: (id: string) => void
}

export function SupportChatPopup({ conversationId, userId, onClose, onConversationCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [localConvoId, setLocalConvoId] = useState(conversationId)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync if parent passes a new conversationId
  useEffect(() => { setLocalConvoId(conversationId) }, [conversationId])

  // Load messages
  useEffect(() => {
    if (!localConvoId) return
    loadMessages(localConvoId)
    markRead(localConvoId)
  }, [localConvoId])

  // Realtime subscription
  useEffect(() => {
    if (!localConvoId) return
    const channel = supabase
      .channel(`support-popup:${localConvoId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${localConvoId}`,
      }, (payload) => {
        const msg = payload.new as Message
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [msg, ...prev])
        if (msg.sender_id !== userId) {
          supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then(() => {})
          supabase.from('conversations').update({ last_sender_id: null }).eq('id', localConvoId!).then(() => {})
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [localConvoId])

  async function loadMessages(convoId: string) {
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: false })
    setMessages((data as Message[]) ?? [])
  }

  async function markRead(convoId: string) {
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', convoId)
      .neq('sender_id', userId)
      .is('read_at', null)
    supabase.from('conversations').update({ last_sender_id: null }).eq('id', convoId).then(() => {})
  }

  async function handleSend() {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setText('')

    let convoId = localConvoId

    if (!convoId) {
      // Lazy-create conversation with HoH Support
      const adminId = await getAdminProfileId()
      if (!adminId) { setSending(false); return }
      const { data: adminArtist } = await supabase
        .from('artists').select('id').eq('profile_id', adminId).maybeSingle()
      if (!adminArtist) { setSending(false); return }

      const { data: existing } = await supabase
        .from('conversations').select('id')
        .eq('customer_id', userId).eq('artist_id', adminArtist.id).maybeSingle()

      if (existing) {
        convoId = existing.id
      } else {
        const { data: created } = await supabase
          .from('conversations')
          .insert({ customer_id: userId, artist_id: adminArtist.id })
          .select('id').single()
        if (created) convoId = created.id
      }

      if (convoId) {
        setLocalConvoId(convoId)
        onConversationCreated(convoId)
        loadMessages(convoId)
      }
    }

    if (!convoId) { setSending(false); return }

    await supabase.from('messages').insert({
      conversation_id: convoId,
      sender_id: userId,
      body,
    })

    setSending(false)
    textareaRef.current?.focus()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="support-popup__overlay" onClick={onClose}>
      <div className="support-popup" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="support-popup__header">
          <div className="support-popup__header-avatar">
            <img src={SUPPORT_AVATAR} alt="HoH Support" />
          </div>
          <div className="support-popup__header-info">
            <span className="support-popup__header-name">{SUPPORT_DISPLAY_NAME}</span>
            <span className="support-popup__header-sub">Support Chat</span>
          </div>
          <button className="support-popup__close" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Messages — column-reverse: newest at bottom, scrollTop=0 shows latest */}
        <div className="support-popup__messages">
          {messages.length === 0 && (
            <div className="support-popup__empty">
              Messages from HoH Support will appear here.
            </div>
          )}
          {messages.map(m => {
            const mine = m.sender_id === userId
            return (
              <div key={m.id} className={`support-popup__row${mine ? ' support-popup__row--mine' : ''}`}>
                <div className={`support-popup__bubble${mine ? ' support-popup__bubble--mine' : ' support-popup__bubble--theirs'}`}>
                  {m.body && <p className="support-popup__bubble-text">{m.body}</p>}
                  <span className="support-popup__bubble-time">{timeLabel(m.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Input */}
        <div className="support-popup__input-bar">
          <textarea
            ref={textareaRef}
            className="support-popup__input"
            placeholder="Type a message…"
            value={text}
            rows={1}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            className="support-popup__send"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            aria-label="Send"
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
