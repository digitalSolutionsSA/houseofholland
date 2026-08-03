import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Pen, RotateCcw, Loader2, CheckCircle2, AlertCircle, CalendarDays, Clock } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './CheckInPage.css'

type BookingDetail = {
  id: string
  appointment_at: string
  service: string
  status: string
  checked_in_at: string | null
  artist_id: string | null
  artist_name: string | null
  artist_email: string | null
  artist_profile_id: string | null
}

type ConsentSummary = {
  full_name: string
  date_of_birth: string | null
  phone: string | null
  address: string | null
  signed_at: string | null
  id_document_url: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  init_risks: string | null
  init_waiver: string | null
  init_aftercare: string | null
  init_no_alcohol: string | null
  init_no_medical: string | null
  init_photos: string | null
  init_age: string | null
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const t = new Date()
  return d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
}

export function CheckInPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [consent, setConsent] = useState<ConsentSummary | null>(null)
  const [location, setLocation] = useState('')
  const [design, setDesign] = useState('')
  const [sigEmpty, setSigEmpty] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id || !bookingId) return
    async function load() {
      const { data: b } = await supabase
        .from('bookings')
        .select('id, appointment_at, service, status, checked_in_at, artist_id, artists(name, email, profile_id)')
        .eq('id', bookingId)
        .eq('profile_id', profile!.id)
        .single()

      if (b) {
        const a = (b as any).artists
        setBooking({
          id: b.id,
          appointment_at: b.appointment_at,
          service: b.service,
          status: b.status,
          checked_in_at: b.checked_in_at ?? null,
          artist_id: b.artist_id ?? null,
          artist_name: a?.name ?? null,
          artist_email: a?.email ?? null,
          artist_profile_id: a?.profile_id ?? null,
        })
        if (b.checked_in_at) setDone(true)
      }

      const { data: cf } = await supabase
        .from('consent_forms')
        .select('full_name, date_of_birth, phone, address, signed_at, emergency_contact_name, emergency_contact_phone, init_risks, init_waiver, init_aftercare, init_no_alcohol, init_no_medical, init_photos, init_age')
        .eq('profile_id', profile!.id)
        .maybeSingle()

      const idUrl = (profile as any).id_document_url ?? null

      if (cf) setConsent({ ...cf, id_document_url: idUrl })

      setLoading(false)
    }
    load()
  }, [profile?.id, bookingId])

  // ── Canvas drawing ──
  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy }
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault(); isDrawing.current = true; lastPos.current = getPos(e); setSigEmpty(false)
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath(); ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.stroke(); lastPos.current = pos
  }
  function endDraw(e: React.MouseEvent | React.TouchEvent) { e.preventDefault(); isDrawing.current = false }
  function clearSig() {
    canvasRef.current?.getContext('2d')?.clearRect(0, 0, 600, 160)
    setSigEmpty(true)
  }

  function consentIncompleteReason(c: ConsentSummary | null): string | null {
    if (!c?.signed_at) return 'Your consent form has not been signed yet.'
    if (!c.full_name?.trim()) return 'Consent form is missing your full name.'
    if (!c.date_of_birth?.trim()) return 'Consent form is missing your date of birth.'
    if (!c.phone?.trim()) return 'Consent form is missing your phone number.'
    if (!c.emergency_contact_name?.trim()) return 'Consent form is missing an emergency contact name.'
    if (!c.emergency_contact_phone?.trim()) return 'Consent form is missing an emergency contact phone number.'
    const allChecked = [c.init_risks, c.init_waiver, c.init_aftercare, c.init_no_alcohol, c.init_no_medical, c.init_photos, c.init_age].every(v => v?.trim())
    if (!allChecked) return 'Not all consent boxes have been checked on your consent form.'
    return null
  }

  async function submit() {
    if (!booking || !profile) return
    if (!location.trim()) { setError('Please enter the tattoo location.'); return }
    if (!design.trim()) { setError('Please enter the tattoo design.'); return }
    if (sigEmpty) { setError('Please sign before checking in.'); return }
    const consentIssue = consentIncompleteReason(consent)
    if (consentIssue) {
      setError(`${consentIssue} Please go to Profile → Consent Forms and complete all required fields before checking in.`)
      return
    }

    setSubmitting(true); setError(null)

    // Upload check-in signature to storage
    const dataUrl = canvasRef.current!.toDataURL('image/png')
    const blob = await (await fetch(dataUrl)).blob()
    const sigPath = `${profile.id}/checkin-${booking.id}.png`
    await supabase.storage.from('avatars').upload(sigPath, blob, { upsert: true, contentType: 'image/png' })
    const { data: sigData } = supabase.storage.from('avatars').getPublicUrl(sigPath)

    // Save check-in to booking
    const { error: dbErr } = await supabase
      .from('bookings')
      .update({
        tattoo_location: location.trim(),
        tattoo_design: design.trim(),
        checkin_signature_url: sigData.publicUrl,
        checked_in_at: new Date().toISOString(),
        status: 'confirmed',
      })
      .eq('id', booking.id)

    if (dbErr) { setError(dbErr.message); setSubmitting(false); return }

    // Notify the artist via in-app notification
    if (booking.artist_profile_id) {
      const clientName = consent?.full_name ?? profile.full_name ?? 'Your client'
      const apptLabel = new Date(booking.appointment_at).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
      await supabase.from('notifications').insert({
        profile_id: booking.artist_profile_id,
        title: 'Client Checked In',
        body: `${clientName} has checked in for their ${booking.service} on ${apptLabel}. Consent form is ready.`,
        type: 'booking',
      })
    }

    // Call edge function to email the artist
    if (booking.artist_email) {
      await supabase.functions.invoke('send-checkin-email', {
        body: {
          booking_id: booking.id,
          artist_email: booking.artist_email,
          artist_name: booking.artist_name,
          customer_name: consent?.full_name ?? profile.full_name ?? 'Customer',
          customer_dob: consent?.date_of_birth ?? '',
          customer_phone: consent?.phone ?? '',
          customer_address: consent?.address ?? '',
          service: booking.service,
          appointment_at: booking.appointment_at,
          tattoo_location: location.trim(),
          tattoo_design: design.trim(),
          consent_signed_at: consent?.signed_at ?? '',
          id_document_url: consent?.id_document_url ?? '',
          signature_url: sigData.publicUrl,
        },
      })
    }

    setDone(true)
    setSubmitting(false)
  }

  if (loading) return (
    <div className="page checkin-page">
      <PageHeader title="Check In" backTo="/bookings" />
      <div className="checkin__loading"><Loader2 size={24} className="checkin__spin" /></div>
    </div>
  )

  if (!booking) return (
    <div className="page checkin-page">
      <PageHeader title="Check In" backTo="/bookings" />
      <p className="checkin__error-msg">Booking not found.</p>
    </div>
  )

  if (!isToday(booking.appointment_at) && !done) return (
    <div className="page checkin-page">
      <PageHeader title="Check In" backTo="/bookings" />
      <div className="checkin__not-today">
        <CalendarDays size={40} strokeWidth={1.2} />
        <h2>Not available yet</h2>
        <p>Check-in opens on the day of your appointment.</p>
        <p className="checkin__appt-date">
          {new Date(booking.appointment_at).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          })}
        </p>
      </div>
    </div>
  )

  if (done) return (
    <div className="page checkin-page">
      <PageHeader title="Check In" backTo="/bookings" />
      <div className="checkin__done">
        <CheckCircle2 size={56} strokeWidth={1.2} className="checkin__done-icon" />
        <h2>You're checked in!</h2>
        <p>Your consent form and ID have been sent to your artist. Please take a seat and they'll be with you shortly.</p>
        <button type="button" className="checkin__done-btn" onClick={() => navigate('/bookings')}>
          Back to Bookings
        </button>
      </div>
    </div>
  )

  if (booking.status !== 'confirmed') return (
    <div className="page checkin-page">
      <PageHeader title="Check In" backTo="/bookings" />
      <div className="checkin__not-today">
        <AlertCircle size={40} strokeWidth={1.2} />
        <h2>Booking not confirmed</h2>
        <p>Check-in is only available for confirmed appointments.</p>
      </div>
    </div>
  )

  return (
    <div className="page checkin-page">
      <PageHeader title="Check In" backTo="/bookings" />

      <div className="checkin__body">

        {/* appointment summary */}
        <div className="checkin__appt-card">
          <p className="checkin__appt-label">TODAY'S APPOINTMENT</p>
          <p className="checkin__appt-service">{booking.service}</p>
          {booking.artist_name && <p className="checkin__appt-artist">with {booking.artist_name}</p>}
          <div className="checkin__appt-meta">
            <span><CalendarDays size={13} strokeWidth={1.5} />
              {new Date(booking.appointment_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </span>
            <span><Clock size={13} strokeWidth={1.5} />
              {new Date(booking.appointment_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* consent status */}
        {(() => {
          const issue = consentIncompleteReason(consent)
          return issue ? (
            <div className="checkin__consent-warn">
              <AlertCircle size={15} strokeWidth={2} />
              <span>{issue} Go to <strong>Profile → Consent Forms</strong> to complete it.</span>
            </div>
          ) : (
            <div className="checkin__consent-ok">
              <CheckCircle2 size={15} strokeWidth={2} />
              <span>Consent form complete — signed {new Date(consent!.signed_at!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          )
        })()}

        {/* tattoo details */}
        <section className="checkin__section">
          <h3 className="checkin__section-title">Tattoo Details</h3>

          <div className="checkin__field">
            <label className="checkin__label">Location of Tattoo *</label>
            <input
              className="checkin__input"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Left forearm, Upper back"
            />
          </div>

          <div className="checkin__field">
            <label className="checkin__label">Design *</label>
            <input
              className="checkin__input"
              value={design}
              onChange={e => setDesign(e.target.value)}
              placeholder="e.g. Traditional rose, Geometric wolf"
            />
          </div>
        </section>

        {/* signature */}
        <section className="checkin__section">
          <h3 className="checkin__section-title">Sign to Confirm</h3>
          <p className="checkin__section-note">
            By signing you confirm the tattoo details above and agree to the consent form you signed on your profile.
          </p>
          <div className="checkin__sig-wrap">
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className="checkin__sig-canvas"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
            />
            {sigEmpty && (
              <p className="checkin__sig-placeholder"><Pen size={14} strokeWidth={1.5} /> Sign here</p>
            )}
            <button type="button" className="checkin__sig-clear" onClick={clearSig}>
              <RotateCcw size={13} strokeWidth={1.5} /> Clear
            </button>
          </div>
        </section>

        {error && <p className="checkin__error">{error}</p>}

        <button type="button" className="checkin__submit" onClick={submit} disabled={submitting}>
          {submitting
            ? <><Loader2 size={16} className="checkin__spin" /> Checking in…</>
            : <><CheckCircle2 size={16} /> Complete Check-In</>}
        </button>

      </div>
    </div>
  )
}
