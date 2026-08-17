import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Trash2, Archive, ArchiveRestore, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getAdminProfileId, SUPPORT_DISPLAY_NAME, SUPPORT_AVATAR } from '../lib/support'
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
  // archive / delete (artist-side only)
  artist_archived_at: string | null
  artist_deleted_at: string | null
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

function daysUntilPurge(deletedAt: string) {
  const msLeft = new Date(deletedAt).getTime() + 30 * 24 * 3600 * 1000 - Date.now()
  return Math.max(0, Math.ceil(msLeft / (24 * 3600 * 1000)))
}

// ── Role badge ────────────────────────────────────────────────────
function RoleBadge({ role }: { role: ConversationRow['other_role'] }) {
  const label = role === 'artist' ? 'Artist' : role === 'support' ? 'Support' : 'Customer'
  return <span className={`role-badge role-badge--${role}`}>{label}</span>
}

// ── Swipe-action card ─────────────────────────────────────────────
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

function ConvoCard({ c, isArtist, onOpen, onArchive, onDelete, onRestore, onUnarchive, showPurge }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  return (
    <div className={`messages-convo-card-wrap${c.unread ? ' messages-convo-card-wrap--unread' : ''}`}>
      <button
        type="button"
        className={`messages-convo-card${c.unread ? ' messages-convo-card--unread' : ''}`}
        onClick={onOpen}
      >
        <div className={`messages-convo-card__avatar${c.other_role === 'support' ? ' messages-convo-card__avatar--support' : ''}`}>
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
          <div className="messages-convo-card__meta">
            <RoleBadge role={c.other_role} />
            {showPurge && c.artist_deleted_at && (
              <span className="messages-convo-card__purge">
                Deleted — {daysUntilPurge(c.artist_deleted_at)}d left
              </span>
            )}
          </div>
          <p className="messages-convo-card__preview">
            {c.last_message_preview ?? 'Say hello!'}
          </p>
        </div>
      </button>

      {/* Artist-only action menu */}
      {isArtist && (
        <div className="messages-card-actions" ref={menuRef}>
          <button
            type="button"
            className="messages-card-actions__trigger"
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            aria-label="Conversation options"
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

// ── Collapsible section ───────────────────────────────────────────
function CollapsibleSection({
  label, count, children,
}: { label: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  if (count === 0) return null
  return (
    <div className="messages-section">
      <button type="button" className="messages-section__toggle" onClick={() => setOpen(v => !v)}>
        <span>{label} ({count})</span>
        {open ? <ChevronUp size={16} strokeWidth={1.5} /> : <ChevronDown size={16} strokeWidth={1.5} />}
      </button>
      {open && <div className="messages-section__list">{children}</div>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export function MessagesPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const isArtist = profile?.role === 'artist' || profile?.role === 'manager'

  const [convos, setConvos] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [artistId, setArtistId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    load(false)
  }, [user, isArtist])

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

    const allRows: ConversationRow[] = []

    if (isArtist) {
      const { data: artistRecord } = await supabase
        .from('artists')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle()

      if (artistRecord) {
        setArtistId(artistRecord.id)

        const { data } = await supabase
          .from('conversations')
          .select('id, last_message_at, last_message_preview, last_sender_id, artist_archived_at, artist_deleted_at, profiles!conversations_customer_id_fkey(full_name, avatar_url, role)')
          .eq('artist_id', artistRecord.id)
          .order('last_message_at', { ascending: false })

        for (const c of data ?? []) {
          const customerRole = (c as any).profiles?.role as string | null
          allRows.push({
            id: (c as any).id,
            last_message_at: (c as any).last_message_at,
            last_message_preview: (c as any).last_message_preview,
            last_sender_id: (c as any).last_sender_id,
            other_name: (c as any).profiles?.full_name ?? 'Customer',
            other_avatar: (c as any).profiles?.avatar_url ?? null,
            unread: (c as any).last_sender_id !== null && (c as any).last_sender_id !== user.id,
            other_role: (customerRole === 'artist' || customerRole === 'manager') ? 'artist' : 'customer',
            artist_archived_at: (c as any).artist_archived_at ?? null,
            artist_deleted_at: (c as any).artist_deleted_at ?? null,
          })
        }
      }
    }

    // Customer-side: conversations where user is the customer
    const adminProfileId = await getAdminProfileId()

    const { data: customerData } = await supabase
      .from('conversations')
      .select('id, last_message_at, last_message_preview, last_sender_id, artist_archived_at, artist_deleted_at, artists(name, avatar_url, profile_id)')
      .eq('customer_id', user.id)
      .order('last_message_at', { ascending: false })

    for (const c of customerData ?? []) {
      if (allRows.some(r => r.id === (c as any).id)) continue
      const artistProfileId = (c as any).artists?.profile_id ?? null
      const isSupport = !!adminProfileId && artistProfileId === adminProfileId
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

    setConvos(allRows)
    if (!background) setLoading(false)
  }

  async function setField(convoId: string, field: 'artist_archived_at' | 'artist_deleted_at', value: string | null) {
    await supabase.from('conversations').update({ [field]: value }).eq('id', convoId)
    setConvos(prev => prev.map(c => c.id === convoId ? { ...c, [field]: value } : c))
  }

  async function archiveConvo(id: string) {
    await setField(id, 'artist_archived_at', new Date().toISOString())
    // Undelete if it was deleted
    await setField(id, 'artist_deleted_at', null)
  }

  async function deleteConvo(id: string) {
    await setField(id, 'artist_deleted_at', new Date().toISOString())
    // Unarchive if it was archived
    await setField(id, 'artist_archived_at', null)
  }

  async function restoreConvo(id: string) {
    await setField(id, 'artist_deleted_at', null)
    await setField(id, 'artist_archived_at', null)
  }

  async function unarchiveConvo(id: string) {
    await setField(id, 'artist_archived_at', null)
  }

  // Partition conversations into three buckets
  const THIRTY_DAYS = 30 * 24 * 3600 * 1000
  const active   = convos.filter(c => !c.artist_archived_at && !c.artist_deleted_at)
  const archived = convos.filter(c => !!c.artist_archived_at && !c.artist_deleted_at)
  const deleted  = convos.filter(c =>
    !!c.artist_deleted_at &&
    (Date.now() - new Date(c.artist_deleted_at).getTime()) < THIRTY_DAYS
  )

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

  if (loading) return (
    <div className="page messages-page">
      <div className="messages-page__loading">Loading…</div>
    </div>
  )

  const hasAny = convos.length > 0

  return (
    <div className="page messages-page">
      <div className="messages-page__header">
        <h1 className="messages-page__title">Messages</h1>
      </div>

      {!hasAny ? (
        <div className="messages-page__empty">
          <MessageCircle size={40} strokeWidth={1} />
          <p>No conversations yet.</p>
          {!isArtist && <p className="messages-page__empty-sub">Visit an artist profile and tap <strong>Message</strong> to start a chat.</p>}
        </div>
      ) : (
        <>
          {active.length === 0 && archived.length === 0 && deleted.length === 0 && (
            <div className="messages-page__empty">
              <MessageCircle size={40} strokeWidth={1} />
              <p>No active conversations.</p>
            </div>
          )}

          <div className="messages-page__list">
            {active.map(renderCard)}
          </div>

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
    </div>
  )
}
