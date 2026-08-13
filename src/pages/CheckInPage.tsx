import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Pen, RotateCcw, Loader2, CheckCircle2, AlertCircle, CalendarDays, Clock, CheckSquare, Square } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { isStudioToday, STUDIO_TZ } from '../lib/studioTime'
import './CheckInPage.css'

type BookingDetail = {
  id: string
  appointment_at: string
  service: string
  status: string
  checked_in_at: string | null
  checkin_signature_url: string | null
  artist_id: string | null
  artist_name: string | null
  artist_email: string | null
  artist_profile_id: string | null
}

function isToday(dateStr: string) { return isStudioToday(dateStr) }

function ConsentCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="checkin__consent-row">
      <button type="button" className={`checkin__check-btn${checked ? ' checkin__check-btn--on' : ''}`} onClick={() => onChange(!checked)}>
        {checked ? <CheckSquare size={20} strokeWidth={2} /> : <Square size={20} strokeWidth={1.5} />}
      </button>
      <p className="checkin__check-label">{label}</p>
    </div>
  )
}

export function CheckInPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sigEmpty, setSigEmpty] = useState(true)

  // Form fields
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [ecName, setEcName] = useState('')
  const [ecPhone, setEcPhone] = useState('')
  const [location, setLocation] = useState('')
  const [design, setDesign] = useState('')

  // Consent checkboxes
  const [initRisks, setInitRisks] = useState(false)
  const [initWaiver, setInitWaiver] = useState(false)
  const [initAftercare, setInitAftercare] = useState(false)
  const [initNoAlcohol, setInitNoAlcohol] = useState(false)
  const [initNoMedical, setInitNoMedical] = useState(false)
  const [initPhotos, setInitPhotos] = useState(false)
  const [initAge, setInitAge] = useState(false)

  useEffect(() => {
    if (!profile?.id || !bookingId) return
    async function load() {
      // Load booking
      const { data: b } = await supabase
        .from('bookings')
        .select('id, appointment_at, service, status, checked_in_at, checkin_signature_url, tattoo_location, tattoo_design, artist_id, artists(name, email, profile_id)')
        .eq('id', bookingId)
        .eq('profile_id', profile!.id)
        .single()

      if (b) {
        const a = (b as any).artists
        setBooking({
          id: b.id, appointment_at: b.appointment_at, service: b.service,
          status: b.status, checked_in_at: b.checked_in_at ?? null,
          checkin_signature_url: (b as any).checkin_signature_url ?? null,
          artist_id: b.artist_id ?? null, artist_name: a?.name ?? null,
          artist_email: a?.email ?? null, artist_profile_id: a?.profile_id ?? null,
        })
        if (b.checked_in_at) {
          // Pre-fill tattoo details from booking record
          if ((b as any).tattoo_location) setLocation((b as any).tattoo_location)
          if ((b as any).tattoo_design) setDesign((b as any).tattoo_design)
          setDone(true)
        }
      }

      // Pre-fill from existing consent form if available
      const { data: cf } = await supabase
        .from('consent_forms')
        .select('*')
        .eq('profile_id', profile!.id)
        .maybeSingle()

      // Pre-fill from profile or saved consent form
      setFullName(cf?.full_name ?? profile!.full_name ?? '')
      setEmail(cf?.email ?? (profile as any).email ?? '')
      setPhone(cf?.phone ?? (profile as any).phone ?? '')
      setDob(cf?.date_of_birth ?? '')
      setAddress(cf?.address ?? '')
      setEcName(cf?.emergency_contact_name ?? '')
      setEcPhone(cf?.emergency_contact_phone ?? '')

      if (cf?.init_risks) setInitRisks(true)
      if (cf?.init_waiver) setInitWaiver(true)
      if (cf?.init_aftercare) setInitAftercare(true)
      if (cf?.init_no_alcohol) setInitNoAlcohol(true)
      if (cf?.init_no_medical) setInitNoMedical(true)
      if (cf?.init_photos) setInitPhotos(true)
      if (cf?.init_age) setInitAge(true)

      // Pre-fill from saved signature if available
      if (cf?.signature_data_url && canvasRef.current) {
        const img = new Image()
        img.onload = () => { canvasRef.current?.getContext('2d')?.drawImage(img, 0, 0) }
        img.src = cf.signature_data_url
        setSigEmpty(false)
      }

      setLoading(false)
    }
    load()
  }, [profile?.id, bookingId])

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy }
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
  }
  function startDraw(e: React.MouseEvent | React.TouchEvent) { e.preventDefault(); isDrawing.current = true; lastPos.current = getPos(e); setSigEmpty(false) }
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
  function clearSig() { canvasRef.current?.getContext('2d')?.clearRect(0, 0, 600, 160); setSigEmpty(true) }

  async function submit() {
    if (!booking || !profile) return
    if (!fullName.trim()) { setError('Full name is required.'); return }
    if (!dob.trim()) { setError('Date of birth is required.'); return }
    if (!phone.trim()) { setError('Phone number is required.'); return }
    if (!address.trim()) { setError('Address is required.'); return }
    if (!ecName.trim()) { setError('Emergency contact name is required.'); return }
    if (!ecPhone.trim()) { setError('Emergency contact phone is required.'); return }
    if (!location.trim()) { setError('Please enter the tattoo location.'); return }
    if (!design.trim()) { setError('Please enter the tattoo design/description.'); return }
    if (![initRisks, initWaiver, initAftercare, initNoAlcohol, initNoMedical, initPhotos, initAge].every(Boolean)) {
      setError('You must check all consent boxes before checking in.'); return
    }
    if (sigEmpty) { setError('Please sign the form before checking in.'); return }

    setSubmitting(true); setError(null)

    const dataUrl = canvasRef.current!.toDataURL('image/png')
    const blob = await (await fetch(dataUrl)).blob()
    const sigPath = `${profile.id}/checkin-${booking.id}.png`
    await supabase.storage.from('avatars').upload(sigPath, blob, { upsert: true, contentType: 'image/png' })
    const { data: sigData } = supabase.storage.from('avatars').getPublicUrl(sigPath)

    const now = new Date().toISOString()

    // Upsert full consent form so artist sees complete waiver
    await supabase.from('consent_forms').upsert({
      profile_id: profile.id,
      full_name: fullName.trim(),
      date_of_birth: dob.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      emergency_contact_name: ecName.trim(),
      emergency_contact_phone: ecPhone.trim(),
      init_risks: initRisks ? 'agreed' : '',
      init_waiver: initWaiver ? 'agreed' : '',
      init_aftercare: initAftercare ? 'agreed' : '',
      init_no_alcohol: initNoAlcohol ? 'agreed' : '',
      init_no_medical: initNoMedical ? 'agreed' : '',
      init_photos: initPhotos ? 'agreed' : '',
      init_age: initAge ? 'agreed' : '',
      signature_data_url: sigData.publicUrl,
      signed_at: now,
    }, { onConflict: 'profile_id' })

    // Update booking with check-in details
    const { error: dbErr } = await supabase.from('bookings').update({
      tattoo_location: location.trim(),
      tattoo_design: design.trim(),
      checkin_signature_url: sigData.publicUrl,
      checked_in_at: now,
      status: 'confirmed',
    }).eq('id', booking.id)

    if (dbErr) { setError(dbErr.message); setSubmitting(false); return }

    // Notify artist
    if (booking.artist_profile_id) {
      const apptLabel = new Date(booking.appointment_at).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
      await supabase.from('notifications').insert({
        profile_id: booking.artist_profile_id,
        title: 'Client Checked In',
        body: `${fullName.trim()} has checked in for their ${booking.service} on ${apptLabel}. Consent form is ready.`,
        type: 'booking',
      })
    }

    setDone(true); setSubmitting(false)
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
          {new Date(booking.appointment_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: STUDIO_TZ })}
        </p>
      </div>
    </div>
  )

  if (done) return (
    <div className="page checkin-page">
      <PageHeader title="Consent Form" backTo="/bookings" />
      <div className="checkin__body">
        <div className="checkin__done-banner">
          <CheckCircle2 size={22} strokeWidth={2} />
          <span>Checked in — form signed and submitted</span>
        </div>

        {/* Read-only summary of what was signed */}
        {fullName && (
          <>
            <section className="checkin__section">
              <h3 className="checkin__section-title">Personal Details</h3>
              <div className="checkin__ro-row"><span>Name</span><span>{fullName}</span></div>
              {dob && <div className="checkin__ro-row"><span>Date of Birth</span><span>{dob}</span></div>}
              {phone && <div className="checkin__ro-row"><span>Phone</span><span>{phone}</span></div>}
              {email && <div className="checkin__ro-row"><span>Email</span><span>{email}</span></div>}
              {address && <div className="checkin__ro-row"><span>Address</span><span>{address}</span></div>}
            </section>
            {(ecName || ecPhone) && (
              <section className="checkin__section">
                <h3 className="checkin__section-title">Emergency Contact</h3>
                {ecName && <div className="checkin__ro-row"><span>Name</span><span>{ecName}</span></div>}
                {ecPhone && <div className="checkin__ro-row"><span>Phone</span><span>{ecPhone}</span></div>}
              </section>
            )}
            {(location || design) && (
              <section className="checkin__section">
                <h3 className="checkin__section-title">Today's Tattoo</h3>
                {location && <div className="checkin__ro-row"><span>Location</span><span>{location}</span></div>}
                {design && <div className="checkin__ro-row"><span>Design</span><span>{design}</span></div>}
              </section>
            )}
            <section className="checkin__section">
              <h3 className="checkin__section-title">Consent — All Agreed</h3>
              <div className="checkin__consent-list">
                {[
                  [initRisks,      'Risks acknowledged'],
                  [initWaiver,     'Waiver and release agreed'],
                  [initAftercare,  'Aftercare instructions understood'],
                  [initNoAlcohol,  'Not under influence of alcohol or drugs'],
                  [initNoMedical,  'No medical conditions disclosed'],
                  [initPhotos,     'Photo release agreed'],
                  [initAge,        'Age 18+ confirmed'],
                ].map(([checked, label], i) => (
                  <div key={i} className="checkin__consent-row" style={{ opacity: checked ? 1 : 0.45 }}>
                    <CheckSquare size={18} strokeWidth={2} style={{ color: checked ? 'var(--gold)' : 'var(--text-dim)', flexShrink: 0 }} />
                    <p className="checkin__check-label" style={{ fontSize: '0.82rem' }}>{label as string}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="checkin__section">
              <h3 className="checkin__section-title">Signature</h3>
              {booking?.checkin_signature_url ? (
                <img src={booking.checkin_signature_url} alt="Signature" className="checkin__sig-img" />
              ) : !sigEmpty && canvasRef.current ? (
                <img src={canvasRef.current.toDataURL()} alt="Signature" className="checkin__sig-img" />
              ) : null}
              {booking?.checked_in_at && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 6 }}>
                  Signed {new Date(booking.checked_in_at).toLocaleString('en-US')}
                </p>
              )}
            </section>
          </>
        )}
        <button type="button" className="checkin__done-btn" onClick={() => navigate('/bookings')}>Back to Bookings</button>
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
      <PageHeader title="Check In & Consent Form" backTo="/bookings" />

      <div className="checkin__body">

        {/* Appointment card */}
        <div className="checkin__appt-card">
          <p className="checkin__appt-label">TODAY'S APPOINTMENT</p>
          <p className="checkin__appt-service">{booking.service}</p>
          {booking.artist_name && <p className="checkin__appt-artist">with {booking.artist_name}</p>}
          <div className="checkin__appt-meta">
            <span><CalendarDays size={13} strokeWidth={1.5} />
              {new Date(booking.appointment_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: STUDIO_TZ })}
            </span>
            <span><Clock size={13} strokeWidth={1.5} />
              {new Date(booking.appointment_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: STUDIO_TZ })}
            </span>
          </div>
        </div>

        <p className="checkin__intro">Please complete and sign the consent form below before checking in. All fields are required.</p>

        {/* Personal details */}
        <section className="checkin__section">
          <h3 className="checkin__section-title">Personal Details</h3>
          <div className="checkin__field">
            <label className="checkin__label">Full Name *</label>
            <input className="checkin__input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full legal name" />
          </div>
          <div className="checkin__field">
            <label className="checkin__label">Date of Birth *</label>
            <input className="checkin__input" type="date" value={dob} onChange={e => setDob(e.target.value)} />
          </div>
          <div className="checkin__field">
            <label className="checkin__label">Phone *</label>
            <input className="checkin__input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
          </div>
          <div className="checkin__field">
            <label className="checkin__label">Email</label>
            <input className="checkin__input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div className="checkin__field">
            <label className="checkin__label">Address *</label>
            <input className="checkin__input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, ZIP" />
          </div>
        </section>

        {/* Emergency contact */}
        <section className="checkin__section">
          <h3 className="checkin__section-title">Emergency Contact</h3>
          <div className="checkin__field">
            <label className="checkin__label">Name *</label>
            <input className="checkin__input" value={ecName} onChange={e => setEcName(e.target.value)} placeholder="Contact full name" />
          </div>
          <div className="checkin__field">
            <label className="checkin__label">Phone *</label>
            <input className="checkin__input" type="tel" value={ecPhone} onChange={e => setEcPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
          </div>
        </section>

        {/* Tattoo details */}
        <section className="checkin__section">
          <h3 className="checkin__section-title">Today's Tattoo</h3>
          <div className="checkin__field">
            <label className="checkin__label">Location on Body *</label>
            <input className="checkin__input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Left forearm, Upper back" />
          </div>
          <div className="checkin__field">
            <label className="checkin__label">Design / Description *</label>
            <input className="checkin__input" value={design} onChange={e => setDesign(e.target.value)} placeholder="e.g. Traditional rose, Geometric wolf" />
          </div>
        </section>

        {/* Consent checkboxes */}
        <section className="checkin__section">
          <h3 className="checkin__section-title">Consent — Check All Items</h3>
          <p className="checkin__section-note">All boxes must be checked to complete check-in.</p>
          <div className="checkin__consent-list">
            <ConsentCheckbox checked={initRisks} onChange={setInitRisks}
              label="I have been fully informed of the inherent risks associated with getting a tattoo, including infections, scarring, and allergic reactions. I accept and assume all risks." />
            <ConsentCheckbox checked={initWaiver} onChange={setInitWaiver}
              label="I WAIVE AND RELEASE the artist and studio from all liability for personal injury or damages. I have had the full opportunity to ask questions about my tattoo." />
            <ConsentCheckbox checked={initAftercare} onChange={setInitAftercare}
              label="I have received aftercare instructions. I understand that tattoos can become infected if instructions are not followed, and any touch-up work due to my negligence is at my own expense." />
            <ConsentCheckbox checked={initNoAlcohol} onChange={setInitNoAlcohol}
              label="I am NOT under the influence of alcohol or drugs. I am voluntarily submitting to be tattooed without duress or coercion." />
            <ConsentCheckbox checked={initNoMedical} onChange={setInitNoMedical}
              label="I do not have diabetes, epilepsy, hemophilia, a heart condition, or any medical condition that may interfere with tattooing. I am not pregnant or nursing." />
            <ConsentCheckbox checked={initPhotos} onChange={setInitPhotos}
              label="I release all rights to any photographs taken of me and my tattoo and consent to their use in print or electronic form by the studio." />
            <ConsentCheckbox checked={initAge} onChange={setInitAge}
              label="I declare that I am 18 or older and have provided valid proof of age. I HAVE READ AND UNDERSTOOD this entire agreement and AGREE TO BE BOUND BY IT." />
          </div>
        </section>

        {/* Signature */}
        <section className="checkin__section">
          <h3 className="checkin__section-title">Signature</h3>
          <p className="checkin__section-note">Sign below to confirm you have read and agreed to all items above.</p>
          <div className="checkin__sig-wrap">
            <canvas
              ref={canvasRef} width={600} height={150} className="checkin__sig-canvas"
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
            />
            {sigEmpty && <p className="checkin__sig-placeholder"><Pen size={14} strokeWidth={1.5} /> Sign here</p>}
            <button type="button" className="checkin__sig-clear" onClick={clearSig}>
              <RotateCcw size={13} strokeWidth={1.5} /> Clear
            </button>
          </div>
        </section>

        {error && <p className="checkin__error">{error}</p>}

        <button type="button" className="checkin__submit" onClick={submit} disabled={submitting}>
          {submitting
            ? <><Loader2 size={16} className="checkin__spin" /> Submitting…</>
            : <><CheckCircle2 size={16} /> Complete Check-In</>}
        </button>

        <button type="button" className="checkin__cancel-link" onClick={() => navigate('/bookings')}>
          Cancel — go back to bookings
        </button>

      </div>
    </div>
  )
}
