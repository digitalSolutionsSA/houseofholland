import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, MessageCircle, ShieldAlert, Search, ChevronDown, ChevronUp,
  X, Flag, Trash2, AlertTriangle, UserCheck,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { MembershipPlan } from '../../lib/supabase'

const SUPABASE_FUNCTIONS_URL = 'https://tgaxteclhzmzfsvaulzr.supabase.co/functions/v1'
const COLLAPSE_KEY = 'customers_section_collapsed'

type Customer = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  membership_plan: MembershipPlan
  created_at: string
  referred_by_code: string | null
  artist_name?: string | null       // referral artist
  preferred_artist?: string | null  // most-booked artist (admin only)
}

const FLAG_TYPES = [
  { value: 'cancellation', label: 'Last-minute cancellation', color: '#f87171' },
  { value: 'no_show',      label: 'No-show',                  color: '#fbbf24' },
  { value: 'behaviour',    label: 'Inappropriate behaviour',   color: '#f97316' },
  { value: 'payment',      label: 'Payment issues',            color: '#a78bfa' },
  { value: 'other',        label: 'Other issue',               color: '#94a3b8' },
] as const

const PLAN_COLORS: Record<MembershipPlan, string> = {
  free:         'var(--text-muted)',
  premium:      '#8ab4a0',
  'black-card': 'var(--gold)',
}

const PLAN_LABELS: Record<MembershipPlan, string> = {
  free:         'Free',
  premium:      'Premium',
  'black-card': 'Black Card',
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function joinedLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days < 1)  return 'Today'
  if (days < 7)  return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30.4375)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

const PREVIEW_LIMIT = 5

