import { useEffect, useState } from 'react'
import { FileText, ChevronDown, ChevronUp, Phone, Mail, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

type Artist = { id: string; name: string; profile_id: string | null }

type WaiverRow = {
  booking_id: string
  appointment_at: string
  customer_name: string
  customer_email: string | null
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
  return new Date(dt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function AdminWaivers() {
  const { profile } = useAuth()
  const isManager = profile?.role === 'manager'

  const [artists, setArtists] = useState<Artist[]>([])
  const [artistId, setArtistId] = useState('')
  const [waivers, setWaivers] = useState<WaiverRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Load artists list and pick current
  useEffect(() => {
    async function init() {
      const { data: list } = await supabase
        .from('artists')
        .select('id, name, profile_id')
        .eq('is_active', true)
        .order('name')
      setArtists(list ?? [])
      const mine = (list ?? []).find(a => a.profile_id === profile?.id)
      const id = mine?.id ?? (isManager ? list?.[0]?.id ?? '' : '')
      setArtistId(id)
    }
    init()
  }, [profile?.id])

  // Load today's appointments + consent forms when artistId changes
  useEffect(() => {
    if (!artistId) { setLoading(false); return }
    loadWaivers(artistId)
  }, [artistId])

  async function loadWaivers(aid: string) {
    setLoading(true)

    // Today's date range in UTC-friendly way
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, appointment_at, profile_id, profiles(full_name, email)')
      .eq('artist_id', aid)
      .in('status', ['confirmed', 'checked_in'])
      .gte('appointment_at', todayStart.toISOString())
      .lte('appointment_at', todayEnd.toISOString())
      .order('appointment_at')

    if (!bookings || bookings.length === 0) {
      setWaivers([])
      setLoading(false)
      return
    }

    const profileIds = bookings.map((b: any) => b.profile_id)

    const { data: forms } = await supabase
      .from('consent_forms')
      .select('*')
      .in('profile_id', profileIds)

    const formMap: Record<string, ConsentForm> = {}
    for (const f of forms ?? []) formMap[f.profile_id] = f

    setWaivers(bookings.map((b: any) => ({
      booking_id: b.id,
      appointment_at: b.appointment_at,
      customer_name: (b.profiles as any)?.full_name ?? 'Unknown',
      customer_email: (b.profiles as any)?.email ?? null,
      consent: formMap[b.profile_id] ?? null,
    })))
    setLoading(false)
  }

  const checkLabel = (v: boolean) => v
    ? <span style={{ color: '#6bffb8', fontWeight: 600 }}>✓ Agreed</span>
    : <span style={{ color: '#ff6b6b' }}>✗ Not checked</span>

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Today's Waivers</h1>
      </div>

      {isManager && artists.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <select
            className="admin-modal__select"
            style={{ maxWidth: 240 }}
            value={artistId}
            onChange={e => setArtistId(e.target.value)}
          >
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {!artistId && !loading && (
        <p className="admin-empty">Your account is not linked to an artist record. Ask your manager to assign a login.</p>
      )}

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : waivers.length === 0 && artistId ? (
        <p className="admin-empty">No confirmed appointments today.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {waivers.map(w => (
            <div key={w.booking_id} style={{ border: '1px solid var(--border-gold)', borderRadius: 10, overflow: 'hidden' }}>
              {/* Header row */}
              <button
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', background: 'transparent', cursor: 'pointer',
                  textAlign: 'left',
                }}
                onClick={() => setExpanded(expanded === w.booking_id ? null : w.booking_id)}
              >
                <FileText size={18} color="var(--gold)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {w.customer_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {fmt(w.appointment_at)}
                  </div>
                </div>
                {w.consent ? (
                  <span style={{ fontSize: '0.75rem', background: 'rgba(107,255,184,0.12)', color: '#6bffb8', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(107,255,184,0.25)' }}>
                    Signed
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(255,107,107,0.2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <AlertCircle size={11} /> No waiver
                  </span>
                )}
                {expanded === w.booking_id ? <ChevronUp size={16} color="var(--gold)" /> : <ChevronDown size={16} color="var(--gold)" />}
              </button>

              {/* Expanded waiver */}
              {expanded === w.booking_id && w.consent && (
                <div style={{ borderTop: '1px solid var(--border-gold)', padding: '18px 20px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: 16 }}>
                    <Detail label="Full Name"    value={w.consent.full_name} />
                    <Detail label="Date of Birth" value={w.consent.date_of_birth ?? '—'} />
                    <Detail label="Phone"        value={w.consent.phone ?? '—'} />
                    <Detail label="Email"        value={w.consent.email ?? '—'} />
                    <Detail label="Address"      value={w.consent.address ?? '—'} />
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
                      <img
                        src={w.consent.signature_data_url}
                        alt="Signature"
                        style={{ maxWidth: 320, background: '#fff', borderRadius: 6, padding: 8, border: '1px solid var(--border-gold)' }}
                      />
                      {w.consent.signed_at && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
                          Signed {new Date(w.consent.signed_at).toLocaleString('en-US')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Expanded — no waiver */}
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
