import { useEffect, useState } from 'react'
import { Bell, ChevronLeft, ChevronRight, Clock, CalendarDays, User, Zap, Lock, X } from 'lucide-react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { storageImg } from '../lib/storageImg'
import { useAuth } from '../context/AuthContext'
import { useMembership } from '../hooks/useMembership'
import { joinFlashQueue } from '../lib/flashQueue'
import './FlashQueuePage.css'

type FlashEvent = {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  description: string | null
  status: 'upcoming' | 'open' | 'closed'
  max_spots: number
  total_designs: number | null
}

type ArtistChip = { id: string; name: string; avatar_url: string | null }
type DesignImage = { id: string; image_url: string; position: number }

type ReservationStatus = 'waiting' | 'claimed' | 'completed'

type Reservation = {
  id: string
  position: number | null
  reserved_at: string
  status: ReservationStatus
}

function daysUntilDate(dateStr: string): number {
  const eventDay = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function FlashQueuePage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { flashNoticeDays, tier, isPremium } = useMembership()

  const [event, setEvent] = useState<FlashEvent | null>(null)
  const [artists, setArtists] = useState<ArtistChip[]>([])
  const [designImages, setDesignImages] = useState<DesignImage[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [tattooChoice1, setTattooChoice1] = useState('')
  const [tattooChoice2, setTattooChoice2] = useState('')
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [queueSize, setQueueSize] = useState(0)
  const [aheadCount, setAheadCount] = useState(0)
  const [hasSignedWaiver, setHasSignedWaiver] = useState(false)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function load() {
    if (!eventId) return
    setLoadError(null)

    try {
      const { data: ev, error: evErr } = await supabase
        .from('flash_events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (evErr) throw evErr
      if (ev) setEvent(ev)

      const [{ data: junc }, { data: gjunc }] = await Promise.all([
        supabase.from('flash_event_artists').select('artists(id, name, avatar_url)').eq('flash_event_id', eventId),
        supabase.from('flash_event_guest_artists').select('guest_artists(id, name, avatar_url)').eq('flash_event_id', eventId),
      ])

      const residentArtists = (junc ?? [])
        .map((r: any) => r.artists).filter(Boolean)
        .map((a: any) => ({ id: a.id, name: a.name, avatar_url: a.avatar_url ?? null }))

      const guestArtistList = (gjunc ?? [])
        .map((r: any) => r.guest_artists).filter(Boolean)
        .map((a: any) => ({ id: `g-${a.id}`, name: a.name, avatar_url: a.avatar_url ?? null }))

      setArtists([...residentArtists, ...guestArtistList])

      const { data: images } = await supabase
        .from('flash_event_images')
        .select('id, image_url, position')
        .eq('flash_event_id', eventId)
        .order('position', { ascending: true })
      setDesignImages(images ?? [])

      // Every reservation ever made for this event counts toward "spots taken"
      // (waiting + being served + already done), but "people ahead of me" only
      // counts those still actually waiting.
      const { data: all, error: allErr } = await supabase
        .from('flash_reservations')
        .select('id, position, status')
        .eq('flash_event_id', eventId)

      if (allErr) throw allErr
      const allRows = all ?? []
      setQueueSize(allRows.length)

      if (profile?.id) {
        const [{ data: res, error: resErr }, { data: cf, error: cfErr }] = await Promise.all([
          supabase
            .from('flash_reservations')
            .select('id, position, reserved_at, status')
            .eq('flash_event_id', eventId)
            .eq('profile_id', profile.id)
            // A customer can have past completed reservations from
            // re-enrolling — only the most recent one (active or not) is
            // "their" current reservation for display purposes.
            .order('reserved_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('consent_forms')
            .select('signed_at')
            .eq('profile_id', profile.id)
            .maybeSingle(),
        ])

        if (resErr) throw resErr
        if (cfErr) throw cfErr
        setReservation(res ?? null)
        setHasSignedWaiver(!!cf?.signed_at)

        if (res && res.position !== null) {
          const ahead = allRows.filter(r => r.status === 'waiting' && (r.position ?? 0) < res.position!).length
          setAheadCount(ahead)
        }
      }
    } catch (err) {
      console.error('FlashQueuePage load failed:', err)
      setLoadError('Could not load this flash day. Pull to refresh or try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [eventId, profile?.id])

  // Keep the queue position live: when someone ahead leaves (or the DB
  // renumbers everyone after a departure), or someone new joins, reload so
  // this user's displayed position and the total count stay accurate.
  useEffect(() => {
    if (!eventId) return
    const channel = supabase
      .channel(`flash-queue-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_reservations', filter: `flash_event_id=eq.${eventId}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [eventId, profile?.id])

  const selectedTattoos = [tattooChoice1, tattooChoice2]
    .map(n => parseInt(n, 10))
    .filter(n => Number.isFinite(n))

  async function joinQueue() {
    if (!event || !profile) return
    if (!hasSignedWaiver) {
      const tattooParam = selectedTattoos.length > 0 ? `&tattoos=${selectedTattoos.join(',')}` : ''
      navigate(`/consent?joinFlashEvent=${event.id}${tattooParam}`)
      return
    }
    setActing(true); setError(null)
    // position is assigned atomically by a DB trigger (assign_flash_queue_position) —
    // never computed client-side, so concurrent joins can't collide on the same spot.
    const { data, error: err } = await joinFlashQueue({
      eventId: event.id,
      eventTitle: event.title,
      eventStatus: event.status,
      profileId: profile.id,
      isPremium,
      selectedTattoos,
    })
    if (err) {
      setError(err)
    } else if (data) {
      setReservation(data)
      setQueueSize(q => q + 1)
      setTattooChoice1(''); setTattooChoice2('')
    }
    setActing(false)
  }

  async function leaveQueue() {
    if (!reservation) return
    setActing(true)
    await supabase.from('flash_reservations').delete().eq('id', reservation.id)
    setReservation(null)
    setQueueSize(q => Math.max(0, q - 1))
    setActing(false)
  }

  // A previous visit finished (status === 'completed') — let the customer
  // start a fresh reservation for another tattoo instead of being stuck.
  function enrollAgain() {
    setReservation(null)
    setTattooChoice1(''); setTattooChoice2('')
  }

  const dateLabel = event
    ? new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : ''

  const spotsLeft = event ? Math.max(0, event.max_spots - queueSize) : 0
  const fillPct   = event ? Math.min(100, (queueSize / event.max_spots) * 100) : 0

  // Tier-based early access check
  const days = event ? daysUntilDate(event.date) : 0
  const earlyAccessLocked = event && days > flashNoticeDays && event.status !== 'closed'

  // Which tier unlocks early access for this event
  const unlockTierLabel = days > 7 ? null : days > 2 ? 'Black Card' : 'Premium'

  if (loading) return (
    <div className="page flash-queue-page">
      <Link to="/home" className="flash-queue-page__back" aria-label="Go back">
        <ChevronLeft size={20} strokeWidth={1.5} />
      </Link>
      <div className="flash-queue-page__loading">Loading…</div>
    </div>
  )

  if (!event) return (
    <div className="page flash-queue-page">
      <Link to="/home" className="flash-queue-page__back" aria-label="Go back">
        <ChevronLeft size={20} strokeWidth={1.5} />
      </Link>
      <p style={{ padding: 24, color: 'var(--text-muted)' }}>{loadError ?? 'Event not found.'}</p>
      {loadError && (
        <button
          type="button"
          onClick={() => { setLoading(true); load() }}
          style={{ margin: '0 24px', padding: '10px 16px', color: 'var(--gold)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-sm)' }}
        >
          Retry
        </button>
      )}
    </div>
  )

  const statusLabel = event.status === 'open' ? '● Queue Open' : event.status === 'upcoming' ? '◆ Coming Soon' : '✕ Closed'

  // Early access tier badge
  const tierNoticeLabel =
    tier === 'black-card' ? '◆ Black Card — 7-day VIP access'
    : tier === 'premium'  ? '★ Premium — 2-day early access'
    : null

  return (
    <div className="page flash-queue-page">

      <Link to="/home" className="flash-queue-page__back" aria-label="Go back">
        <ChevronLeft size={20} strokeWidth={1.5} />
      </Link>

      {/* ── Hero ── */}
      <div className="flash-queue-page__hero">
        <p className="flash-queue-page__eyebrow">
          <Zap size={11} strokeWidth={2.5} fill="currentColor" />
          Flash Day
        </p>
        <h1>{event.title}</h1>
        <span className={`flash-queue-page__status-pill flash-queue-page__status-pill--${event.status}`}>
          {statusLabel}
        </span>
        {tierNoticeLabel && (
          <div className="flash-queue-page__tier-badge">{tierNoticeLabel}</div>
        )}
      </div>

      {/* ── Design gallery ── */}
      {designImages.length > 0 && (
        <div className="flash-queue-page__cover-wrap" onClick={() => setLightboxIndex(0)}>
          <img
            src={designImages[0].image_url}
            alt="Flash day design 1"
            className="flash-queue-page__cover"
            loading="lazy"
            decoding="async"
          />
          {designImages.length > 1 && (
            <span className="flash-queue-page__cover-count">1 / {designImages.length}</span>
          )}
        </div>
      )}

      {lightboxIndex !== null && designImages.length > 0 && (
        <div className="flash-queue-page__lightbox" onClick={() => setLightboxIndex(null)}>
          <button
            type="button"
            className="flash-queue-page__lightbox-close"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null) }}
            aria-label="Close"
          >
            <X size={22} strokeWidth={1.5} />
          </button>

          {designImages.length > 1 && (
            <button
              type="button"
              className="flash-queue-page__lightbox-nav flash-queue-page__lightbox-nav--prev"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i! - 1 + designImages.length) % designImages.length) }}
              aria-label="Previous design"
            >
              <ChevronLeft size={26} strokeWidth={1.5} />
            </button>
          )}

          <div className="flash-queue-page__lightbox-body" onClick={(e) => e.stopPropagation()}>
            <img
              src={designImages[lightboxIndex].image_url}
              alt={`Flash day design ${designImages[lightboxIndex].position}`}
              className="flash-queue-page__lightbox-img"
            />
            <p className="flash-queue-page__lightbox-label">
              Tattoo {designImages[lightboxIndex].position} of {designImages.length}
            </p>
          </div>

          {designImages.length > 1 && (
            <button
              type="button"
              className="flash-queue-page__lightbox-nav flash-queue-page__lightbox-nav--next"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i! + 1) % designImages.length) }}
              aria-label="Next design"
            >
              <ChevronRight size={26} strokeWidth={1.5} />
            </button>
          )}
        </div>
      )}

      {/* ── Meta ── */}
      <div className="flash-queue-page__meta">
        <span className="flash-queue-page__meta-item">
          <CalendarDays size={13} strokeWidth={1.5} />
          {dateLabel}
        </span>
        <span className="flash-queue-page__meta-dot" />
        <span className="flash-queue-page__meta-item">
          <Clock size={13} strokeWidth={1.5} />
          {event.start_time.slice(0, 5)} – {event.end_time.slice(0, 5)}
        </span>
      </div>

      {event.description && (
        <p className="flash-queue-page__desc">{event.description}</p>
      )}

      {/* ── Artist lineup ── */}
      {artists.length > 0 && (
        <>
          <hr className="flash-queue-page__rule" />
          <div className="flash-queue-page__lineup">
            <p className="flash-queue-page__lineup-label">Artists Lined Up</p>
            <div className="flash-queue-page__artists">
              {artists.map(a => (
                <div key={a.id} className="flash-queue-page__artist">
                  {a.avatar_url ? (
                    <img src={storageImg(a.avatar_url, 80) ?? a.avatar_url} alt={a.name} className="flash-queue-page__artist-avatar" loading="lazy" decoding="async" />
                  ) : (
                    <div className="flash-queue-page__artist-avatar--empty">
                      <User size={26} strokeWidth={1.5} />
                    </div>
                  )}
                  <span className="flash-queue-page__artist-name">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <hr className="flash-queue-page__rule" />

      {/* ── Early access locked ── */}
      {earlyAccessLocked ? (
        <div className="flash-queue-page__card">
          <div className="flash-queue-page__early-locked">
            <div className="flash-queue-page__early-icon">
              <Lock size={28} strokeWidth={1.2} />
            </div>
            <p className="flash-queue-page__early-title">Queue not open yet for your plan</p>
            <p className="flash-queue-page__early-body">
              {days === 1
                ? 'The queue opens tomorrow for Free members.'
                : `The queue opens in ${days} day${days === 1 ? '' : 's'} for Free members.`}
              {unlockTierLabel && (
                <> Upgrade to <strong>{unlockTierLabel}</strong> for early access.</>
              )}
            </p>
            <Link to="/membership" className="flash-queue-page__early-cta">
              View Membership Plans
            </Link>
          </div>
        </div>
      ) : (
        /* ── Queue section ── */
        <div className="flash-queue-page__card">

          {/* ── Spots urgency block ── */}
          {event.status !== 'closed' && (() => {
            const pct = spotsLeft / event.max_spots
            const urgency = pct === 0 ? 'none' : pct <= 0.2 ? 'critical' : pct <= 0.5 ? 'low' : 'ok'
            const urgencyMsg =
              urgency === 'none'     ? 'All spots are taken — join the waitlist below.' :
              urgency === 'critical' ? `Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left — secure yours now.` :
              urgency === 'low'      ? `${spotsLeft} spots remaining — filling fast.` :
                                       `${spotsLeft} of ${event.max_spots} spots still available.`
            return (
              <div className={`flash-queue-page__spots-block flash-queue-page__spots-block--${urgency}`}>
                <div className="flash-queue-page__spots-top">
                  <div className="flash-queue-page__spots-number">{spotsLeft}</div>
                  <div className="flash-queue-page__spots-meta">
                    <span className="flash-queue-page__spots-label">Spots Remaining</span>
                    <span className="flash-queue-page__spots-total">out of {event.max_spots}</span>
                  </div>
                </div>
                <div className="flash-queue-page__bar-track">
                  <div className="flash-queue-page__bar-fill" style={{ width: `${fillPct}%` }} />
                </div>
                <p className="flash-queue-page__spots-msg">{urgencyMsg}</p>
              </div>
            )
          })()}

          {event.status === 'closed' && (
            <p className="flash-queue-page__state-copy">
              This flash day has ended.<br />Keep an eye out for the next one.
            </p>
          )}

          {event.status === 'upcoming' && (
            <p className="flash-queue-page__state-copy">
              Queue opens on the day. Check back soon.
            </p>
          )}

          {event.status === 'open' && reservation && reservation.status === 'claimed' && (
            <div className="flash-queue-page__number-block">
              <p className="flash-queue-page__number">You're up!</p>
              <p className="flash-queue-page__number-label">An artist is ready for you now</p>
            </div>
          )}

          {event.status === 'open' && reservation && reservation.status === 'completed' && (
            <>
              <div className="flash-queue-page__number-block">
                <p className="flash-queue-page__number">All done!</p>
                <p className="flash-queue-page__number-label">Hope you love the piece</p>
              </div>
              <button className="flash-queue-page__cta" onClick={enrollAgain}>
                Enroll Again for Another Tattoo
              </button>
            </>
          )}

          {event.status === 'open' && reservation && reservation.status === 'waiting' && (
            <>
              <div className="flash-queue-page__number-block">
                <p className="flash-queue-page__number">{aheadCount}</p>
                <p className="flash-queue-page__number-label">
                  {aheadCount === 0 ? "You're next!" : `${aheadCount === 1 ? 'person' : 'people'} ahead of you`}
                </p>
              </div>

              <div className="flash-queue-page__notice">
                <Bell size={14} strokeWidth={1.5} />
                <span>
                  {aheadCount <= 5
                    ? "You're close! We'll notify you every time your spot moves up — get to the shop soon."
                    : "We'll notify you as your turn gets close. Show up on time — spots pass to the next person if you're late."}
                </span>
              </div>

              {error && <p className="flash-queue-page__error">{error}</p>}

              <button className="flash-queue-page__cta flash-queue-page__cta--ghost" onClick={leaveQueue} disabled={acting}>
                {acting ? 'Leaving…' : 'Leave Queue'}
              </button>
            </>
          )}

          {event.status === 'open' && !reservation && (
            <>
              <div className="flash-queue-page__number-block">
                <p className="flash-queue-page__number">{queueSize + 1}</p>
                <p className="flash-queue-page__number-label">
                  {spotsLeft > 0 ? 'You would be position' : 'Waitlist position'}
                </p>
              </div>

              {!!event.total_designs && (
                <div className="flash-queue-page__tattoo-picker">
                  <p className="flash-queue-page__tattoo-picker-copy">
                    You can choose up to two — please select the numbers below.
                  </p>
                  <div className="flash-queue-page__tattoo-dropdowns">
                    <label className="flash-queue-page__tattoo-dropdown">
                      <span>Tattoo Choice 1</span>
                      <select value={tattooChoice1} onChange={e => setTattooChoice1(e.target.value)}>
                        <option value="">Select a number…</option>
                        {Array.from({ length: event.total_designs }, (_, i) => i + 1)
                          .filter(n => String(n) !== tattooChoice2)
                          .map(n => <option key={n} value={n}>Tattoo {n}</option>)}
                      </select>
                    </label>
                    <label className="flash-queue-page__tattoo-dropdown">
                      <span>Tattoo Choice 2 <em>(optional)</em></span>
                      <select value={tattooChoice2} onChange={e => setTattooChoice2(e.target.value)}>
                        <option value="">Select a number…</option>
                        {Array.from({ length: event.total_designs }, (_, i) => i + 1)
                          .filter(n => String(n) !== tattooChoice1)
                          .map(n => <option key={n} value={n}>Tattoo {n}</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {error && <p className="flash-queue-page__error">{error}</p>}

              <button className="flash-queue-page__cta" onClick={joinQueue} disabled={acting}>
                {acting
                  ? 'Joining…'
                  : !hasSignedWaiver
                    ? 'Sign Waiver to Join'
                    : spotsLeft > 0 ? 'Join Queue' : 'Join Waitlist'}
              </button>
            </>
          )}

        </div>
      )}
    </div>
  )
}
