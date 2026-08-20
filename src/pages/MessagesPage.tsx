import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Trash2, Archive, ArchiveRestore, ChevronDown, ChevronUp, Radio, Zap, AlertCircle, RefreshCw, Tag, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getAdminProfileId, SUPPORT_DISPLAY_NAME, SUPPORT_AVATAR } from '../lib/support'
import { SupportChatPopup } from '../components/shared/SupportChatPopup'
import './MessagesPage.css'

type ConversationRow = {
  id: string
  last_message_at: string | null
  last_message_preview: string | null
  last_sender_id: string | null
  other_name: string
  other_avatar: string | null
  unread: boolean
  other_role: 'artist' | 'customer' | 'support'
  artist_archived_at: string | null
  artist_deleted_at: string | null
}

type BroadcastNotif = {
  id: string
  title: string
  body: string | null
  type: string
  created_at: string
  read_at: string | null
}

const BROADCAST_TYPES = ['general', 'flash', 'alert', 'update', 'sale']

const TYPE_ICON: Record<string, React.ReactNode> = {
  general: <Info size={14} strokeWidth={1.5} />,
  flash:   <Zap size={14} strokeWidth={2} />,
  alert:   <AlertCircle size={14} strokeWidth={1.5} />,
  update:  <RefreshCw size={14} strokeWidth={1.5} />,
  sale:    <Tag size={14} strokeWidth={1.5} />,
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


type CardProps = {
  c: ConversationRow
  isArtist: boolean
  onOpen: () => void
  onArchive?: () => void
  onDelete?: () => void
  onRestore?: () => void
  onUnarchive?: () => void
  showPurge?: boolean
}

function ConvoCard({ c, isArtist, onOpen, onArchive, onDelete, onRestore, onUnarchive }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  const initial = (c.other_name[0] ?? '?').toUpperCase()

  return (
    <div className="convo-circle-wrap">
      <button
        type="button"
        className={`convo-circle__btn${c.unread ? ' convo-circle__btn--unread' : ''}`}
        onClick={onOpen}
        aria-label={`Open chat with ${c.other_name}`}
      >
        <div className={`convo-circle__avatar convo-circle__avatar--${c.other_role}`}>
          {c.other_avatar
            ? <img src={c.other_avatar} alt="" />
            : <span>{initial}</span>
          }
        </div>
        {c.unread && <span className="convo-circle__unread-dot" />}
      </button>

      <p className="convo-circle__name">{c.other_name.split(' ')[0]}</p>
      <p className="convo-circle__time">{timeAgo(c.last_message_at)}</p>

      {isArtist && (
        <div className="messages-card-actions convo-circle__actions" ref={menuRef}>
          <button
            type="button"
            className="messages-card-actions__trigger"
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            aria-label="Options"
          >
            <span className="messages-card-actions__dots">•••</span>
          </button>
          {menuOpen && (
            <div className="messages-card-actions__menu">
              {c.artist_deleted_at ? (
                <button type="button" onClick={() => { setMenuOpen(false); onRestore?.() }}>
                  <ArchiveRestore size={14} strokeWidth={1.5} /> Restore
                </button>
              ) : c.artist_archived_at ? (
                <>
                  <button type="button" onClick={() => { setMenuOpen(false); onUnarchive?.() }}>
                    <ArchiveRestore size={14} strokeWidth={1.5} /> Unarchive
                  </button>
                  <button type="button" className="messages-card-actions__danger" onClick={() => { setMenuOpen(false); onDelete?.() }}>
                    <Trash2 size={14} strokeWidth={1.5} /> Delete
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => { setMenuOpen(false); onArchive?.() }}>
                    <Archive size={14} strokeWidth={1.5} /> Archive
                  </button>
                  <button type="button" className="messages-card-actions__danger" onClick={() => { setMenuOpen(false); onDelete?.() }}>
                    <Trash2 size={14} strokeWidth={1.5} /> Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CollapsibleSection({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  if (count === 0) return null
  return (
    <div className="messages-section">
      <button type="button" className="messages-section__toggle" onClick={() => setOpen(v => !v)}>
        <span>{label} ({count})</span>
        {open ? <ChevronUp size={16} strokeWidth={1.5} /> : <ChevronDown size={16} strokeWidth={1.5} />}
      </button>
      {open && <div className="convo-circles-grid convo-circles-grid--compact">{children}</div>}
    </div>
  )
}

// ── Broadcast channel card (replaces pinned support card) ─────────
const TYPE_LABEL: Record<string, string> = {
  general: 'General',
  flash:   'Flash',
  alert:   'Alert',
  update:  'Update',
  sale:    'Sale',
}

function BroadcastCard({ latest, unread, onClick }: { latest?: BroadcastNotif; unread?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`broadcast-card${unread ? ' broadcast-card--unread' : ''}`}
      onClick={onClick}
    >
      <div className="broadcast-card__icon">
        <Radio size={22} strokeWidth={1.5} />
      </div>
      <div className="broadcast-card__body">
        <div className="broadcast-card__top">
          <span className="broadcast-card__name">HoH Broadcast</span>
          {latest && <span className="broadcast-card__time">{timeAgo(latest.created_at)}</span>}
        </div>
        <div className="broadcast-card__meta">
          <span className="role-badge role-badge--support">Channel</span>
          {unread && <span className="broadcast-card__type-chip">New message</span>}
        </div>
      </div>
    </button>
  )
}

// ── Broadcast feed modal ──────────────────────────────────────────
function BroadcastModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [notifs, setNotifs] = useState<BroadcastNotif[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('notifications')
      .select('id, title, body, type, created_at, read_at')
      .eq('profile_id', userId)
      .in('type', BROADCAST_TYPES)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setNotifs((data as BroadcastNotif[]) ?? []); setLoading(false) })

    // Mark all broadcast notifications as read
    supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('profile_id', userId)
      .in('type', BROADCAST_TYPES)
      .is('read_at', null)
      .then(() => {})
  }, [userId])

  return (
    <div className="broadcast-chat__overlay">
      <div className="broadcast-chat">
        <div className="broadcast-chat__header">
          <button className="broadcast-chat__back" onClick={onClose} aria-label="Close">
            <ChevronDown size={22} strokeWidth={2} />
          </button>
          <div className="broadcast-chat__header-info">
            <div className="broadcast-chat__header-icon">
              <Radio size={18} strokeWidth={1.5} />
            </div>
            <div>
              <p className="broadcast-chat__header-name">HoH Broadcast</p>
              <p className="broadcast-chat__header-sub">Official announcements channel</p>
            </div>
          </div>
        </div>

        <div className="broadcast-chat__body">
          {loading && <p className="broadcast-chat__empty">Loading…</p>}
          {!loading && notifs.length === 0 && (
            <div className="broadcast-chat__empty">
              <Radio size={32} strokeWidth={1} style={{ opacity: 0.3 }} />
              <p>No broadcasts yet.</p>
            </div>
          )}
          {[...notifs].reverse().map(n => (
            <div key={n.id} className="broadcast-chat__bubble-wrap">
              <div className={`broadcast-chat__bubble broadcast-chat__bubble--${n.type}${!n.read_at ? ' broadcast-chat__bubble--unread' : ''}`}>
                <div className="broadcast-chat__bubble-type">
                  {TYPE_ICON[n.type] ?? <Info size={12} strokeWidth={1.5} />}
                  <span>{TYPE_LABEL[n.type] ?? n.type}</span>
                </div>
                <p className="broadcast-chat__bubble-title">{n.title}</p>
                {n.body && <p className="broadcast-chat__bubble-body">{n.body}</p>}
              </div>
              <p className="broadcast-chat__bubble-time">{timeAgo(n.created_at)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export function MessagesPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const isArtist = profile?.role === 'artist' || profile?.role === 'manager'

  const [convos, setConvos] = useState<ConversationRow[]>([])
  const [convosLoading, setConvosLoading] = useState(true)
  const [artistId, setArtistId] = useState<string | null>(null)
  const [adminProfileId, setAdminProfileId] = useState<string | null | undefined>(undefined)

  const [supportPopupOpen, setSupportPopupOpen] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [latestBroadcast, setLatestBroadcast] = useState<BroadcastNotif | undefined>(undefined)
  const [unreadBroadcast, setUnreadBroadcast] = useState(false)

  useEffect(() => {
    if (!user) return
    load(false)
  }, [user, isArtist])

  useEffect(() => {
    if (!user || !profile) return
    // Load latest broadcast for card preview + check for unread
    supabase
      .from('notifications')
      .select('id, title, body, type, created_at, read_at')
      .eq('profile_id', user.id)
      .in('type', BROADCAST_TYPES)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const rows = (data as BroadcastNotif[]) ?? []
        if (rows[0]) setLatestBroadcast(rows[0])
        setUnreadBroadcast(rows.some(n => !n.read_at))
      })
  }, [user, profile])

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
    if (!background) {
      // Show cached data immediately — feels instant on re-navigation
      const cached = sessionStorage.getItem(`hoh_convos_${user.id}`)
      if (cached) {
        try { setConvos(JSON.parse(cached)); setConvosLoading(false) } catch {}
      } else {
        setConvosLoading(true)
      }
    }

    const allRows: ConversationRow[] = []

    if (isArtist) {
      const { data: artistRecord } = await supabase
        .from('artists').select('id').eq('profile_id', user.id).maybeSingle()

      if (artistRecord) {
        setArtistId(artistRecord.id)
        const { data } = await supabase
          .from('conversations')
          .select('id, customer_id, last_message_at, last_message_preview, last_sender_id, artist_archived_at, artist_deleted_at, profiles!conversations_customer_id_fkey(full_name, avatar_url, role)')
          .eq('artist_id', artistRecord.id)
          .order('last_message_at', { ascending: false })

        const adminId = await getAdminProfileId()

        for (const c of data ?? []) {
          const customerRole = (c as any).profiles?.role as string | null
          const customerId   = (c as any).customer_id as string | null
          const isAdminCustomer = !!adminId && customerId === adminId
          allRows.push({
            id: (c as any).id,
            last_message_at: (c as any).last_message_at,
            last_message_preview: (c as any).last_message_preview,
            last_sender_id: (c as any).last_sender_id,
            other_name: isAdminCustomer ? SUPPORT_DISPLAY_NAME : ((c as any).profiles?.full_name ?? 'Customer'),
            other_avatar: isAdminCustomer ? SUPPORT_AVATAR : ((c as any).profiles?.avatar_url ?? null),
            unread: (c as any).last_sender_id !== null && (c as any).last_sender_id !== user.id,
            other_role: isAdminCustomer ? 'support' : (customerRole === 'artist' || customerRole === 'manager') ? 'artist' : 'customer',
            artist_archived_at: (c as any).artist_archived_at ?? null,
            artist_deleted_at: (c as any).artist_deleted_at ?? null,
          })
        }
      }
    }

    const adminId = await getAdminProfileId()
    setAdminProfileId(adminId)

    const { data: customerData } = await supabase
      .from('conversations')
      .select('id, last_message_at, last_message_preview, last_sender_id, artist_archived_at, artist_deleted_at, artists(name, avatar_url, profile_id)')
      .eq('customer_id', user.id)
      .order('last_message_at', { ascending: false })

    for (const c of customerData ?? []) {
      if (allRows.some(r => r.id === (c as any).id)) continue
      const artistProfileId = (c as any).artists?.profile_id ?? null
      const isSupport = !!adminId && artistProfileId === adminId
      allRows.push({
        id: (c as any).id,
        last_message_at: (c as any).last_message_at,
        last_message_preview: (c as any).last_message_preview,
        last_sender_id: (c as any).last_sender_id,
        other_name: isSupport ? SUPPORT_DISPLAY_NAME : ((c as any).artists?.name ?? 'Artist'),
        other_avatar: isSupport ? SUPPORT_AVATAR : ((c as any).artists?.avatar_url ?? null),
        unread: (c as any).last_sender_id !== null && (c as any).last_sender_id !== user.id,
        other_role: isSupport ? 'support' : 'artist',
        artist_archived_at: (c as any).artist_archived_at ?? null,
        artist_deleted_at: (c as any).artist_deleted_at ?? null,
      })
    }

    allRows.sort((a, b) => {
      if (!a.last_message_at) return 1
      if (!b.last_message_at) return -1
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    })

    sessionStorage.setItem(`hoh_convos_${user.id}`, JSON.stringify(allRows))
    setConvos(allRows)
    setConvosLoading(false)
  }

  async function setField(convoId: string, field: 'artist_archived_at' | 'artist_deleted_at', value: string | null) {
    await supabase.from('conversations').update({ [field]: value }).eq('id', convoId)
    setConvos(prev => prev.map(c => c.id === convoId ? { ...c, [field]: value } : c))
  }

  async function archiveConvo(id: string) {
    await setField(id, 'artist_archived_at', new Date().toISOString())
    await setField(id, 'artist_deleted_at', null)
  }

  async function deleteConvo(id: string) {
    await setField(id, 'artist_deleted_at', new Date().toISOString())
    await setField(id, 'artist_archived_at', null)
  }

  async function restoreConvo(id: string) {
    await setField(id, 'artist_deleted_at', null)
    await setField(id, 'artist_archived_at', null)
  }

  async function unarchiveConvo(id: string) {
    await setField(id, 'artist_archived_at', null)
  }

  const THIRTY_DAYS = 30 * 24 * 3600 * 1000
  const allActive  = convos.filter(c => !c.artist_archived_at && !c.artist_deleted_at)
  const isCurrentUserAdmin = !!user && adminProfileId !== undefined && adminProfileId === user.id
  const supportConvo = isCurrentUserAdmin ? undefined : allActive.find(c => c.other_role === 'support')
  const active   = allActive.filter(c => c.other_role !== 'support' || isCurrentUserAdmin)
  const archived = convos.filter(c => !!c.artist_archived_at && !c.artist_deleted_at)
  const deleted  = convos.filter(c =>
    !!c.artist_deleted_at &&
    (Date.now() - new Date(c.artist_deleted_at).getTime()) < THIRTY_DAYS
  )

  const supportUnread = !!supportConvo?.unread

  function renderCard(c: ConversationRow) {
    const isDeleted = !!c.artist_deleted_at
    return (
      <ConvoCard
        key={c.id}
        c={c}
        isArtist={isArtist}
        onOpen={() => navigate(`/messages/${c.id}`)}
        onArchive={() => archiveConvo(c.id)}
        onDelete={() => deleteConvo(c.id)}
        onRestore={() => restoreConvo(c.id)}
        onUnarchive={() => unarchiveConvo(c.id)}
        showPurge={isDeleted}
      />
    )
  }

  const hasAny = convos.length > 0
  const showPinnedArea = adminProfileId !== undefined

  return (
    <div className="page messages-page">
      <div className="messages-page__header">
        <h1 className="messages-page__title">Messages</h1>
      </div>

      {/* Broadcast channel card (pinned at top for all users) */}
      {showPinnedArea && (
        <BroadcastCard
          latest={latestBroadcast}
          unread={unreadBroadcast}
          onClick={() => { setBroadcastOpen(true); setUnreadBroadcast(false) }}
        />
      )}

      {convosLoading ? (
        <div className="convo-circles-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="convo-circle-wrap">
              <div className="convo-circle__skeleton" />
              <div className="convo-circle__skeleton-name" />
            </div>
          ))}
        </div>
      ) : !hasAny && !showPinnedArea ? (
        <div className="messages-page__empty">
          <MessageCircle size={40} strokeWidth={1} />
          <p>No conversations yet.</p>
          {!isArtist && <p className="messages-page__empty-sub">Visit an artist profile and tap <strong>Message</strong> to start a chat.</p>}
        </div>
      ) : (
        <>
          {active.length === 0 && archived.length === 0 && deleted.length === 0 && hasAny && (
            <div className="messages-page__empty">
              <MessageCircle size={40} strokeWidth={1} />
              <p>No active conversations.</p>
            </div>
          )}

          {active.length > 0 && (
            <div className="convo-circles-grid">
              {active.map(renderCard)}
            </div>
          )}

          {isArtist && (
            <>
              <CollapsibleSection label="Archived" count={archived.length}>
                {archived.map(renderCard)}
              </CollapsibleSection>

              <CollapsibleSection label="Deleted" count={deleted.length}>
                <p className="messages-section__note">
                  Deleted conversations are permanently removed after 30 days.
                </p>
                {deleted.map(renderCard)}
              </CollapsibleSection>
            </>
          )}
        </>
      )}

      {/* HoH Support FAB — shown for all users */}
      {showPinnedArea && (
        <button
          type="button"
          className={`support-fab${supportUnread ? ' support-fab--unread' : ''}`}
          onClick={() => setSupportPopupOpen(true)}
          aria-label="Open HoH Support chat"
        >
          <img src="/Graphics/SUPPORT_ICON.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
          {supportUnread && <span className="support-fab__badge" aria-label="Unread messages" />}
        </button>
      )}

      {/* Support chat popup */}
      {supportPopupOpen && user && (
        <SupportChatPopup
          conversationId={supportConvo?.id}
          userId={user.id}
          onClose={() => {
            setSupportPopupOpen(false)
            // Refresh list so unread badge clears
            load(true)
          }}
          onConversationCreated={() => load(true)}
        />
      )}

      {/* Broadcast modal */}
      {broadcastOpen && user && (
        <BroadcastModal userId={user.id} onClose={() => setBroadcastOpen(false)} />
      )}
    </div>
  )
}
