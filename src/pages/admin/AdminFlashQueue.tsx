import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Users, Trash2, Phone, Mail, CheckCircle2, UserCheck, Upload, ChevronRight, FileCheck, FileX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { awardSpendPoints } from '../../lib/awardPoints'
import { StyleSelect } from '../../components/shared/StyleSelect'
import { downloadConsentForm, type ConsentFormFields } from '../../lib/downloadConsentForm'

type FlashEvent = {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  status: 'upcoming' | 'open' | 'closed'
  max_spots: number
}

type MembershipPlan = 'free' | 'premium' | 'black-card'
type ReservationStatus = 'waiting' | 'claimed' | 'completed'

type QueueRow = {
  id: string
  position: number | null
  reserved_at: string
  status: ReservationStatus
  claimed_by_artist_id: string | null
  profile_id: string
  profile: {
    full_name: string | null
    avatar_url: string | null
    email: string | null
    phone: string | null
    membership_plan: MembershipPlan
  } | null
  consent: ConsentFormFields | null
  selected_tattoo_numbers: number[] | null
}

const PLAN_LABELS: Record<MembershipPlan, string> = {
  free: 'Free',
  premium: 'Premium',
  'black-card': 'Black Card',
}

const PLAN_COLORS: Record<MembershipPlan, string> = {
  free: 'var(--text-muted)',
  premium: '#8ab4a0',
  'black-card': 'var(--gold)',
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function TattooChoices({ numbers }: { numbers: number[] | null }) {
  if (!numbers || numbers.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
      {numbers.map(n => (
        <span key={n} style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gold)', padding: '2px 8px', borderRadius: 20, background: 'rgba(212,175,55,0.1)', border: '1px solid var(--border-gold)' }}>
          Tattoo #{n}
        </span>
      ))}
    </div>
  )
}

