import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './MessagesPage.css'

type ConversationRow = {
  id: string
  last_message_at: string | null
  last_message_preview: string | null
  last_sender_id: string | null
  other_name: string
  other_avatar: string | null
  unread: boolean
}

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export function MessagesPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const isArtist = profile?.role === 'artist' || profile?.role === 'manager'

  const [convos, setConvos] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)
  // Stored so realtime subscriptions can filter to this artist's conversations
  const [artistId, setArtistId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    load(false)
  }, [user, isArtist])

  // Set up realtime subscription once we know the artistId (for artists)
  // or immediately for customers
  useEffect(() => {
    if (!user) return
    if (isArtist && artistId === null) return

    const filter = isArtist
      ? `artist_id=eq.${artistId}`
      : `customer_id=eq.${user.id}`

    const channel = supabase
      .channel(`conversations-list-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations', filter }, () => load(true))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter }, () => load(true))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, isArtist, artistId])

  async function load(background = false) {
    if (!user) return
    if (!background) setLoading(true)

    if (isArtist) {
      // Artist: find their linked artist record first
      const { data: artistRecord } = await supabase
        .from('artists')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle()

      if (!artistRecord) { if (!background) setLoading(false); return }

      // Store artistId so the subscription effect can use it
      setArtistId(artistRecord.id)

      const { data } = await supabase
        .from('conversations')
        .select('id, last_message_at, last_message_preview, last_sender_id, profiles!conversations_customer_id_fkey(full_name, avatar_url)')
        .eq('artist_id', artistRecord.id)
        .order('last_message_at', { ascending: false })

      const rows: ConversationRow[] = (data ?? []).map((c: any) => ({
        id: c.id,
        last_message_at: c.last_message_at,
        last_message_preview: c.last_message_preview,
        last_sender_id: c.last_sender_id,
        other_name: c.profiles?.full_name ?? 'Customer',
        other_avatar: c.profiles?.avatar_url ?? null,
        unread: c.last_sender_id !== null && c.last_sender_id !== user.id,
      }))
      setConvos(rows)
    } else {
      const { data } = await supabase
        .from('conversations')
        .select('id, last_message_at, last_message_preview, last_sender_id, artists(name, avatar_url)')
        .eq('customer_id', user.id)
        .order('last_message_at', { ascending: false })

      const rows: ConversationRow[] = (data ?? []).map((c: any) => ({
        id: c.id,
        last_message_at: c.last_message_at,
        last_message_preview: c.last_message_preview,
        last_sender_id: c.last_sender_id,
        other_name: c.artists?.name ?? 'Artist',
        other_avatar: c.artists?.avatar_url ?? null,
        unread: c.last_sender_id !== null && c.last_sender_id !== user.id,
      }))
      setConvos(rows)
    }

    if (!background) setLoading(false)
  }

  if (loading) return (
    <div className="page messages-page">
      <div className="messages-page__loading">Loading…</div>
    </div>
  )

  return (
    <div className="page messages-page">
      <div className="messages-page__header">
        <h1 className="messages-page__title">Messages</h1>
      </div>

      {convos.length === 0 ? (
        <div className="messages-page__empty">
          <MessageCircle size={40} strokeWidth={1} />
          <p>No conversations yet.</p>
          {!isArtist && <p className="messages-page__empty-sub">Visit an artist profile and tap <strong>Message</strong> to start a chat.</p>}
        </div>
      ) : (
        <div className="messages-page__list">
          {convos.map(c => (
            <button
              key={c.id}
              type="button"
              className={`messages-convo-card${c.unread ? ' messages-convo-card--unread' : ''}`}
              onClick={() => navigate(`/messages/${c.id}`)}
            >
              <div className="messages-convo-card__avatar">
                {c.other_avatar
                  ? <img src={c.other_avatar} alt="" />
                  : <span>{(c.other_name[0] ?? '?').toUpperCase()}</span>
                }
                {c.unread && <span className="messages-convo-card__badge" aria-label="Unread" />}
              </div>
              <div className="messages-convo-card__body">
                <div className="messages-convo-card__top">
                  <span className="messages-convo-card__name">{c.other_name}</span>
                  <span className="messages-convo-card__time">{timeAgo(c.last_message_at)}</span>
                </div>
                <p className="messages-convo-card__preview">
                  {c.last_message_preview ?? 'Say hello!'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
