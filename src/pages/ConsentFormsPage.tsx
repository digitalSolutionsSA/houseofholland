import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckSquare, Square, Pen, RotateCcw, Save, Loader2, FileCheck,
  ShieldCheck, ChevronRight, FilePlus, ChevronLeft, CalendarDays,
} from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useMembership } from '../hooks/useMembership'
import { supabase } from '../lib/supabase'
import { joinFlashQueue } from '../lib/flashQueue'
import './ConsentFormsPage.css'

type FormData = {
  full_name: string
  date_of_birth: string
  address: string
  phone: string
  email: string
  emergency_contact_name: string
  emergency_contact_address: string
  emergency_contact_phone: string
  init_risks: string
  init_waiver: string
  init_aftercare: string
  init_no_alcohol: string
  init_no_medical: string
  init_photos: string
  init_age: string
}

type InitialFormRecord = FormData & {
  signature_data_url: string | null
  signed_at: string | null
}

type CheckinRecord = {
  id: string
  service: string
  appointment_at: string
  checked_in_at: string
  checkin_signature_url: string | null
  tattoo_location: string | null
  tattoo_design: string | null
}

const EMPTY: FormData = {
  full_name: '', date_of_birth: '', address: '', phone: '', email: '',
  emergency_contact_name: '', emergency_contact_address: '', emergency_contact_phone: '',
  init_risks: '', init_waiver: '', init_aftercare: '',
  init_no_alcohol: '', init_no_medical: '', init_photos: '', init_age: '',
}