export function AdminFlashQueue() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isManager = profile?.role === 'manager'

  const [event, setEvent] = useState<FlashEvent | null>(null)
  const [rows, setRows] = useState<QueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  // This artist's participation state for this event
  const [myArtistId, setMyArtistId] = useState<string | null>(null)
  const [isParticipant, setIsParticipant] = useState(false)
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)

  // Completion modal — up to 2 tattoos recorded separately (own photo/style/
  // notes each) but charged as a single total price for the whole visit.
  const [completeTarget, setCompleteTarget] = useState<QueueRow | null>(null)
  const [tattooCount, setTattooCount] = useState<1 | 2>(1)
  const [styles, setStyles] = useState<[string, string]>(['', ''])
  const [notesArr, setNotesArr] = useState<[string, string]>(['', ''])
  const [photoFiles, setPhotoFiles] = useState<[File | null, File | null]>([null, null])
  const [price, setPrice] = useState('')
  const [hours, setHours] = useState('')
  const [saving, setSaving] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)

  async function load() {
    if (!eventId) return

    const { data: ev } = await supabase
      .from('flash_events')
      .select('id, title, date, start_time, end_time, status, max_spots')
      .eq('id', eventId)
      .single()
    if (ev) setEvent(ev)

    const { data } = await supabase
      .from('flash_reservations')
      .select('id, position, reserved_at, status, claimed_by_artist_id, profile_id, selected_tattoo_numbers, profile:profiles(full_name, avatar_url, email, phone, membership_plan)')
      .eq('flash_event_id', eventId)
      .order('position', { ascending: true })

    const queueRows = (data ?? []) as any[]
    const profileIds = queueRows.map(r => r.profile_id).filter(Boolean)
    const consentMap: Record<string, ConsentFormFields> = {}
    if (profileIds.length > 0) {
      const { data: forms } = await supabase
        .from('consent_forms')
        .select('*')
        .in('profile_id', profileIds)
      for (const f of forms ?? []) consentMap[(f as any).profile_id] = f as ConsentFormFields
    }

    setRows(queueRows.map(r => ({ ...r, profile: r.profile ?? null, consent: consentMap[r.profile_id] ?? null })))
    setLoading(false)
  }

  async function loadParticipation() {
    if (!eventId || !profile?.id) return
    const { data: artist } = await supabase
      .from('artists')
      .select('id')
      .eq('profile_id', profile.id)
      .maybeSingle()

    if (!artist) { setIsParticipant(false); return }
    setMyArtistId(artist.id)

    const { data: fea } = await supabase
      .from('flash_event_artists')
      .select('checked_in_at')
      .eq('flash_event_id', eventId)
      .eq('artist_id', artist.id)
      .maybeSingle()

    setIsParticipant(!!fea)
    setCheckedInAt(fea?.checked_in_at ?? null)
  }

  useEffect(() => { load(); loadParticipation() }, [eventId, profile?.id])

  // Live-update as customers join / leave / get claimed / completed
  useEffect(() => {
    if (!eventId) return
    const channel = supabase
      .channel(`admin-flash-queue-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_reservations', filter: `flash_event_id=eq.${eventId}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  async function removeFromQueue(id: string, name: string) {
    if (!confirm(`Remove ${name} from the queue? Everyone behind them moves up one spot.`)) return
    setRemoving(id)
    await supabase.from('flash_reservations').delete().eq('id', id)
    setRemoving(null)
    setRows(prev => prev.filter(r => r.id !== id))
  }

  async function checkIn() {
    if (!eventId || !myArtistId) return
    setCheckingIn(true)
    const { error } = await supabase.rpc('check_in_to_flash_event', { p_event_id: eventId, p_artist_id: myArtistId })
    setCheckingIn(false)
    if (!error) setCheckedInAt(new Date().toISOString())
  }

  async function acceptNext() {
    if (!eventId || !myArtistId) return
    setClaiming(true)
    setClaimError(null)
    const { data, error } = await supabase.rpc('claim_next_flash_customer', { p_event_id: eventId, p_artist_id: myArtistId })
    setClaiming(false)
    if (error) { setClaimError(error.message); return }
    if (!data) { setClaimError('No one is waiting right now.'); return }
    load()
  }

  function openComplete(row: QueueRow) {
    setCompleteTarget(row)
    setTattooCount(row.selected_tattoo_numbers && row.selected_tattoo_numbers.length === 2 ? 2 : 1)
    setStyles(['', '']); setNotesArr(['', '']); setPhotoFiles([null, null])
    setPrice(''); setHours('')
    setCompleteError(null)
  }

  function setPhotoFileAt(index: 0 | 1, file: File | null) {
    setPhotoFiles(prev => { const next: [File | null, File | null] = [...prev]; next[index] = file; return next })
  }
  function setStyleAt(index: 0 | 1, value: string) {
    setStyles(prev => { const next: [string, string] = [...prev]; next[index] = value; return next })
  }
  function setNotesAt(index: 0 | 1, value: string) {
    setNotesArr(prev => { const next: [string, string] = [...prev]; next[index] = value; return next })
  }

  async function saveCompletion() {
    if (!completeTarget || !myArtistId) return
    const activeIndexes = tattooCount === 2 ? [0, 1] : [0]
    if (activeIndexes.some(i => !photoFiles[i])) {
      setCompleteError(tattooCount === 2 ? 'Upload a photo for each tattoo.' : 'Upload a photo of the finished piece.')
      return
    }
    setSaving(true)
    setCompleteError(null)

    const completedAt = new Date().toISOString().split('T')[0]
    let firstCompletionId: string | null = null

    for (const i of activeIndexes) {
      const file = photoFiles[i]!
      const ext = file.name.split('.').pop()
      const path = `completions/${completeTarget.profile_id}/${Date.now()}-${i}.${ext}`
      const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, { upsert: true })
      if (upErr) { setCompleteError(upErr.message); setSaving(false); return }

      const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(path)

      // Total price/hours for the whole visit are recorded once, on the
      // first tattoo's row, so revenue/analytics don't double-count a
      // single charge across two completion rows.
      const isFirst = i === activeIndexes[0]

      const { data: newComp, error: dbErr } = await supabase
        .from('tattoo_completions')
        .insert({
          profile_id: completeTarget.profile_id,
          artist_id: myArtistId,
          photo_url: urlData.publicUrl,
          style: styles[i].trim() || null,
          notes: notesArr[i].trim() || null,
          completed_at: completedAt,
          price: isFirst && price.trim() ? parseFloat(price) : null,
          duration_hours: isFirst && hours.trim() ? parseFloat(hours) : null,
        })
        .select('id')
        .single()

      if (dbErr) { setCompleteError(dbErr.message); setSaving(false); return }
      if (isFirst) firstCompletionId = newComp?.id ?? null
    }

    if (price.trim() && profile?.id) {
      await awardSpendPoints({
        profileId: completeTarget.profile_id,
        price: parseFloat(price),
        awardedBy: profile.id,
        referenceId: firstCompletionId ?? undefined,
      })
    }

    const { error: completeErr } = await supabase.rpc('complete_flash_customer', { p_reservation_id: completeTarget.id })
    if (completeErr) { setCompleteError(completeErr.message); setSaving(false); return }

    setSaving(false)
    setCompleteTarget(null)
    load()
  }

  const dateLabel = event
    ? new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : ''

  const waiting = rows.filter(r => r.status === 'waiting')
  const myCurrentCustomer = myArtistId ? rows.find(r => r.status === 'claimed' && r.claimed_by_artist_id === myArtistId) : undefined
  const anyoneWaiting = waiting.length > 0

  return (
    <div>
      <div className="admin-page__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="admin-btn admin-btn--ghost" onClick={() => navigate('/admin/flash')} aria-label="Back to Flash Events">
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="admin-page__title">{event?.title ?? 'Flash Queue'}</h1>
            {event && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                {dateLabel} · {event.start_time.slice(0, 5)}–{event.end_time.slice(0, 5)}
              </span>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : !event ? (
        <p className="admin-empty">Event not found.</p>
      ) : (
        <>
          {/* ── Participating-artist controls ── */}
          {isParticipant && (
            <div style={{
              border: '1px solid var(--border-gold)', borderRadius: 14, padding: 18, marginBottom: 20,
              background: 'var(--bg-card)',
            }}>
              {!checkedInAt ? (
                <>
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    You're on the lineup for this flash day
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Check in to confirm you're here and start taking customers from the queue.
                  </p>
                  <button className="admin-btn admin-btn--primary" onClick={checkIn} disabled={checkingIn}>
                    <UserCheck size={13} style={{ display: 'inline', marginRight: 6 }} />
                    {checkingIn ? 'Checking in…' : "I'm here — Check In"}
                  </button>
                </>
              ) : myCurrentCustomer ? (
                <>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>
                    Your Current Customer
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {myCurrentCustomer.profile?.avatar_url ? (
                      <img src={myCurrentCustomer.profile.avatar_url} alt="" className="admin-table__avatar" />
                    ) : (
                      <div className="admin-table__avatar--empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gold)' }}>
                        {initials(myCurrentCustomer.profile?.full_name ?? null)}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text)' }}>
                        {myCurrentCustomer.profile?.full_name ?? 'Unknown customer'}
                      </p>
                      {myCurrentCustomer.profile?.phone && (
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>{myCurrentCustomer.profile.phone}</p>
                      )}
                      <TattooChoices numbers={myCurrentCustomer.selected_tattoo_numbers} />
                    </div>
                    <button className="admin-btn admin-btn--complete" style={{ width: 'auto' }} onClick={() => openComplete(myCurrentCustomer)}>
                      <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 6 }} />
                      Finish
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>
                    You're checked in
                  </p>
                  {anyoneWaiting && waiting[0] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(var(--accent-rgb), 0.05)', border: '1px solid rgba(var(--accent-rgb), 0.15)' }}>
                      {waiting[0].profile?.avatar_url ? (
                        <img src={waiting[0].profile.avatar_url} alt="" className="admin-table__avatar" />
                      ) : (
                        <div className="admin-table__avatar--empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gold)' }}>
                          {initials(waiting[0].profile?.full_name ?? null)}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: 2 }}>Up next</p>
                        <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>
                          {waiting[0].profile?.full_name ?? 'Unknown customer'}
                        </p>
                        <TattooChoices numbers={waiting[0].selected_tattoo_numbers} />
                      </div>
                    </div>
                  )}
                  <button className="admin-btn admin-btn--primary" onClick={acceptNext} disabled={claiming || !anyoneWaiting}>
                    <ChevronRight size={13} style={{ display: 'inline', marginRight: 6 }} />
                    {claiming ? 'Accepting…' : anyoneWaiting ? 'Accept Next Customer' : 'No one waiting'}
                  </button>
                  {claimError && <p style={{ fontSize: '0.78rem', color: '#f87171', marginTop: 8 }}>{claimError}</p>}
                </>
              )}
            </div>
          )}

          <div className="admin-stats" style={{ marginBottom: 24 }}>
            <div className="admin-stat">
              <div className="admin-stat__value">{waiting.length}</div>
              <div className="admin-stat__label">Waiting</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat__value">{rows.filter(r => r.status === 'claimed').length}</div>
              <div className="admin-stat__label">In Progress</div>
            </div>
            <div className="admin-stat">
              <div className="admin-stat__value">{rows.filter(r => r.status === 'completed').length}</div>
              <div className="admin-stat__label">Completed</div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="admin-empty">
              <Users size={28} strokeWidth={1.2} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
              No one has joined this queue yet.
            </div>
          ) : (
            <div className="admin-booking-list">
              {rows.map(r => {
                const overSpots = r.status === 'waiting' && r.position !== null && r.position > event.max_spots
                const statusLabel = r.status === 'waiting' ? `#${r.position ?? '?'}` : r.status === 'claimed' ? 'In progress' : 'Done'
                const statusColor = r.status === 'completed' ? '#6bffb8' : r.status === 'claimed' ? 'var(--gold)' : overSpots ? 'var(--text-muted)' : 'var(--gold)'
                return (
                  <div key={r.id} className="admin-booking-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, opacity: r.status === 'completed' ? 0.6 : 1 }}>
                    <div style={{
                      minWidth: 36, height: 36, padding: '0 6px', borderRadius: 18, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.78rem',
                      background: `${statusColor}18`,
                      color: statusColor,
                      border: `1px solid ${statusColor}55`,
                    }}>
                      {statusLabel}
                    </div>

                    {r.profile?.avatar_url ? (
                      <img src={r.profile.avatar_url} alt="" className="admin-table__avatar" style={{ flexShrink: 0 }} />
                    ) : (
                      <div className="admin-table__avatar--empty" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gold)' }}>
                        {initials(r.profile?.full_name ?? null)}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="admin-booking-card__name">{r.profile?.full_name ?? 'Unknown customer'}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 3 }}>
                        {r.profile?.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <Phone size={11} /> {r.profile.phone}
                          </span>
                        )}
                        {r.profile?.email && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <Mail size={11} /> {r.profile.email}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                        {r.profile && (
                          <span style={{
                            fontSize: '0.63rem', fontWeight: 700,
                            color: PLAN_COLORS[r.profile.membership_plan],
                            background: `${PLAN_COLORS[r.profile.membership_plan]}18`,
                            border: `1px solid ${PLAN_COLORS[r.profile.membership_plan]}40`,
                            padding: '1px 6px', borderRadius: 10,
                          }}>
                            {PLAN_LABELS[r.profile.membership_plan]}
                          </span>
                        )}
                        {overSpots && (
                          <span style={{ fontSize: '0.63rem', fontWeight: 700, color: '#f59e0b' }}>Waitlist</span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Joined {new Date(r.reserved_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <TattooChoices numbers={r.selected_tattoo_numbers} />
                    </div>

                    {(r.status === 'claimed' || r.status === 'completed') && (
                      r.consent?.signed_at ? (
                        <button
                          className="admin-btn admin-btn--ghost"
                          onClick={() => downloadConsentForm(r.consent!, `Flash Day: ${event.title} — ${dateLabel}`)}
                          aria-label="Download signed waiver"
                          title="Download signed waiver"
                        >
                          <FileCheck size={13} style={{ color: '#6bffb8' }} />
                        </button>
                      ) : (
                        <span
                          className="admin-btn admin-btn--ghost"
                          style={{ opacity: 0.5, cursor: 'default' }}
                          aria-label="No waiver on file"
                          title="No waiver on file"
                        >
                          <FileX size={13} style={{ color: '#f87171' }} />
                        </span>
                      )
                    )}

                    {isManager && r.status === 'waiting' && (
                      <button
                        className="admin-btn admin-btn--danger"
                        onClick={() => removeFromQueue(r.id, r.profile?.full_name ?? 'this customer')}
                        disabled={removing === r.id}
                        aria-label="Remove from queue"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <Link to="/admin/flash" style={{ display: 'inline-block', marginTop: 20, fontSize: '0.82rem', color: 'var(--gold)' }}>
            ← Back to Flash Events
          </Link>
        </>
      )}

      {/* ── Finish / record completed tattoo modal ── */}
      {completeTarget && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && !saving && setCompleteTarget(null)}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">Finish — {completeTarget.profile?.full_name ?? 'Customer'}</h2>
            <TattooChoices numbers={completeTarget.selected_tattoo_numbers} />

            <div className="admin-modal__field">
              <label className="admin-modal__label">How many tattoos did you do?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([1, 2] as const).map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`admin-btn ${tattooCount === n ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
                    style={{ flex: 1 }}
                    onClick={() => setTattooCount(n)}
                  >
                    {n} Tattoo{n === 2 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            {(tattooCount === 2 ? [0, 1] as const : [0] as const).map(i => (
              <div key={i} style={{ border: '1px solid var(--border-gold)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                {tattooCount === 2 && (
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>
                    Tattoo {i + 1}
                  </p>
                )}

                <div className="admin-modal__field">
                  <label className="admin-modal__label">Style / Category</label>
                  <StyleSelect value={styles[i]} onChange={v => setStyleAt(i, v)} />
                </div>

                <div className="admin-modal__field">
                  <label className="admin-modal__label">Notes</label>
                  <textarea className="admin-modal__textarea" value={notesArr[i]}
                    placeholder="Any notes about the piece…"
                    onChange={e => setNotesAt(i, e.target.value)} />
                </div>

                <div className="admin-modal__field">
                  <label className="admin-modal__label">Photo of Completed Work *</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--gold)', fontSize: '0.85rem' }}>
                    <Upload size={15} />
                    {photoFiles[i] ? photoFiles[i]!.name : 'Choose photo…'}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => setPhotoFileAt(i, e.target.files?.[0] ?? null)} />
                  </label>
                  {photoFiles[i] && (
                    <img
                      src={URL.createObjectURL(photoFiles[i]!)}
                      alt=""
                      style={{ marginTop: 8, width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-gold)' }}
                    />
                  )}
                </div>
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Total Price Charged (R)</label>
                <input className="admin-modal__input" type="number" inputMode="decimal" min="0" step="0.01"
                  value={price} placeholder="e.g. 350"
                  onChange={e => setPrice(e.target.value)} />
                {tattooCount === 2 && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>Combined total for both tattoos</p>
                )}
              </div>
              <div className="admin-modal__field">
                <label className="admin-modal__label">Hours in Chair</label>
                <input className="admin-modal__input" type="number" inputMode="decimal" min="0" step="0.5"
                  value={hours} placeholder="e.g. 1.5"
                  onChange={e => setHours(e.target.value)} />
              </div>
            </div>

            {completeError && <p className="admin-modal__error">{completeError}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setCompleteTarget(null)} disabled={saving}>Cancel</button>
              <button className="admin-btn admin-btn--complete" style={{ width: 'auto' }} onClick={saveCompletion} disabled={saving}>
                {saving ? 'Saving…' : 'Complete & Move to Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
