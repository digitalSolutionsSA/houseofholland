import { useEffect, useRef, useState } from 'react'
import { CheckCircle, XCircle, Clock, Scissors, Upload, Trophy } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

type Artist = { id: string; name: string; profile_id: string | null }
type Booking = {
  id: string
  appointment_at: string
  service: string
  notes: string | null
  status: string
  profile_id: string | null
  checked_in_at: string | null
  tattoo_location: string | null
  tattoo_design: string | null
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
}

export function AdminBookings() {
  const { profile } = useAuth()
  const [artists, setArtists]         = useState<Artist[]>([])
  const [artistId, setArtistId]       = useState<string>('')
  const [bookings, setBookings]       = useState<Booking[]>([])
  const [filter, setFilter]           = useState<'pending' | 'confirmed' | 'all'>('pending')
  const [loading, setLoading]         = useState(true)
  const [acting, setActing]           = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Complete Job modal
  const cmpFileRef = useRef<HTMLInputElement>(null)
  const [completeModal, setCompleteModal] = useState<Booking | null>(null)
  const [cmpStyle, setCmpStyle]   = useState('')
  const [cmpNotes, setCmpNotes]   = useState('')
  const [cmpDate, setCmpDate]     = useState('')
  const [cmpFile, setCmpFile]     = useState<File | null>(null)
  const [cmpPreview, setCmpPreview] = useState<string | null>(null)
  const [cmpSaving, setCmpSaving] = useState(false)
  const [cmpError, setCmpError]   = useState<string | null>(null)
  const [cmpSuccess, setCmpSuccess] = useState<{ count: number; nextReward: string | null } | null>(null)

  const isManager = profile?.role === 'manager'

  async function loadBookings(aid: string) {
    setLoading(true)
    let q = supabase
      .from('bookings')
      .select('id, appointment_at, service, notes, status, profile_id, checked_in_at, tattoo_location, tattoo_design')
      .eq('artist_id', aid)
      .gte('appointment_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .order('appointment_at')

    if (filter !== 'all') {
      // When filter is 'confirmed', include confirmed AND completed (today's done jobs)
      q = filter === 'confirmed'
        ? q.in('status', ['confirmed'])
        : q.eq('status', filter)
    }

    const { data: rows } = await q
    const bookingRows = rows ?? []

    // Fetch client profiles separately (embedded join silently fails for artists due to RLS)
    const profileIds = [...new Set(bookingRows.map((b: any) => b.profile_id).filter(Boolean))]
    let profileMap: Record<string, { full_name: string | null; email: string | null; phone: string | null }> = {}
    if (profileIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', profileIds)
      for (const p of profileData ?? []) profileMap[p.id] = p
    }

    setBookings(bookingRows.map((b: any) => ({ ...b, profiles: profileMap[b.profile_id] ?? null })))
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: list } = await supabase
        .from('artists')
        .select('id, name, profile_id')
        .eq('is_active', true)
        .order('name')
      setArtists(list ?? [])

      const mine = (list ?? []).find((a: any) => a.profile_id === profile?.id)
      const id = mine?.id ?? (isManager ? list?.[0]?.id : null)
      if (id) { setArtistId(id); loadBookings(id) }
      else setLoading(false)
    }
    init()
  }, [profile?.id])

  useEffect(() => {
    if (artistId) loadBookings(artistId)
  }, [artistId, filter])

  async function updateStatus(id: string, status: 'confirmed' | 'rejected') {
    setActing(id)
    setActionError(null)
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) {
      setActionError(error.message)
      setActing(null)
      return
    }
    // Remove from the filtered list so the card disappears immediately
    if (filter !== 'all') {
      setBookings(b => b.filter(x => x.id !== id))
    } else {
      setBookings(b => b.map(x => x.id === id ? { ...x, status } : x))
    }
    setActing(null)
  }

  function openCompleteModal(b: Booking) {
    setCompleteModal(b)
    setCmpStyle(b.service)
    setCmpNotes('')
    setCmpDate(new Date().toISOString().split('T')[0])
    setCmpFile(null)
    setCmpPreview(null)
    setCmpError(null)
    setCmpSuccess(null)
  }

  function closeCmpModal() {
    setCompleteModal(null)
    setCmpFile(null)
    setCmpPreview(null)
    setCmpSaving(false)
    setCmpError(null)
    setCmpSuccess(null)
  }

  function onCmpFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setCmpFile(f)
    setCmpPreview(URL.createObjectURL(f))
    e.target.value = ''
  }

  async function completeJob() {
    if (!completeModal || !completeModal.profile_id) { setCmpError('No client found on this booking.'); return }
    if (!cmpFile) { setCmpError('Please upload a photo of the completed work.'); return }
    if (!artistId) { setCmpError('No artist selected.'); return }

    setCmpSaving(true)
    setCmpError(null)

    const profileId = completeModal.profile_id
    const ext = cmpFile.name.split('.').pop()
    const path = `completions/${profileId}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('portfolio')
      .upload(path, cmpFile, { upsert: true })
    if (upErr) { setCmpError(upErr.message); setCmpSaving(false); return }

    const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(path)

    const { error: dbErr } = await supabase.from('tattoo_completions').insert({
      profile_id: profileId,
      artist_id: artistId,
      photo_url: urlData.publicUrl,
      style: cmpStyle.trim() || null,
      notes: cmpNotes.trim() || null,
      completed_at: cmpDate,
    })
    if (dbErr) { setCmpError(dbErr.message); setCmpSaving(false); return }

    // Mark the booking as completed
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', completeModal.id)

    // Fetch the client's updated tattoo count and next reward
    const [{ count }, { data: rewardRows }] = await Promise.all([
      supabase
        .from('tattoo_completions')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId),
      supabase
        .from('passport_rewards')
        .select('tattoo_count, reward_label')
        .order('sort_order'),
    ])

    const newCount = count ?? 0
    const nextReward = rewardRows?.find((r: any) => r.tattoo_count > newCount)

    setCmpSaving(false)
    setCmpSuccess({
      count: newCount,
      nextReward: nextReward
        ? `${nextReward.reward_label} (at ${nextReward.tattoo_count} tattoos)`
        : null,
    })

    // Remove from the booking list
    setBookings(b => b.filter(x => x.id !== completeModal.id))
  }

  function fmt(ts: string) {
    return new Date(ts).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      year: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Appointments</h1>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {isManager && artists.length > 1 && (
          <select className="admin-modal__select" style={{ maxWidth: 200 }}
            value={artistId} onChange={e => setArtistId(e.target.value)}>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        {(['pending', 'confirmed', 'all'] as const).map(f => (
          <button
            key={f}
            className={`admin-btn ${filter === f ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f === 'all' ? 'All Upcoming' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {actionError && (
        <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: 12 }}>{actionError}</p>
      )}

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : bookings.length === 0 ? (
        <p className="admin-empty">No {filter === 'all' ? 'upcoming' : filter} appointments.</p>
      ) : (
        <div className="admin-booking-list">
          {bookings.map(b => {
            const client = b.profiles as any
            return (
              <div key={b.id} className={`admin-booking-card admin-booking-card--${b.status}`}>
                <div className="admin-booking-card__top">
                  <div>
                    <div className="admin-booking-card__name">{client?.full_name ?? 'Unknown client'}</div>
                    <div className="admin-booking-card__email">{client?.email}</div>
                    {client?.phone && <div className="admin-booking-card__email">{client.phone}</div>}
                  </div>
                  <span className={`admin-badge admin-badge--${b.status === 'confirmed' ? 'active' : b.status === 'pending' ? 'upcoming' : 'inactive'}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>

                <div className="admin-booking-card__detail">
                  <Clock size={13} strokeWidth={1.5} />
                  {fmt(b.appointment_at)}
                </div>
                <div className="admin-booking-card__service">{b.service}</div>
                {b.notes && <div className="admin-booking-card__notes">{b.notes}</div>}
                {b.checked_in_at && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6, fontSize: '0.8rem', color: '#4ade80' }}>
                    <CheckCircle size={12} style={{ display: 'inline', marginRight: 5 }} />
                    Checked in
                    {b.tattoo_location && <span style={{ color: 'var(--text-muted)' }}> · {b.tattoo_location}</span>}
                    {b.tattoo_design && <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2, fontSize: '0.77rem' }}>{b.tattoo_design}</span>}
                  </div>
                )}

                {b.status === 'pending' && (
                  <div className="admin-booking-card__actions">
                    <button
                      className="admin-btn admin-btn--danger"
                      onClick={() => updateStatus(b.id, 'rejected')}
                      disabled={acting === b.id}
                    >
                      <XCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Decline
                    </button>
                    <button
                      className="admin-btn admin-btn--primary"
                      onClick={() => updateStatus(b.id, 'confirmed')}
                      disabled={acting === b.id}
                    >
                      <CheckCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Confirm
                    </button>
                  </div>
                )}
                {b.status === 'confirmed' && (
                  <div className="admin-booking-card__actions" style={{ marginTop: 8 }}>
                    <button
                      className="admin-btn admin-btn--complete"
                      onClick={() => openCompleteModal(b)}
                      disabled={acting === b.id}
                    >
                      <Scissors size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Complete Job
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {/* Complete Job modal */}
      {completeModal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && !cmpSuccess && closeCmpModal()}>
          <div className="admin-modal">
            {cmpSuccess ? (
              /* Success screen */
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <Trophy size={40} color="var(--gold)" style={{ marginBottom: 12 }} />
                <h2 className="admin-modal__title" style={{ marginBottom: 8 }}>Job Completed!</h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Photo saved to {(completeModal.profiles as any)?.full_name ?? 'client'}'s Tattoo Vault.
                </p>
                <div style={{ padding: '14px 18px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 10, marginBottom: 20 }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>
                    CLIENT REWARD PROGRESS
                  </p>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
                    {cmpSuccess.count} tattoo{cmpSuccess.count !== 1 ? 's' : ''} completed
                  </p>
                  {cmpSuccess.nextReward ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Next reward: {cmpSuccess.nextReward}
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.82rem', color: 'var(--gold)', marginTop: 4 }}>
                      All rewards unlocked — Legend status!
                    </p>
                  )}
                </div>
                <button className="admin-btn admin-btn--primary" onClick={closeCmpModal} style={{ width: '100%' }}>
                  Done
                </button>
              </div>
            ) : (
              /* Form */
              <>
                <h2 className="admin-modal__title">Complete Job</h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Client: <strong style={{ color: 'var(--text)' }}>
                    {(completeModal.profiles as any)?.full_name ?? 'Unknown'}
                  </strong>
                  {(completeModal.profiles as any)?.email && (
                    <span style={{ color: 'var(--text-dim)' }}> · {(completeModal.profiles as any).email}</span>
                  )}
                </p>

                <div className="admin-modal__field">
                  <label className="admin-modal__label">Style / Title</label>
                  <input
                    className="admin-modal__input"
                    value={cmpStyle}
                    placeholder="e.g. Black & Grey Sleeve, Floral Forearm…"
                    onChange={e => setCmpStyle(e.target.value)}
                  />
                </div>

                <div className="admin-modal__field">
                  <label className="admin-modal__label">Notes (optional)</label>
                  <textarea
                    className="admin-modal__textarea"
                    value={cmpNotes}
                    placeholder="Any notes about the piece…"
                    onChange={e => setCmpNotes(e.target.value)}
                  />
                </div>

                <div className="admin-modal__field">
                  <label className="admin-modal__label">Date Completed</label>
                  <input
                    className="admin-modal__input"
                    type="date"
                    value={cmpDate}
                    onChange={e => setCmpDate(e.target.value)}
                  />
                </div>

                <div className="admin-modal__field">
                  <label className="admin-modal__label">Photo of Completed Work *</label>
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}
                    onClick={() => cmpFileRef.current?.click()}
                  >
                    <Upload size={14} />
                    {cmpFile ? cmpFile.name : 'Choose photo…'}
                  </button>
                  <input
                    ref={cmpFileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={onCmpFilePick}
                  />
                  {cmpPreview && (
                    <img
                      src={cmpPreview}
                      alt=""
                      style={{ marginTop: 10, width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-gold)' }}
                    />
                  )}
                </div>

                {cmpError && <p className="admin-modal__error">{cmpError}</p>}

                <div className="admin-modal__actions">
                  <button className="admin-btn admin-btn--ghost" onClick={closeCmpModal}>Cancel</button>
                  <button
                    className="admin-btn admin-btn--primary"
                    onClick={completeJob}
                    disabled={cmpSaving}
                  >
                    {cmpSaving ? 'Saving…' : (
                      <><Scissors size={13} style={{ display: 'inline', marginRight: 6 }} />Mark Complete</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
