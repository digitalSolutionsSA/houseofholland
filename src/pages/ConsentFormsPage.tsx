import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CheckSquare, Square, Pen, RotateCcw, Save, Loader2, FileCheck, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
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

const EMPTY: FormData = {
  full_name: '', date_of_birth: '', address: '', phone: '', email: '',
  emergency_contact_name: '', emergency_contact_address: '', emergency_contact_phone: '',
  init_risks: '', init_waiver: '', init_aftercare: '',
  init_no_alcohol: '', init_no_medical: '', init_photos: '', init_age: '',
}

function InitialBox({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="consent-form__initial-row">
      <div className="consent-form__initial-box">
        {value ? (
          <CheckSquare size={16} strokeWidth={2} className="consent-form__initial-check" />
        ) : (
          <Square size={16} strokeWidth={1.5} className="consent-form__initial-empty" />
        )}
        <input
          className="consent-form__initial-input"
          value={value}
          onChange={e => onChange(e.target.value.slice(0, 4).toUpperCase())}
          placeholder="Init."
          maxLength={4}
          aria-label={`Initials for: ${label}`}
        />
      </div>
      <p className="consent-form__initial-label">{label}</p>
    </div>
  )
}

export function ConsentFormsPage() {
  const { profile } = useAuth()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const [form, setForm] = useState<FormData>({ ...EMPTY })
  const [signatureEmpty, setSignatureEmpty] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [signedAt, setSignedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const isStaff = profile?.role === 'artist' || profile?.role === 'manager'

  // Pre-fill from profile and load any existing submission
  useEffect(() => {
    if (!profile || isStaff) return
    setForm(f => ({
      ...f,
      full_name: profile.full_name ?? '',
      email: profile.email ?? '',
      phone: (profile as any).phone ?? '',
    }))

    supabase
      .from('consent_forms')
      .select('*')
      .eq('profile_id', profile.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name ?? '',
            date_of_birth: data.date_of_birth ?? '',
            address: data.address ?? '',
            phone: data.phone ?? '',
            email: data.email ?? '',
            emergency_contact_name: data.emergency_contact_name ?? '',
            emergency_contact_address: data.emergency_contact_address ?? '',
            emergency_contact_phone: data.emergency_contact_phone ?? '',
            init_risks: data.init_risks ?? '',
            init_waiver: data.init_waiver ?? '',
            init_aftercare: data.init_aftercare ?? '',
            init_no_alcohol: data.init_no_alcohol ?? '',
            init_no_medical: data.init_no_medical ?? '',
            init_photos: data.init_photos ?? '',
            init_age: data.init_age ?? '',
          })
          if (data.signature_data_url) {
            drawSavedSignature(data.signature_data_url)
            setSignatureEmpty(false)
          }
          setSignedAt(data.signed_at ?? null)
          setSaved(true)
        }
        setLoading(false)
      })
  }, [profile?.id])

  function drawSavedSignature(dataUrl: string) {
    const canvas = canvasRef.current
    if (!canvas) return
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.drawImage(img, 0, 0)
    }
    img.src = dataUrl
  }

  // ── Signature canvas drawing ──
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
    setSaved(false)
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
    setSaved(false)
  }

  function set(key: keyof FormData, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function submit() {
    if (!profile) return
    if (!form.full_name.trim()) { setError('Full name is required.'); return }
    if (signatureEmpty) { setError('Please sign the form before submitting.'); return }

    const requiredInitials = [
      form.init_risks, form.init_waiver, form.init_aftercare,
      form.init_no_alcohol, form.init_no_medical, form.init_photos, form.init_age,
    ]
    if (requiredInitials.some(i => !i.trim())) {
      setError('Please initial every checkbox before submitting.')
      return
    }

    setSaving(true)
    setError(null)

    const signatureDataUrl = canvasRef.current!.toDataURL('image/png')

    const payload = {
      profile_id: profile.id,
      ...form,
      signature_data_url: signatureDataUrl,
      signed_at: new Date().toISOString(),
    }

    const { error: dbErr } = await supabase
      .from('consent_forms')
      .upsert(payload, { onConflict: 'profile_id' })

    if (dbErr) { setError(dbErr.message); setSaving(false); return }

    setSaved(true)
    setSignedAt(new Date().toISOString())
    setSaving(false)
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

  // Artists and managers don't sign waivers — redirect after all hooks have run
  if (profile && isStaff) return <Navigate to="/home" replace />

  if (loading) {
    return (
      <div className="page consent-page">
        <PageHeader title="Consent Form" backTo="/profile" />
        <div className="consent-form__loading"><Loader2 size={24} className="consent-form__spin" /></div>
      </div>
    )
  }

  return (
    <div className="page consent-page">
      <PageHeader title="Consent Form" backTo="/profile" />

      {saved && signedAt && (
        <div className="consent-form__signed-banner">
          <ShieldCheck size={18} strokeWidth={1.5} />
          <span>Form signed on {new Date(signedAt).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
          })}</span>
        </div>
      )}

      <div className="consent-form__body">

        {/* ── Studio header ── */}
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

        {/* ── Personal details ── */}
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

        {/* ── Consent checkboxes ── */}
        <section className="consent-form__section">
          <h3 className="consent-form__section-title">Consent — Please Initial Each Item</h3>
          <p className="consent-form__section-note">
            Type your initials in each box to confirm you have read and understood each provision.
          </p>

          <div className="consent-form__initials-list">
            <InitialBox
              value={form.init_risks}
              onChange={v => set('init_risks', v)}
              label="I have been fully informed of the inherent risks associated with getting a tattoo, including but not limited to infections, scarring, difficulties in detecting melanoma and allergic reactions to tattoo pigment. I fully understand these risks, known and unknown, can lead to injury. Having been informed, I freely accept and expressly assume all risks."
            />
            <InitialBox
              value={form.init_waiver}
              onChange={v => set('init_waiver', v)}
              label="I WAIVE AND RELEASE the Artist and Tattoo Studio from all liability for personal injury or otherwise, including any direct and/or consequential damages. Both the artist and the Tattoo Studio have given me the full opportunity to ask any and all questions about the application of my tattoo."
            />
            <InitialBox
              value={form.init_aftercare}
              onChange={v => set('init_aftercare', v)}
              label="The Artist and the Tattoo Studio have given me instructions on the aftercare of my tattoo. I acknowledge that tattoos can become infected, particularly if I do not follow the instructions given to me. If any touch-up work is needed due to my own negligence, I agree that the work will be done at my own expense."
            />
            <InitialBox
              value={form.init_no_alcohol}
              onChange={v => set('init_no_alcohol', v)}
              label="I am not under the influence of alcohol or drugs. I am voluntarily submitting to be tattooed by the Artist without duress or coercion."
            />
            <InitialBox
              value={form.init_no_medical}
              onChange={v => set('init_no_medical', v)}
              label="I do not have diabetes, epilepsy, hemophilia, a heart condition, nor do I take blood thinning medication. I do not have any other medical or skin condition that may interfere with the application or healing of the tattoo. I am not the recipient of an organ or bone marrow transplant. I am not pregnant or nursing. I do not have a mental impairment that may affect my judgment in getting this tattoo. No head, neck, or face tattoos will be done."
            />
            <InitialBox
              value={form.init_photos}
              onChange={v => set('init_photos', v)}
              label="I release all rights to any photographs taken of me and the tattoo and give consent in advance their reproduction in print or electronic form. If you do not wish to have photos taken, please advise the Artist and remind the Tattoo Studio NOT to take any pictures of you and your completed tattoo."
            />
            <InitialBox
              value={form.init_age}
              onChange={v => set('init_age', v)}
              label="I hereby declare that I am of legal age, 18 or older (and have provided valid proof of age) and am competent to sign this agreement. I HAVE READ THIS AGREEMENT as well as the grievance and complaint procedure. I UNDERSTAND IT. I AGREE TO BE BOUND BY IT."
            />
          </div>
        </section>

        {/* ── Emergency contact ── */}
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

        {/* ── Signature ── */}
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

        {/* ── Disclaimer ── */}
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
          ) : saved ? (
            <><FileCheck size={16} /> Update Signature</>
          ) : (
            <><Save size={16} /> Sign & Submit Form</>
          )}
        </button>

      </div>
    </div>
  )
}