export function MyCustomersSection() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()

  const isAdmin = !!profile?.is_super_admin
  const sectionRef = useRef<HTMLElement>(null)

  const [collapsed, setCollapsed]     = useState(() => localStorage.getItem(COLLAPSE_KEY) === 'true')
  const [artistId, setArtistId]       = useState<string | null>(null)
  const [customers, setCustomers]     = useState<Customer[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [showAll, setShowAll]         = useState(false)
  const [openingChat, setOpeningChat] = useState<string | null>(null)

  // Flag modal
  const [flagTarget, setFlagTarget]   = useState<Customer | null>(null)
  const [flagType, setFlagType]       = useState('')
  const [flagComment, setFlagComment] = useState('')
  const [flagSaving, setFlagSaving]   = useState(false)
  const [flagSuccess, setFlagSuccess] = useState(false)

  // Delete modal
  const [deleteTarget, setDeleteTarget]         = useState<Customer | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting]                 = useState(false)
  const [deleteError, setDeleteError]           = useState<string | null>(null)

  function toggleCollapsed() {
    setCollapsed(v => {
      const next = !v
      localStorage.setItem(COLLAPSE_KEY, String(next))
      // On mobile WebView, collapsing shrinks page height and can lock scroll.
      // Scroll the section header into view after the DOM updates.
      if (next) {
        requestAnimationFrame(() => {
          const section = sectionRef.current
          if (!section) return
          let parent = section.parentElement
          while (parent) {
            const { overflowY } = window.getComputedStyle(parent)
            if (overflowY === 'auto' || overflowY === 'scroll') {
              const targetTop = section.offsetTop - parent.clientHeight + section.clientHeight + 32
              parent.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
              break
            }
            parent = parent.parentElement
          }
        })
      }
      return next
    })
  }

  useEffect(() => {
    if (!profile?.id) return
    isAdmin ? loadAllCustomers() : loadReferredCustomers()
  }, [profile?.id, isAdmin])

  async function loadAllCustomers() {
    // 1. code → referral artist name
    const { data: artists } = await supabase
      .from('artists')
      .select('id, referral_code, name')

    const codeToName: Record<string, string> = {}
    const idToName: Record<string, string> = {}
    for (const a of artists ?? []) {
      idToName[a.id] = a.name
      if (a.referral_code) codeToName[a.referral_code] = a.name
    }

    // 2. all public profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, membership_plan, created_at, referred_by_code')
      .eq('role', 'public')
      .order('created_at', { ascending: false })

    const profileIds = (profiles ?? []).map((p: any) => p.id)

    // 3. most-booked artist per customer from bookings
    const preferredMap: Record<string, string> = {}
    if (profileIds.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('profile_id, artist_id')
        .in('profile_id', profileIds)
        .in('status', ['completed', 'confirmed', 'accepted'])

      // tally artist_id per customer
      const tally: Record<string, Record<string, number>> = {}
      for (const b of bookings ?? []) {
        if (!b.profile_id || !b.artist_id) continue
        tally[b.profile_id] ??= {}
        tally[b.profile_id][b.artist_id] = (tally[b.profile_id][b.artist_id] ?? 0) + 1
      }
      for (const [pid, counts] of Object.entries(tally)) {
        const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
        if (topId && idToName[topId]) preferredMap[pid] = idToName[topId]
      }
    }

    const rows = (profiles ?? []).map((p: any) => ({
      ...p,
      membership_plan: p.membership_plan ?? 'free',
      artist_name: p.referred_by_code ? (codeToName[p.referred_by_code] ?? null) : null,
      preferred_artist: preferredMap[p.id] ?? null,
    })) as Customer[]

    setCustomers(rows)
    setLoading(false)
  }

  async function loadReferredCustomers() {
    const { data: artist } = await supabase
      .from('artists')
      .select('id, referral_code')
      .eq('profile_id', profile!.id)
      .maybeSingle()

    if (!artist?.referral_code) { setLoading(false); return }
    setArtistId(artist.id)

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, membership_plan, created_at, referred_by_code')
      .eq('referred_by_code', artist.referral_code)
      .order('created_at', { ascending: false })

    setCustomers((data ?? []).map((p: any) => ({
      ...p,
      membership_plan: p.membership_plan ?? 'free',
    })) as Customer[])
    setLoading(false)
  }

  async function openChat(customer: Customer) {
    if (!user?.id) return
    let aid = artistId
    if (isAdmin && !aid) {
      const { data: a } = await supabase.from('artists').select('id').eq('profile_id', user.id).maybeSingle()
      aid = a?.id ?? null
      if (aid) setArtistId(aid)
    }
    if (!aid) return

    setOpeningChat(customer.id)
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('artist_id', aid)
      .eq('customer_id', customer.id)
      .maybeSingle()

    if (existing?.id) { navigate(`/messages/${existing.id}`); return }

    const { data: created } = await supabase
      .from('conversations')
      .insert({ artist_id: aid, customer_id: customer.id })
      .select('id')
      .single()

    if (created?.id) navigate(`/messages/${created.id}`)
    setOpeningChat(null)
  }

  async function submitFlag() {
    if (!flagTarget || !flagType) return
    let aid = artistId
    if (!aid) {
      const { data: a } = await supabase.from('artists').select('id').eq('profile_id', profile!.id).maybeSingle()
      aid = a?.id ?? null
      if (aid) setArtistId(aid)
    }
    if (!aid) return

    setFlagSaving(true)
    await supabase.from('customer_flags').insert({
      customer_profile_id: flagTarget.id,
      artist_id: aid,
      flag_type: flagType,
      comment: flagComment.trim() || null,
    })
    setFlagSaving(false)
    setFlagSuccess(true)
    setTimeout(() => {
      setFlagTarget(null); setFlagType(''); setFlagComment(''); setFlagSuccess(false)
    }, 1600)
  }

  async function deleteCustomer() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setDeleting(false); return }

    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/delete-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ user_id: deleteTarget.id }),
    })

    const json = await res.json()
    if (!res.ok) { setDeleteError(json.error ?? 'Deletion failed'); setDeleting(false); return }

    setCustomers(prev => prev.filter(c => c.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleteConfirmText('')
    setDeleting(false)
  }

  if (loading) return null
  if (!isAdmin && customers.length === 0) return null

  const filtered = search.trim()
    ? customers.filter(c => {
        const q = search.toLowerCase()
        return (
          (c.full_name ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q) ||
          (c.artist_name ?? '').toLowerCase().includes(q) ||
          (c.preferred_artist ?? '').toLowerCase().includes(q)
        )
      })
    : customers

  const displayed = showAll ? filtered : filtered.slice(0, PREVIEW_LIMIT)
  const title = isAdmin ? `All Customers (${customers.length})` : `My Customers (${customers.length})`

  return (
    <section ref={sectionRef} className="artist-home__section">

      {/* Collapsible header */}
      <button
        onClick={toggleCollapsed}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: collapsed ? 0 : 10 }}
      >
        <h2 className="artist-home__section-title" style={{ margin: 0, pointerEvents: 'none' }}>
          <Users size={14} strokeWidth={2} /> {title}
        </h2>
        {collapsed
          ? <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          : <ChevronUp   size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
      </button>

      {!collapsed && (
        <>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.85rem', flex: 1, minWidth: 0 }}
              placeholder={isAdmin ? 'Search by name, email or artist…' : 'Search customers…'}
              value={search}
              onChange={e => { setSearch(e.target.value); setShowAll(true) }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setShowAll(false) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1, padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.83rem', padding: '16px 0' }}>
              {search ? 'No customers match your search.' : 'No customers yet.'}
            </p>
          )}

          {/* Customer list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {displayed.map(c => {
              // For admin: preferred_artist takes priority, fall back to referral artist
              const artistLabel = isAdmin ? (c.preferred_artist ?? c.artist_name) : null
              const isPreferred = isAdmin && !!c.preferred_artist
              const isReferralOnly = isAdmin && !c.preferred_artist && !!c.artist_name

              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>

                  {/* Avatar */}
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-gold)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(var(--accent-rgb),0.12)', border: '1px solid rgba(var(--accent-rgb),0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.73rem', fontWeight: 700, color: 'var(--gold)' }}>
                      {initials(c.full_name)}
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.full_name ?? 'Unknown'}
                    </div>
                    {c.email && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.email}
                      </div>
                    )}

                    {/* Artist tag — admin only, prominent */}
                    {isAdmin && artistLabel && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '3px 8px', borderRadius: 20, background: isPreferred ? 'rgba(138,180,160,0.12)' : 'rgba(212,175,55,0.07)', border: `1px solid ${isPreferred ? 'rgba(138,180,160,0.4)' : 'rgba(212,175,55,0.25)'}` }}>
                        <UserCheck size={11} strokeWidth={2} style={{ color: isPreferred ? '#8ab4a0' : 'var(--gold)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isPreferred ? '#8ab4a0' : 'var(--gold)', whiteSpace: 'nowrap' }}>
                          {artistLabel}
                        </span>
                        {isReferralOnly && (
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginLeft: 2 }}>(referral)</span>
                        )}
                      </div>
                    )}
                    {isAdmin && !artistLabel && (
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', marginTop: 4 }}>No artist assigned</div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.63rem', fontWeight: 700, color: PLAN_COLORS[c.membership_plan], background: `${PLAN_COLORS[c.membership_plan]}18`, border: `1px solid ${PLAN_COLORS[c.membership_plan]}40`, padding: '1px 6px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                        {PLAN_LABELS[c.membership_plan]}
                      </span>
                      <span style={{ fontSize: '0.63rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{joinedLabel(c.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => openChat(c)}
                      disabled={openingChat === c.id}
                      title="Message this customer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, background: 'rgba(var(--accent-rgb),0.12)', border: '1px solid rgba(var(--accent-rgb),0.35)', color: openingChat === c.id ? 'var(--text-dim)' : 'var(--gold)', cursor: openingChat === c.id ? 'default' : 'pointer' }}
                    >
                      <MessageCircle size={15} strokeWidth={1.8} />
                    </button>
                    <button
                      onClick={() => { setFlagTarget(c); setFlagType(''); setFlagComment(''); setFlagSuccess(false) }}
                      title="Flag this customer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.30)', color: '#f87171', cursor: 'pointer' }}
                    >
                      <Flag size={14} strokeWidth={1.8} />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setDeleteTarget(c); setDeleteConfirmText(''); setDeleteError(null) }}
                        title="Delete customer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Show more / less */}
          {!search && filtered.length > PREVIEW_LIMIT && (
            <button
              onClick={() => setShowAll(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: '0.78rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              {showAll
                ? <><ChevronUp size={13} /> Show less</>
                : <><ChevronDown size={13} /> Show all {filtered.length} customers</>}
            </button>
          )}
        </>
      )}

      {/* ── Flag modal ── */}
      {flagTarget && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && !flagSuccess && setFlagTarget(null)} style={{ zIndex: 9999 }}>
          <div className="admin-modal" style={{ maxWidth: 420 }}>
            {flagSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <ShieldAlert size={36} style={{ color: '#f87171', marginBottom: 12 }} />
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text)', marginBottom: 8 }}>Flag submitted</h2>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  All artists will see a warning when they receive a booking from this customer.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <ShieldAlert size={20} color="#f87171" />
                  <h2 className="admin-modal__title" style={{ margin: 0, color: '#f87171' }}>Flag Customer</h2>
                </div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  {flagTarget.full_name ?? 'This customer'}
                </p>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: 18, lineHeight: 1.5 }}>
                  This flag will appear as a red warning on any artist's booking request from this customer.
                </p>
                <div className="admin-modal__field">
                  <label className="admin-modal__label">Reason *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {FLAG_TYPES.map(ft => (
                      <label key={ft.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${flagType === ft.value ? ft.color : 'var(--border-subtle)'}`, background: flagType === ft.value ? `${ft.color}12` : 'transparent', cursor: 'pointer' }}>
                        <input type="radio" name="flag_type" checked={flagType === ft.value} onChange={() => setFlagType(ft.value)} style={{ accentColor: ft.color }} />
                        <span style={{ fontSize: '0.85rem', color: flagType === ft.value ? ft.color : 'var(--text)', fontWeight: flagType === ft.value ? 600 : 400 }}>{ft.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="admin-modal__field" style={{ marginTop: 12 }}>
                  <label className="admin-modal__label">Notes (optional)</label>
                  <textarea className="admin-modal__textarea" value={flagComment} onChange={e => setFlagComment(e.target.value)} placeholder="e.g. Cancelled 1 hour before with no explanation…" rows={3} />
                </div>
                <div className="admin-modal__actions" style={{ marginTop: 16 }}>
                  <button className="admin-btn admin-btn--ghost" onClick={() => setFlagTarget(null)}>Cancel</button>
                  <button className="admin-btn admin-btn--danger" onClick={submitFlag} disabled={flagSaving || !flagType}>
                    {flagSaving ? 'Saving…' : <><Flag size={13} style={{ display: 'inline', marginRight: 5 }} />Submit Flag</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && !deleting && setDeleteTarget(null)} style={{ zIndex: 9999 }}>
          <div className="admin-modal" style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <AlertTriangle size={20} color="#ef4444" />
              <h2 className="admin-modal__title" style={{ margin: 0, color: '#ef4444' }}>Delete Customer</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: 6, fontWeight: 600 }}>
              {deleteTarget.full_name ?? 'This customer'}
            </p>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: 18, lineHeight: 1.6 }}>
              This will permanently remove this user from the database, including their profile, bookings, and all associated data. <strong style={{ color: '#ef4444' }}>This cannot be undone.</strong>
            </p>
            <div className="admin-modal__field">
              <label className="admin-modal__label">Type <strong>DELETE</strong> to confirm</label>
              <input className="admin-modal__input" type="text" value={deleteConfirmText} onChange={e => { setDeleteConfirmText(e.target.value); setDeleteError(null) }} placeholder="DELETE" autoComplete="off" />
            </div>
            {deleteError && <p style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 8 }}>{deleteError}</p>}
            <div className="admin-modal__actions" style={{ marginTop: 16 }}>
              <button className="admin-btn admin-btn--ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="admin-btn admin-btn--danger" onClick={deleteCustomer} disabled={deleting || deleteConfirmText !== 'DELETE'} style={{ opacity: deleteConfirmText !== 'DELETE' ? 0.45 : 1 }}>
                {deleting ? 'Deleting…' : <><Trash2 size={13} style={{ display: 'inline', marginRight: 5 }} />Delete permanently</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  )
}
