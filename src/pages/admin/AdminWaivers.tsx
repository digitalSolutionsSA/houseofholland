import { useEffect, useState } from 'react'
import { FileText, ChevronDown, ChevronUp, Mail, AlertCircle, Send, Copy, Check, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

type Artist = { id: string; name: string; profile_id: string | null }

type WaiverRow = {
  booking_id: string
  appointment_at: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  consent: ConsentForm | null
}

type ConsentForm = {
  full_name: string
  date_of_birth: string | null
  address: string | null
  phone: string | null
  email: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  init_risks: boolean
  init_waiver: boolean
  init_aftercare: boolean
  init_no_alcohol: boolean
  init_no_medical: boolean
  init_photos: boolean
  init_age: boolean
  signature_data_url: string | null
  signed_at: string | null
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export function AdminWaivers() {
  const { profile } = useAuth()
  const isSuper = profile?.email?.toLowerCase() === 'info@digitalsolutionssa.co.za'

  const [tab, setTab] = useState<'today' | 'send'>('today')
  const [artists, setArtists] = useState<Artist[]>([])
  const [artistId, setArtistId] = useState('')

  // Today's waivers
  const [waivers, setWaivers] = useState<WaiverRow[]>([])
  const [waiverLoading, setWaiverLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Upcoming bookings needing a waiver
  const [upcoming, setUpcoming] = useState<WaiverRow[]>([])
  const [upcomingLoading, setUpcomingLoading] = useState(false)
  const [sendOpen, setSendOpen] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: list } = await supabase
        .from('artists').select('id, name, profile_id')
        .eq('is_active', true).order('name')
      setArtists(list ?? [])
      const mine = (list ?? []).find(a => a.profile_id === profile?.id)
      const id = mine?.id ?? (isSuper ? list?.[0]?.id ?? '' : '')
      setArtistId(id)
    }
    init()
  }, [profile?.id])

  useEffect(() => {
    if (!artistId) { setWaiverLoading(false); return }
    loadToday(artistId)
    loadUpcoming(artistId)
  }, [artistId])

  async function loadToday(aid: string) {
    setWaiverLoading(true)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999)

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, appointment_at, profile_id')
      .eq('artist_id', aid)
      .in('status', ['confirmed', 'checked_in'])
      .gte('appointment_at', todayStart.toISOString())
      .lte('appointment_at', todayEnd.toISOString())
      .order('appointment_at')

    await attachProfilesAndForms(bookings ?? [], setWaivers)
    setWaiverLoading(false)
  }

  async function loadUpcoming(aid: string) {
    setUpcomingLoading(true)
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0)

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, appointment_at, profile_id')
      .eq('artist_id', aid)
      .eq('status', 'confirmed')
      .gte('appointment_at', tomorrow.toISOString())
      .order('appointment_at')

    await attachProfilesAndForms(bookings ?? [], setUpcoming)
    setUpcomingLoading(false)
  }

  async function attachProfilesAndForms(
    bookings: any[],
    setter: (rows: WaiverRow[]) => void,
  ) {
    if (bookings.length === 0) { setter([]); return }
    const profileIds = bookings.map(b => b.profile_id).filter(Boolean)

    const [profileRes, formRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, phone').in('id', profileIds),
      supabase.from('consent_forms').select('*').in('profile_id', profileIds),
    ])

    const pMap: Record<string, any> = {}
    for (const p of profileRes.data ?? []) pMap[p.id] = p
    const fMap: Record<string, ConsentForm> = {}
    for (const f of formRes.data ?? []) fMap[f.profile_id] = f

    setter(bookings.map(b => ({
      booking_id:     b.id,
      appointment_at: b.appointment_at,
      customer_name:  pMap[b.profile_id]?.full_name ?? 'Unknown',
      customer_email: pMap[b.profile_id]?.email ?? null,
      customer_phone: pMap[b.profile_id]?.phone ?? null,
      consent:        fMap[b.profile_id] ?? null,
    })))
  }

  function waiverMessage(row: WaiverRow) {
    const appUrl = window.location.origin
    return `Hi ${row.customer_name.split(' ')[0]}, please complete your consent form before your appointment on ${fmt(row.appointment_at)}.\n\nSign in to the House of Holland app and go to Profile → Consent Forms:\n${appUrl}/consent\n\nSee you soon! 🖤`
  }

  async function copyMessage(row: WaiverRow) {
    await navigator.clipboard.writeText(waiverMessage(row))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const checkLabel = (v: boolean) =>
    v ? <span style={{ color: '#6bffb8', fontWeight: 600 }}>✓ Agreed</span>
      : <span style={{ color: '#ff6b6b' }}>✗ Not checked</span>

  function downloadConsentForm(w: WaiverRow) {
    const c = w.consent!
    const signedDate = c.signed_at
      ? new Date(c.signed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'N/A'
    const apptDate = new Date(w.appointment_at).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    const sigHtml = c.signature_data_url
      ? `<img src="${c.signature_data_url}" alt="Signature" style="max-width:400px;border:1px solid #ccc;border-radius:6px;padding:8px;background:#fff;" />`
      : '<p style="color:#999">No signature on file</p>'

    const row = (label: string, value: string) =>
      `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px;width:140px;vertical-align:top">${label}</td><td style="padding:6px 0;font-size:14px;font-weight:600">${value || '—'}</td></tr>`

    const check = (label: string, agreed: boolean) =>
      `<tr><td colspan="2" style="padding:5px 0;font-size:13px">${agreed ? '✅' : '☐'} ${label}</td></tr>`

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Consent Form — ${c.full_name}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; max-width: 760px; margin: 0 auto; padding: 32px 24px; color: #111; }
  h1 { text-align:center; font-size:18px; margin:0 0 4px; }
  h2 { text-align:center; font-size:14px; font-weight:normal; margin:0 0 24px; color:#555; }
  .section { margin-bottom:28px; }
  .section h3 { font-size:13px; text-transform:uppercase; letter-spacing:.07em; color:#888; border-bottom:1px solid #e0e0e0; padding-bottom:6px; margin-bottom:12px; }
  table { width:100%; border-collapse:collapse; }
  .print-btn { display:block; margin:0 auto 24px; padding:10px 24px; background:#222; color:#fff; border:none; border-radius:6px; font-size:14px; cursor:pointer; }
  @media print { .print-btn { display:none; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
<h1>HOUSE OF HOLLAND TATTOO EMPORIUM, LLC</h1>
<h2>WAIVER, RELEASE AND CONSENT TO TATTOO<br/><small>Appointment: ${apptDate}</small></h2>

<div class="section">
<h3>Personal Details</h3>
<table>
${row('Full Name', c.full_name)}
${row('Date of Birth', c.date_of_birth ?? '')}
${row('Address', c.address ?? '')}
${row('Phone', c.phone ?? '')}
${row('Email', c.email ?? '')}
</table>
</div>

<div class="section">
<h3>Emergency Contact</h3>
<table>
${row('Name', c.emergency_contact_name ?? '')}
${row('Phone', c.emergency_contact_phone ?? '')}
</table>
</div>

<div class="section">
<h3>Consent Items</h3>
<table>
${check('Risks acknowledged', !!c.init_risks)}
${check('Waiver and release agreed', !!c.init_waiver)}
${check('Aftercare instructions understood', !!c.init_aftercare)}
${check('Not under influence of alcohol/drugs', !!c.init_no_alcohol)}
${check('No medical conditions disclosed', !!c.init_no_medical)}
${check('Photo consent granted', !!c.init_photos)}
${check('Age 18+ confirmed', !!c.init_age)}
</table>
</div>

<div class="section">
<h3>Signature</h3>
${sigHtml}
<p style="font-size:12px;color:#888;margin-top:8px">Signed on ${signedDate}</p>
</div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Waivers</h1>
      </div>

      {isSuper && artists.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <select className="admin-modal__select" style={{ maxWidth: 240 }}
            value={artistId} onChange={e => setArtistId(e.target.value)}>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          className={`admin-btn ${tab === 'today' ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
          onClick={() => setTab('today')}
        >
          <FileText size={13} style={{ display: 'inline', marginRight: 6 }} />
          Today's Waivers
        </button>
        <button
          className={`admin-btn ${tab === 'send' ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
          onClick={() => setTab('send')}
        >
          <Send size={13} style={{ display: 'inline', marginRight: 6 }} />
          Send Waiver
        </button>
      </div>

      {/* ── TODAY'S WAIVERS TAB ── */}
      {tab === 'today' && (
        <>
          {!artistId && !waiverLoading && (
            <p className="admin-empty">Your account is not linked to an artist record.</p>
          )}
          {waiverLoading ? (
            <p className="admin-empty">Loading…</p>
          ) : waivers.length === 0 && artistId ? (
            <p className="admin-empty">No confirmed appointments today.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {waivers.map(w => (
                <div key={w.booking_id} style={{ border: '1px solid var(--border-gold)', borderRadius: 10, overflow: 'hidden' }}>
                  <button
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => setExpanded(expanded === w.booking_id ? null : w.booking_id)}
                  >
                    <FileText size={18} color="var(--gold)" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{w.customer_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{fmt(w.appointment_at)}</div>
                    </div>
                    {w.consent ? (
                      <span style={{ fontSize: '0.75rem', background: 'rgba(107,255,184,0.12)', color: '#6bffb8', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(107,255,184,0.25)' }}>Signed</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(255,107,107,0.2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <AlertCircle size={11} /> No waiver
                      </span>
                    )}
                    {expanded === w.booking_id ? <ChevronUp size={16} color="var(--gold)" /> : <ChevronDown size={16} color="var(--gold)" />}
                  </button>

                  {expanded === w.booking_id && w.consent && (
                    <div style={{ borderTop: '1px solid var(--border-gold)', padding: '18px 20px', background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                        <button
                          className="admin-btn admin-btn--ghost"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
                          onClick={() => downloadConsentForm(w)}
                        >
                          <Download size={13} /> Download / Print
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: 16 }}>
                        <Detail label="Full Name"        value={w.consent.full_name} />
                        <Detail label="Date of Birth"    value={w.consent.date_of_birth ?? '—'} />
                        <Detail label="Phone"            value={w.consent.phone ?? '—'} />
                        <Detail label="Email"            value={w.consent.email ?? '—'} />
                        <Detail label="Address"          value={w.consent.address ?? '—'} />
                        <Detail label="Emergency Contact" value={`${w.consent.emergency_contact_name ?? '—'} · ${w.consent.emergency_contact_phone ?? '—'}`} />
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Consent initials</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', marginBottom: 16, fontSize: '0.82rem' }}>
                        <div>Risks acknowledged: {checkLabel(w.consent.init_risks)}</div>
                        <div>Waiver signed: {checkLabel(w.consent.init_waiver)}</div>
                        <div>Aftercare understood: {checkLabel(w.consent.init_aftercare)}</div>
                        <div>No alcohol (24h): {checkLabel(w.consent.init_no_alcohol)}</div>
                        <div>No medical conditions: {checkLabel(w.consent.init_no_medical)}</div>
                        <div>Photo consent: {checkLabel(w.consent.init_photos)}</div>
                        <div>Age confirmed (18+): {checkLabel(w.consent.init_age)}</div>
                      </div>
                      {w.consent.signature_data_url && (
                        <div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Signature</p>
                          <img src={w.consent.signature_data_url} alt="Signature"
                            style={{ maxWidth: 320, background: '#fff', borderRadius: 6, padding: 8, border: '1px solid var(--border-gold)' }} />
                          {w.consent.signed_at && (
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
                              Signed {new Date(w.consent.signed_at).toLocaleString('en-US')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {expanded === w.booking_id && !w.consent && (
                    <div style={{ borderTop: '1px solid var(--border-gold)', padding: '16px 20px', background: 'rgba(255,107,107,0.05)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Mail size={14} /> {w.customer_email ?? 'No email on file'}
                      </div>
                      <p style={{ marginTop: 8 }}>This customer has not signed a consent form yet.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SEND WAIVER TAB ── */}
      {tab === 'send' && (
        <>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 20 }}>
            Upcoming confirmed appointments without a signed waiver. Copy the message and send it to your customer via text, WhatsApp, or email.
          </p>

          {upcomingLoading ? (
            <p className="admin-empty">Loading…</p>
          ) : upcoming.filter(u => !u.consent).length === 0 ? (
            <p className="admin-empty">All upcoming customers have signed their waivers. 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcoming.filter(u => !u.consent).map(w => (
                <div key={w.booking_id} style={{ border: '1px solid var(--border-gold)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
                    <Send size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{w.customer_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {fmt(w.appointment_at)}
                        {w.customer_email && <> · {w.customer_email}</>}
                        {w.customer_phone && <> · {w.customer_phone}</>}
                      </div>
                    </div>
                    <button
                      className="admin-btn admin-btn--ghost"
                      style={{ fontSize: '0.78rem' }}
                      onClick={() => setSendOpen(sendOpen === w.booking_id ? null : w.booking_id)}
                    >
                      {sendOpen === w.booking_id ? 'Close' : 'Send Waiver'}
                    </button>
                  </div>

                  {sendOpen === w.booking_id && (
                    <div style={{ borderTop: '1px solid var(--border-gold)', padding: '16px 18px', background: 'rgba(212,175,55,0.04)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em' }}>MESSAGE TO SEND</p>
                      <pre style={{
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        fontSize: '0.83rem', color: 'var(--text-muted)',
                        background: 'rgba(0,0,0,0.3)', borderRadius: 6,
                        padding: '12px 14px', border: '1px solid rgba(255,255,255,0.07)',
                        marginBottom: 12, fontFamily: 'inherit', lineHeight: 1.6,
                      }}>
                        {waiverMessage(w)}
                      </pre>
                      <button
                        className={`admin-btn ${copied ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
                        onClick={() => copyMessage(w)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Message</>}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