const INIT_KEYS: (keyof FormData)[] = [
  'init_risks', 'init_waiver', 'init_aftercare',
  'init_no_alcohol', 'init_no_medical', 'init_photos', 'init_age',
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.map(w => w[0]).join('').toUpperCase().slice(0, 4) || 'OK'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function ConsentCheckbox({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  const checked = !!value.trim()
  return (
    <div className="consent-form__initial-row">
      <button
        type="button"
        className={`consent-form__checkbox-btn ${checked ? 'consent-form__checkbox-btn--checked' : ''}`}
        onClick={() => onChange(checked ? '' : 'agreed')}
        aria-label={`Agree to: ${label}`}
      >
        {checked
          ? <CheckSquare size={22} strokeWidth={2} className="consent-form__initial-check" />
          : <Square size={22} strokeWidth={1.5} className="consent-form__initial-empty" />
        }
      </button>
      <p className="consent-form__initial-label">{label}</p>
    </div>
  )
}

type View = 'list' | 'form' | 'detail'

export function ConsentFormsPage() {
  const { profile } = useAuth()
  const { isPremium } = useMembership()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const joinFlashEventId = searchParams.get('joinFlashEvent')
  const joinFlashTattoos = (searchParams.get('tattoos') ?? '')
    .split(',')
    .map(n => parseInt(n, 10))
    .filter(n => Number.isFinite(n))
    .slice(0, 2)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // List data
  const [initialForm, setInitialForm] = useState<InitialFormRecord | null>(null)
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])

  // Edit form state
  const [form, setForm] = useState<FormData>({ ...EMPTY })
  const [savedSigUrl, setSavedSigUrl] = useState<string | null>(null)
  const [signatureEmpty, setSignatureEmpty] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formSaved, setFormSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Navigation
  const [view, setView] = useState<View>(joinFlashEventId ? 'form' : 'list')
  const [selectedCheckin, setSelectedCheckin] = useState<CheckinRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [joiningQueue, setJoiningQueue] = useState(false)

  const isStaff = profile?.role === 'artist' || profile?.role === 'manager'

  useEffect(() => {
    if (!profile || isStaff) return

    async function load() {
      const [{ data: cf }, { data: bookings }] = await Promise.all([
        supabase
          .from('consent_forms')
          .select('*')
          .eq('profile_id', profile!.id)
          .maybeSingle(),
        supabase
          .from('bookings')
          .select('id, service, appointment_at, checked_in_at, checkin_signature_url, tattoo_location, tattoo_design')
          .eq('profile_id', profile!.id)
          .not('checked_in_at', 'is', null)
          .order('checked_in_at', { ascending: false }),
      ])

      if (cf) {
        const rec: InitialFormRecord = {
          full_name: cf.full_name ?? '',
          date_of_birth: cf.date_of_birth ?? '',
          address: cf.address ?? '',
          phone: cf.phone ?? '',
          email: cf.email ?? '',
          emergency_contact_name: cf.emergency_contact_name ?? '',
          emergency_contact_address: cf.emergency_contact_address ?? '',
          emergency_contact_phone: cf.emergency_contact_phone ?? '',
          init_risks: cf.init_risks ?? '',
          init_waiver: cf.init_waiver ?? '',
          init_aftercare: cf.init_aftercare ?? '',
          init_no_alcohol: cf.init_no_alcohol ?? '',
          init_no_medical: cf.init_no_medical ?? '',
          init_photos: cf.init_photos ?? '',
          init_age: cf.init_age ?? '',
          signature_data_url: cf.signature_data_url ?? null,
          signed_at: cf.signed_at ?? null,
        }
        setInitialForm(rec)
        setForm(rec)
        if (cf.signature_data_url) {
          setSavedSigUrl(cf.signature_data_url)
          setSignatureEmpty(false)
        }
        setFormSaved(true)

        // Already has a signed waiver on file — no need to sign again,
        // just join the flash queue immediately.
        if (joinFlashEventId && cf.signed_at) {
          completeJoinFlashEvent(joinFlashEventId)
        }
      } else {
        setForm(f => ({
          ...f,
          full_name: profile!.full_name ?? '',
          email: (profile as any).email ?? '',
          phone: (profile as any).phone ?? '',
        }))
      }

      setCheckins((bookings ?? []).map(b => ({
        id: b.id,
        service: b.service,
        appointment_at: b.appointment_at,
        checked_in_at: b.checked_in_at!,
        checkin_signature_url: (b as any).checkin_signature_url ?? null,
        tattoo_location: (b as any).tattoo_location ?? null,
        tattoo_design: (b as any).tattoo_design ?? null,
      })))

      setLoading(false)
    }

    load()
  }, [profile?.id])

  // Draw saved signature when the canvas mounts (view switches to 'form')
  useEffect(() => {
    if (view !== 'form' || !savedSigUrl) return
    requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const img = new Image()
      img.onload = () => canvas.getContext('2d')?.drawImage(img, 0, 0)
      img.src = savedSigUrl
    })
  }, [view, savedSigUrl])

  // ── Canvas drawing ──
  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    isDrawing.current = true
    lastPos.current = getPos(e)
    setSignatureEmpty(false)
    setFormSaved(false)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#d4af37'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  function endDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    isDrawing.current = false
    lastPos.current = null
  }

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureEmpty(true)
    setSavedSigUrl(null)
    setFormSaved(false)
  }

  function set(key: keyof FormData, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setFormSaved(false)
  }

  async function submit() {
    if (!profile) return
    if (!form.full_name.trim()) { setError('Full name is required.'); return }
    if (signatureEmpty) { setError('Please sign the form before submitting.'); return }

    const requiredInitials = INIT_KEYS.map(k => form[k])
    if (requiredInitials.some(i => !i.trim())) {
      setError('Please initial every checkbox before submitting.')
      return
    }

    setSaving(true)
    setError(null)

    const signatureDataUrl = canvasRef.current!.toDataURL('image/png')
    const now = new Date().toISOString()

    const payload = {
      profile_id: profile.id,
      ...form,
      signature_data_url: signatureDataUrl,
      signed_at: now,
    }

    const { error: dbErr } = await supabase
      .from('consent_forms')
      .upsert(payload, { onConflict: 'profile_id' })

    if (dbErr) { setError(dbErr.message); setSaving(false); return }

    // Update local state so the list reflects the new record
    const updated: InitialFormRecord = { ...form, signature_data_url: signatureDataUrl, signed_at: now }
    setInitialForm(updated)
    setSavedSigUrl(signatureDataUrl)
    setSignatureEmpty(false)
    setFormSaved(true)
    setSaving(false)

    if (joinFlashEventId) {
      completeJoinFlashEvent(joinFlashEventId)
      return
    }

    // Return to list so customer doesn't have to scroll up
    setView('list')
  }

  // Signing to join a flash queue — fetch the event's title/status (needed
  // for the attendance-points award) then join and land on the queue page.
  async function completeJoinFlashEvent(eventId: string) {
    if (!profile) return
    setJoiningQueue(true)
    const { data: ev } = await supabase
      .from('flash_events')
      .select('title, status')
      .eq('id', eventId)
      .single()

    if (ev) {
      await joinFlashQueue({
        eventId,
        eventTitle: ev.title,
        eventStatus: ev.status,
        profileId: profile.id,
        isPremium,
        selectedTattoos: joinFlashTattoos,
      })
    }
    navigate(`/flash-queue/${eventId}`)
  }

  const inp = (key: keyof FormData, placeholder: string, opts?: { type?: string }) => (
    <input
      className="consent-form__input"
      value={form[key]}
      onChange={e => set(key, e.target.value)}
      placeholder={placeholder}
      type={opts?.type ?? 'text'}
    />
  )

  if (profile && isStaff) return <Navigate to="/home" replace />

  if (loading || joiningQueue) {
    return (
      <div className="page consent-page">
        <PageHeader title="Consent Forms" backTo="/profile" />
        <div className="consent-form__loading">
          <Loader2 size={24} className="consent-form__spin" />
          {joiningQueue && <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Joining the flash queue…</p>}
        </div>
      </div>
    )
  }

  // ── Detail view ──
  if (view === 'detail' && selectedCheckin) {
    return (
      <div className="page consent-page">
        <PageHeader title="Consent Form" backTo="/profile" />
        <div className="consent-form__body">
          <button type="button" className="consent-form__back-btn" onClick={() => setView('list')}>
            <ChevronLeft size={16} strokeWidth={2} /> Back to Forms
          </button>

          <div className="consent-form__detail-banner">
            <FileCheck size={18} strokeWidth={1.5} />
            <div>
              <p className="consent-form__detail-service">{selectedCheckin.service}</p>
              <p className="consent-form__detail-date">
                Checked in {fmtDate(selectedCheckin.checked_in_at)}
              </p>
            </div>
          </div>

          {(selectedCheckin.tattoo_location || selectedCheckin.tattoo_design) && (
            <section className="consent-form__section" style={{ borderTop: '1px solid rgba(212,175,55,0.15)', borderRadius: 14 }}>
              <h3 className="consent-form__section-title">Tattoo Details</h3>
              {selectedCheckin.tattoo_location && (
                <div className="consent-form__ro-row">
                  <span>Location</span>
                  <span>{selectedCheckin.tattoo_location}</span>
                </div>
              )}
              {selectedCheckin.tattoo_design && (
                <div className="consent-form__ro-row">
                  <span>Design</span>
                  <span>{selectedCheckin.tattoo_design}</span>
                </div>
              )}
            </section>
          )}

          {initialForm && (
            <section className="consent-form__section" style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
              <h3 className="consent-form__section-title">Personal Details</h3>
              {initialForm.full_name && <div className="consent-form__ro-row"><span>Name</span><span>{initialForm.full_name}</span></div>}
              {initialForm.phone && <div className="consent-form__ro-row"><span>Phone</span><span>{initialForm.phone}</span></div>}
              {initialForm.email && <div className="consent-form__ro-row"><span>Email</span><span>{initialForm.email}</span></div>}
            </section>
          )}

          <section className="consent-form__section" style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
            <h3 className="consent-form__section-title">Consent — All Agreed</h3>
            <div className="consent-form__initials-list">
              {[
                'Risks acknowledged',
                'Waiver and release agreed',
                'Aftercare instructions understood',
                'Not under influence of alcohol or drugs',
                'No medical conditions that interfere with tattooing',
                'Photo release agreed',
                'Age 18+ confirmed',
              ].map((label) => (
                <div key={label} className="consent-form__initial-row">
                  <CheckSquare size={20} strokeWidth={2} className="consent-form__initial-check" style={{ flexShrink: 0 }} />
                  <p className="consent-form__initial-label">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {selectedCheckin.checkin_signature_url && (
            <section className="consent-form__section" style={{ borderTop: '1px solid rgba(212,175,55,0.15)', borderRadius: '0 0 14px 14px' }}>
              <h3 className="consent-form__section-title">Signature</h3>
              <img
                src={selectedCheckin.checkin_signature_url}
                alt="Signature"
                style={{ maxWidth: '100%', borderRadius: 8, background: 'rgba(0,0,0,0.4)' }}
              />
            </section>
          )}
        </div>
      </div>
    )
  }

  // ── Edit / sign form view ──
  if (view === 'form') {
    return (
      <div className="page consent-page">
        <PageHeader title="Consent Form" backTo="/profile" />

        <div className="consent-form__body">
          <button
            type="button"
            className="consent-form__back-btn"
            onClick={() => joinFlashEventId ? navigate(`/flash-queue/${joinFlashEventId}`) : setView('list')}
          >
            <ChevronLeft size={16} strokeWidth={2} /> {joinFlashEventId ? 'Back to Flash Day' : 'Back to Forms'}
          </button>

          {joinFlashEventId && (
            <div className="consent-form__signed-banner">
              <ShieldCheck size={18} strokeWidth={1.5} />
              <span>Sign this waiver to join the flash queue.</span>
            </div>
          )}

          {formSaved && initialForm?.signed_at && (
            <div className="consent-form__signed-banner">
              <ShieldCheck size={18} strokeWidth={1.5} />
              <span>Form signed on {fmtDate(initialForm.signed_at)}</span>
            </div>
          )}

          {/* Studio header */}
          <div className="consent-form__studio-header">
            <p className="consent-form__studio-name">HOUSE OF HOLLAND TATTOO EMPORIUM, LLC</p>
            <h2 className="consent-form__form-title">WAIVER, RELEASE AND CONSENT TO TATTOO</h2>
            <p className="consent-form__form-subtitle">
              PLEASE READ AND BE CERTAIN YOU UNDERSTAND THE IMPLICATIONS OF SIGNING
            </p>
            <p className="consent-form__form-note">
              This document is two pages. Please initial each provision on the lines provided after reading
              to show that you understand and have read each provision.
            </p>
          </div>

          {/* Personal details */}
          <section className="consent-form__section">
            <h3 className="consent-form__section-title">Personal Details</h3>
            <div className="consent-form__row">
              <div className="consent-form__field">
                <label className="consent-form__label">Full Name *</label>
                {inp('full_name', 'Clearly print your full name')}
              </div>
              <div className="consent-form__field">
                <label className="consent-form__label">Date of Birth</label>
                {inp('date_of_birth', 'MM/DD/YYYY', { type: 'date' })}
              </div>
            </div>
            <div className="consent-form__field">
              <label className="consent-form__label">Address</label>
              {inp('address', 'Street, City, State, ZIP')}
            </div>
            <div className="consent-form__row">
              <div className="consent-form__field">
                <label className="consent-form__label">Phone</label>
                {inp('phone', '+1 (555) 000-0000', { type: 'tel' })}
              </div>
              <div className="consent-form__field">
                <label className="consent-form__label">Email</label>
                {inp('email', 'your@email.com', { type: 'email' })}
              </div>
            </div>
          </section>

          {/* Consent checkboxes */}
          <section className="consent-form__section">
            <h3 className="consent-form__section-title">Consent — Please Agree to Each Item</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <p className="consent-form__section-note" style={{ marginBottom: 0 }}>
                Check each box to confirm you have read and understood each provision.
              </p>
              <button
                type="button"
                className="consent-form__check-all-btn"
                onClick={() => {
                  const initials = getInitials(form.full_name)
                  const patch = Object.fromEntries(INIT_KEYS.map(k => [k, initials])) as Partial<FormData>
                  setForm(f => ({ ...f, ...patch }))
                  setFormSaved(false)
                }}
              >
                <CheckSquare size={14} strokeWidth={2} />
                Check All
              </button>
            </div>

            <div className="consent-form__initials-list">
              <ConsentCheckbox
                value={form.init_risks}
                onChange={v => set('init_risks', v)}
                label="I have been fully informed of the inherent risks associated with getting a tattoo, including but not limited to infections, scarring, difficulties in detecting melanoma and allergic reactions to tattoo pigment. I fully understand these risks, known and unknown, can lead to injury. Having been informed, I freely accept and expressly assume all risks."
              />
              <ConsentCheckbox
                value={form.init_waiver}
                onChange={v => set('init_waiver', v)}
                label="I WAIVE AND RELEASE the Artist and Tattoo Studio from all liability for personal injury or otherwise, including any direct and/or consequential damages. Both the artist and the Tattoo Studio have given me the full opportunity to ask any and all questions about the application of my tattoo."
              />
              <ConsentCheckbox
                value={form.init_aftercare}
                onChange={v => set('init_aftercare', v)}
                label="The Artist and the Tattoo Studio have given me instructions on the aftercare of my tattoo. I acknowledge that tattoos can become infected, particularly if I do not follow the instructions given to me. If any touch-up work is needed due to my own negligence, I agree that the work will be done at my own expense."
              />
              <ConsentCheckbox
                value={form.init_no_alcohol}
                onChange={v => set('init_no_alcohol', v)}
                label="I am not under the influence of alcohol or drugs. I am voluntarily submitting to be tattooed by the Artist without duress or coercion."
              />
              <ConsentCheckbox
                value={form.init_no_medical}
                onChange={v => set('init_no_medical', v)}
                label="I do not have diabetes, epilepsy, hemophilia, a heart condition, nor do I take blood thinning medication. I do not have any other medical or skin condition that may interfere with the application or healing of the tattoo. I am not the recipient of an organ or bone marrow transplant. I am not pregnant or nursing. I do not have a mental impairment that may affect my judgment in getting this tattoo. No head, neck, or face tattoos will be done."
              />
              <ConsentCheckbox
                value={form.init_photos}
                onChange={v => set('init_photos', v)}
                label="I release all rights to any photographs taken of me and the tattoo and give consent in advance their reproduction in print or electronic form. If you do not wish to have photos taken, please advise the Artist and remind the Tattoo Studio NOT to take any pictures of you and your completed tattoo."
              />
              <ConsentCheckbox
                value={form.init_age}
                onChange={v => set('init_age', v)}
                label="I hereby declare that I am of legal age, 18 or older (and have provided valid proof of age) and am competent to sign this agreement. I HAVE READ THIS AGREEMENT as well as the grievance and complaint procedure. I UNDERSTAND IT. I AGREE TO BE BOUND BY IT."
              />
            </div>
          </section>

          {/* Emergency contact */}
          <section className="consent-form__section">
            <h3 className="consent-form__section-title">Emergency Contact</h3>
            <div className="consent-form__row">
              <div className="consent-form__field">
                <label className="consent-form__label">Name</label>
                {inp('emergency_contact_name', 'Contact full name')}
              </div>
              <div className="consent-form__field">
                <label className="consent-form__label">Phone</label>
                {inp('emergency_contact_phone', '+1 (555) 000-0000', { type: 'tel' })}
              </div>
            </div>
            <div className="consent-form__field">
              <label className="consent-form__label">Address</label>
              {inp('emergency_contact_address', 'Street, City, State, ZIP')}
            </div>
          </section>

          {/* Signature */}
          <section className="consent-form__section">
            <h3 className="consent-form__section-title">Digital Signature</h3>
            <p className="consent-form__section-note">
              Sign in the box below using your finger or mouse. By signing you agree to all the above provisions.
            </p>

            <div className="consent-form__sig-wrap">
              <canvas
                ref={canvasRef}
                width={600}
                height={160}
                className={`consent-form__sig-canvas ${signatureEmpty ? 'consent-form__sig-canvas--empty' : ''}`}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {signatureEmpty && (
                <p className="consent-form__sig-placeholder">
                  <Pen size={14} strokeWidth={1.5} /> Sign here
                </p>
              )}
              <button type="button" className="consent-form__sig-clear" onClick={clearSignature} title="Clear signature">
                <RotateCcw size={14} strokeWidth={1.5} /> Clear
              </button>
            </div>
          </section>

          {/* Disclaimer */}
          <div className="consent-form__disclaimer">
            <p>
              <strong>Please be sure you have eaten some real food before being tattooed!</strong>
            </p>
            <p style={{ marginTop: 8 }}>
              For complaints and grievances contact S.C. DPH 2600 Bull Street Columbia, SC 29201 (803) 898-3432
            </p>
          </div>

          {error && <p className="consent-form__error">{error}</p>}

          <button
            type="button"
            className="consent-form__submit-btn"
            onClick={submit}
            disabled={saving}
          >
            {saving ? (
              <><Loader2 size={16} className="consent-form__spin" /> Saving…</>
            ) : formSaved ? (
              <><FileCheck size={16} /> Update Signature</>
            ) : (
              <><Save size={16} /> Sign & Submit Form</>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── List view (default) ──
  const totalForms = (initialForm?.signed_at ? 1 : 0) + checkins.length

  return (
    <div className="page consent-page">
      <PageHeader title="Consent Forms" backTo="/profile" />

      <div className="consent-form__body">

        {totalForms === 0 ? (
          /* No forms yet — prompt to sign */
          <div className="consent-form__empty-state">
            <ShieldCheck size={40} strokeWidth={1.2} style={{ color: 'rgba(212,175,55,0.4)' }} />
            <p>You haven't signed a consent form yet.</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Your initial form is required before your first tattoo appointment.
            </p>
            <button
              type="button"
              className="consent-form__submit-btn"
              style={{ marginTop: 20 }}
              onClick={() => setView('form')}
            >
              <FilePlus size={16} /> Sign Initial Form
            </button>
          </div>
        ) : (
          <div className="consent-form__list">

            {/* Initial consent form card */}
            <button
              type="button"
              className="consent-form__list-card"
              onClick={() => setView('form')}
            >
              <div className="consent-form__list-icon consent-form__list-icon--initial">
                <ShieldCheck size={20} strokeWidth={1.5} />
              </div>
              <div className="consent-form__list-info">
                <p className="consent-form__list-title">Initial Consent Form</p>
                <p className="consent-form__list-sub">
                  {initialForm?.signed_at
                    ? <>Signed {fmtDate(initialForm.signed_at)}</>
                    : <span style={{ color: 'var(--gold)' }}>Not yet signed — tap to complete</span>
                  }
                </p>
              </div>
              <ChevronRight size={18} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>

            {/* Check-in form cards */}
            {checkins.map(c => (
              <button
                key={c.id}
                type="button"
                className="consent-form__list-card"
                onClick={() => { setSelectedCheckin(c); setView('detail') }}
              >
                <div className="consent-form__list-icon consent-form__list-icon--checkin">
                  <CalendarDays size={20} strokeWidth={1.5} />
                </div>
                <div className="consent-form__list-info">
                  <p className="consent-form__list-title">{c.service}</p>
                  <p className="consent-form__list-sub">
                    Checked in {fmtDate(c.checked_in_at)}
                  </p>
                </div>
                <ChevronRight size={18} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </button>
            ))}

          </div>
        )}

      </div>
    </div>
  )
}
