import { useEffect, useRef, useState } from 'react'
import { CheckCircle, XCircle, Clock, Upload, Trophy, Bell, X, Lock, ChevronDown, ChevronUp, Image, UserX, AlertTriangle, FileText, Download, LogIn } from 'lucide-react'
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
  checkin_signature_url: string | null
  tattoo_location: string | null
  tattoo_design: string | null
  reference_image_urls: string[] | null
  deposit_link: string | null
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null
}

type ConsentFormFull = {
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
  id_document_url: string | null
  checkin_signature_url: string | null
  checked_in_at: string | null
  tattoo_location: string | null
  tattoo_design: string | null
}

const CANCEL_REASON_LABEL: Record<string, string> = {
  no_deposit:         'No deposit received',
  client_requested:   'Client requested cancellation',
  artist_unavailable: 'Artist unavailable',
  scheduling_conflict:'Scheduling conflict',
  other:              'Other',
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pending',
  accepted:  'Accepted',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  rejected:  'Rejected',
}

function WaiverSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{title}</p>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px' }}>
        {children}
      </div>
    </div>
  )
}

function WaiverRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: 'var(--text-dim)', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text)', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

export function AdminBookings() {
  const { profile } = useAuth()
  const [artists, setArtists]         = useState<Artist[]>([])
  const [artistId, setArtistId]       = useState<string>('')
  const [bookings, setBookings]       = useState<Booking[]>([])
  const [filter, setFilter]           = useState<'pending' | 'accepted' | 'confirmed' | 'all' | 'past'>('pending')
  const [loading, setLoading]         = useState(true)
  const [acting, setActing]           = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Accept-with-deposit modal
  const [depositModal, setDepositModal]       = useState<Booking | null>(null)
  const [depositPlatform, setDepositPlatform] = useState<'venmo' | 'cashapp'>('venmo')
  const [depositUsername, setDepositUsername] = useState('')
  const [depositAmount, setDepositAmount]     = useState<100 | 150>(100)
  const [depositSaving, setDepositSaving]     = useState(false)
  const [depositError, setDepositError]       = useState<string | null>(null)

  // Expanded ref images
  const [expandedRefs, setExpandedRefs] = useState<string | null>(null)

  // Done / Complete Job modal
  const cmpFileRef = useRef<HTMLInputElement>(null)
  const [completeModal, setCompleteModal] = useState<Booking | null>(null)
  const [cmpStyle, setCmpStyle]   = useState('')
  const [cmpNotes, setCmpNotes]   = useState('')
  const [cmpDate, setCmpDate]     = useState('')
  const [cmpPrice, setCmpPrice]   = useState('')
  const [cmpPaymentReceived, setCmpPaymentReceived] = useState(false)
  const [cmpFile, setCmpFile]     = useState<File | null>(null)
  const [cmpPreview, setCmpPreview] = useState<string | null>(null)
  const [cmpSaving, setCmpSaving] = useState(false)
  const [cmpError, setCmpError]   = useState<string | null>(null)
  const [cmpSuccess, setCmpSuccess] = useState<{ count: number; nextReward: string | null } | null>(null)

  // No Show modal
  const [noShowModal, setNoShowModal] = useState<Booking | null>(null)
  const [noShowContacted, setNoShowContacted] = useState(false)
  const [noShowSaving, setNoShowSaving] = useState(false)

  // Artist cancellation modal
  const [cancelArtistModal, setCancelArtistModal] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelArtistSaving, setCancelArtistSaving] = useState(false)

  // Past appointments
  const [pastBookings, setPastBookings] = useState<Booking[]>([])
  const [pastLoading, setPastLoading] = useState(false)

  // Waiver / check-in viewer
  const [waiverModal, setWaiverModal] = useState<{ consent: ConsentFormFull; booking: Booking } | null>(null)
  const [waiverLoading, setWaiverLoading] = useState<string | null>(null)
  const [checkinAlert, setCheckinAlert] = useState<{ name: string; service: string; bookingId: string } | null>(null)

  const isManager = profile?.role === 'manager'

  // New booking alert popup
  const [newAlert, setNewAlert] = useState<{ name: string; service: string; time: string; bookingId: string } | null>(null)

  async function loadBookings(aid: string) {
    setLoading(true)
    let q = supabase
      .from('bookings')
      .select('id, appointment_at, service, notes, status, profile_id, checked_in_at, checkin_signature_url, tattoo_location, tattoo_design, reference_image_urls, deposit_link')
      .eq('artist_id', aid)
      .gte('appointment_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .order('appointment_at')

    if (filter !== 'all') {
      q = q.eq('status', filter)
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

  async function loadPastBookings(aid: string) {
    setPastLoading(true)
    const { data: rows } = await supabase
      .from('bookings')
      .select('id, appointment_at, service, notes, status, profile_id, checked_in_at, tattoo_location, tattoo_design, reference_image_urls, deposit_link, cancellation_reason, no_show_contacted')
      .eq('artist_id', aid)
      .in('status', ['completed', 'no_show', 'cancelled'])
      .order('appointment_at', { ascending: false })
      .limit(30)

    const bookingRows = rows ?? []
    const profileIds = [...new Set(bookingRows.map((b: any) => b.profile_id).filter(Boolean))]
    let profileMap: Record<string, { full_name: string | null; email: string | null; phone: string | null }> = {}
    if (profileIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles').select('id, full_name, email, phone').in('id', profileIds)
      for (const p of profileData ?? []) profileMap[p.id] = p
    }
    setPastBookings(bookingRows.map((b: any) => ({ ...b, profiles: profileMap[b.profile_id] ?? null })))
    setPastLoading(false)
  }

  async function openWaiver(booking: Booking) {
    if (!booking.profile_id) return
    setWaiverLoading(booking.id)
    const [consentRes, profileRes] = await Promise.all([
      supabase.from('consent_forms').select('*').eq('profile_id', booking.profile_id).maybeSingle(),
      supabase.from('profiles').select('id_document_url').eq('id', booking.profile_id).maybeSingle(),
    ])
    const raw = consentRes.data as any
    setWaiverModal({
      consent: {
        full_name: raw?.full_name ?? booking.profiles?.full_name ?? '',
        date_of_birth: raw?.date_of_birth ?? null,
        address: raw?.address ?? null,
        phone: raw?.phone ?? booking.profiles?.phone ?? null,
        email: raw?.email ?? booking.profiles?.email ?? null,
        emergency_contact_name: raw?.emergency_contact_name ?? null,
        emergency_contact_phone: raw?.emergency_contact_phone ?? null,
        init_risks: !!(raw?.init_risks),
        init_waiver: !!(raw?.init_waiver),
        init_aftercare: !!(raw?.init_aftercare),
        init_no_alcohol: !!(raw?.init_no_alcohol),
        init_no_medical: !!(raw?.init_no_medical),
        init_photos: !!(raw?.init_photos),
        init_age: !!(raw?.init_age),
        signature_data_url: raw?.signature_data_url ?? null,
        signed_at: raw?.signed_at ?? null,
        id_document_url: (profileRes.data as any)?.id_document_url ?? null,
        checkin_signature_url: booking.checkin_signature_url,
        checked_in_at: booking.checked_in_at,
        tattoo_location: booking.tattoo_location,
        tattoo_design: booking.tattoo_design,
      },
      booking,
    })
    setWaiverLoading(null)
  }

  function downloadConsentForm(consent: ConsentFormFull, booking: Booking) {
    const clientName = (booking.profiles as any)?.full_name ?? consent.full_name
    const apptDate = new Date(booking.appointment_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    const signedDate = consent.signed_at ? new Date(consent.signed_at).toLocaleString('en-US') : 'N/A'
    const checkinDate = consent.checked_in_at ? new Date(consent.checked_in_at).toLocaleString('en-US') : 'N/A'
    const row = (label: string, val: string) =>
      `<tr><td style="padding:5px 12px 5px 0;color:#666;font-size:13px;width:160px;vertical-align:top">${label}</td><td style="padding:5px 0;font-size:14px;font-weight:600">${val || '—'}</td></tr>`
    const check = (label: string, agreed: boolean) =>
      `<tr><td colspan="2" style="padding:4px 0;font-size:13px">${agreed ? '✅' : '☐'} ${label}</td></tr>`
    const sigImg = (url: string | null, fallback: string) =>
      url ? `<img src="${url}" alt="Signature" style="max-width:360px;border:1px solid #ccc;border-radius:6px;padding:8px;background:#fff;display:block;" />` : `<p style="color:#999">${fallback}</p>`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Consent Form — ${clientName}</title>
<style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:780px;margin:0 auto;padding:32px 24px;color:#111}.section{margin-bottom:28px}.section h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#888;border-bottom:1px solid #e0e0e0;padding-bottom:6px;margin-bottom:12px}table{width:100%;border-collapse:collapse}.print-btn{display:block;margin:0 auto 24px;padding:10px 28px;background:#222;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer}@media print{.print-btn{display:none}}</style>
</head><body>
<button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
<h1 style="text-align:center;font-size:18px;margin:0 0 4px">HOUSE OF HOLLAND TATTOO EMPORIUM</h1>
<h2 style="text-align:center;font-size:14px;font-weight:normal;margin:0 0 6px;color:#555">WAIVER, RELEASE AND CONSENT TO TATTOO</h2>
<p style="text-align:center;font-size:13px;color:#777;margin:0 0 28px">Appointment: ${apptDate}</p>

<div class="section"><h3>Personal Details</h3><table>
${row('Full Name', consent.full_name)}
${row('Date of Birth', consent.date_of_birth ?? '')}
${row('Address', consent.address ?? '')}
${row('Phone', consent.phone ?? '')}
${row('Email', consent.email ?? '')}
</table></div>

<div class="section"><h3>Emergency Contact</h3><table>
${row('Name', consent.emergency_contact_name ?? '')}
${row('Phone', consent.emergency_contact_phone ?? '')}
</table></div>

<div class="section"><h3>Tattoo Details (Check-in)</h3><table>
${row('Location', consent.tattoo_location ?? '')}
${row('Design', consent.tattoo_design ?? '')}
</table></div>

<div class="section"><h3>Consent Items</h3><table>
${check('Risks acknowledged', !!consent.init_risks)}
${check('Waiver and release agreed', !!consent.init_waiver)}
${check('Aftercare instructions understood', !!consent.init_aftercare)}
${check('Not under influence of alcohol or drugs', !!consent.init_no_alcohol)}
${check('No medical conditions that prevent tattooing', !!consent.init_no_medical)}
${check('Photo consent granted', !!consent.init_photos)}
${check('Age 18+ confirmed', !!consent.init_age)}
</table></div>

<div class="section"><h3>Consent Form Signature</h3>
${sigImg(consent.signature_data_url, 'No consent signature on file')}
<p style="font-size:12px;color:#888;margin-top:6px">Signed on ${signedDate}</p>
</div>

${consent.checkin_signature_url ? `<div class="section"><h3>Day-of Check-in Signature</h3>
${sigImg(consent.checkin_signature_url, '')}
<p style="font-size:12px;color:#888;margin-top:6px">Signed at check-in: ${checkinDate}</p>
</div>` : ''}

${consent.id_document_url ? `<div class="section"><h3>ID Document</h3>
<img src="${consent.id_document_url}" alt="ID Document" style="max-width:420px;border:1px solid #ccc;border-radius:6px;display:block;" />
</div>` : ''}

</body></html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  async function markNoShow(b: Booking) {
    setNoShowSaving(true)
    await supabase.from('bookings').update({ status: 'no_show', no_show_contacted: noShowContacted }).eq('id', b.id)
    if (b.profile_id) {
      const label = new Date(b.appointment_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      await supabase.from('notifications').insert({
        profile_id: b.profile_id,
        title: 'Appointment Marked as No-Show',
        body: `Your ${b.service} appointment on ${label} was marked as a no-show. Please contact the studio.`,
        type: 'booking',
      })
    }
    setBookings(prev => prev.filter(x => x.id !== b.id))
    setPastBookings(prev => [{ ...b, status: 'no_show', no_show_contacted: noShowContacted } as any, ...prev])
    setNoShowModal(null)
    setNoShowSaving(false)
  }

  async function markCancelledByArtist(b: Booking) {
    if (!cancelReason) return
    setCancelArtistSaving(true)
    await supabase.from('bookings').update({ status: 'cancelled', cancellation_reason: cancelReason }).eq('id', b.id)
    if (b.profile_id) {
      const label = new Date(b.appointment_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      await supabase.from('notifications').insert({
        profile_id: b.profile_id,
        title: 'Appointment Cancelled by Artist',
        body: `Your ${b.service} appointment on ${label} has been cancelled. Please contact the studio to reschedule.`,
        type: 'booking',
      })
    }
    setBookings(prev => prev.filter(x => x.id !== b.id))
    setPastBookings(prev => [{ ...b, status: 'cancelled', cancellation_reason: cancelReason } as any, ...prev])
    setCancelArtistModal(null)
    setCancelReason('')
    setCancelArtistSaving(false)
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
    if (!artistId) return
    if (filter === 'past') loadPastBookings(artistId)
    else loadBookings(artistId)
  }, [artistId, filter])

  // Realtime subscription for new bookings
  useEffect(() => {
    if (!artistId) return
    const channel = supabase
      .channel(`admin-bookings-${artistId}`)
      .on(
        'postgres_changes',
        // No server-side filter — filter client-side for reliability
        // (server-side column filters need REPLICA IDENTITY FULL which may not be set)
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        async (payload) => {
          const b = payload.new as any
          // Only handle bookings for the currently selected artist
          if (b.artist_id !== artistId) return

          // Fetch client profile
          let clientName = 'A client'
          let clientProfile: { full_name: string | null; email: string | null; phone: string | null } | null = null
          if (b.profile_id) {
            const { data } = await supabase
              .from('profiles').select('full_name, email, phone').eq('id', b.profile_id).single()
            clientName = data?.full_name ?? 'A client'
            clientProfile = data ?? null
          }

          // Show alert popup
          setNewAlert({
            name: clientName,
            service: b.service ?? 'Appointment',
            time: new Date(b.appointment_at).toLocaleString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            }),
            bookingId: b.id,
          })

          // Immediately insert the new booking into the list if it matches the current filter
          if (filter === 'pending' || filter === 'all') {
            const newBooking: Booking = {
              id: b.id,
              appointment_at: b.appointment_at,
              service: b.service,
              notes: b.notes ?? null,
              status: b.status,
              profile_id: b.profile_id ?? null,
              checked_in_at: b.checked_in_at ?? null,
              tattoo_location: b.tattoo_location ?? null,
              tattoo_design: b.tattoo_design ?? null,
              reference_image_urls: b.reference_image_urls ?? null,
              deposit_link: b.deposit_link ?? null,
              checkin_signature_url: b.checkin_signature_url ?? null,
              profiles: clientProfile,
            }
            setBookings(prev => {
              // Avoid duplicates
              if (prev.some(x => x.id === b.id)) return prev
              return [newBooking, ...prev].sort(
                (a, z) => new Date(a.appointment_at).getTime() - new Date(z.appointment_at).getTime()
              )
            })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [artistId, filter])

  // Realtime: detect check-ins (booking UPDATE where checked_in_at goes from null → value)
  useEffect(() => {
    if (!artistId) return
    const channel = supabase
      .channel(`admin-checkins-${artistId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, async (payload) => {
        const updated = payload.new as any
        const previous = payload.old as any
        if (updated.artist_id !== artistId) return
        if (!previous.checked_in_at && updated.checked_in_at) {
          let clientName = 'A client'
          if (updated.profile_id) {
            const { data } = await supabase.from('profiles').select('full_name').eq('id', updated.profile_id).single()
            clientName = data?.full_name ?? 'A client'
          }
          setCheckinAlert({ name: clientName, service: updated.service ?? 'appointment', bookingId: updated.id })
          // Update booking card in-place
          setBookings(prev => prev.map(b => b.id === updated.id ? {
            ...b,
            checked_in_at: updated.checked_in_at,
            checkin_signature_url: updated.checkin_signature_url ?? null,
            tattoo_location: updated.tattoo_location ?? null,
            tattoo_design: updated.tattoo_design ?? null,
          } : b))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [artistId])

  // Realtime: new booking notification → show popup as a reliable fallback
  // (catches cases where the bookings INSERT event is missed, e.g. artist navigated to page after booking was made)
  useEffect(() => {
    if (!profile?.id || !artistId) return
    const channel = supabase
      .channel(`admin-booking-notifs-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, async (payload) => {
        const n = payload.new as any
        if (n.profile_id !== profile.id) return
        if (n.type !== 'booking' || !n.title?.includes('New Booking')) return

        // Only show popup if we don't already have it open
        setNewAlert(prev => {
          if (prev) return prev // already showing one
          return null          // will be populated by bookings INSERT or below
        })

        // Fetch the most recent pending booking so we have the bookingId for accept/reject
        const { data } = await supabase
          .from('bookings')
          .select('id, service, appointment_at, profile_id, profiles(full_name)')
          .eq('artist_id', artistId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!data) return

        setNewAlert(prev => {
          if (prev) return prev // bookings INSERT already fired — don't overwrite
          return {
            name: (data.profiles as any)?.full_name ?? 'A client',
            service: data.service,
            time: new Date(data.appointment_at).toLocaleString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            }),
            bookingId: data.id,
          }
        })

        // Also refresh the list so the booking appears even if INSERT event was missed
        setBookings(prev => {
          if (prev.some(b => b.id === data.id)) return prev
          loadBookings(artistId)
          return prev
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, artistId])

  // Polling fallback: every 20s check for pending bookings not yet in state
  useEffect(() => {
    if (!artistId) return
    const seenIds = new Set(bookings.map(b => b.id))
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, service, appointment_at, status, profile_id, profiles(full_name, email, phone)')
        .eq('artist_id', artistId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)
      if (!data) return
      const newOnes = data.filter((b: any) => !seenIds.has(b.id))
      if (newOnes.length > 0) {
        const b = newOnes[0] as any
        // Add to bookings list
        setBookings(prev => {
          const fresh = newOnes.filter((x: any) => !prev.some(p => p.id === x.id)).map((x: any) => ({
            id: x.id, appointment_at: x.appointment_at, service: x.service,
            notes: null, status: x.status, profile_id: x.profile_id ?? null,
            checked_in_at: null, checkin_signature_url: null, tattoo_location: null,
            tattoo_design: null, reference_image_urls: null, deposit_link: null,
            profiles: x.profiles ?? null,
          }))
          if (fresh.length === 0) return prev
          newOnes.forEach((x: any) => seenIds.add(x.id))
          return [...fresh, ...prev].sort((a, z) =>
            new Date(a.appointment_at).getTime() - new Date(z.appointment_at).getTime()
          )
        })
        // Show popup for the newest one
        setNewAlert(prev => prev ?? {
          name: (b.profiles as any)?.full_name ?? 'A client',
          service: b.service,
          time: new Date(b.appointment_at).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit',
          }),
          bookingId: b.id,
        })
      }
    }, 20000)
    return () => clearInterval(interval)
  }, [artistId])

  async function rejectBooking(id: string) {
    setActing(id)
    setActionError(null)
    const { error } = await supabase.from('bookings').update({ status: 'rejected' }).eq('id', id)
    if (error) { setActionError(error.message); setActing(null); return }
    const booking = bookings.find(b => b.id === id)
    if (booking?.profile_id) {
      const apptLabel = new Date(booking.appointment_at).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
      await supabase.from('notifications').insert({
        profile_id: booking.profile_id,
        title: 'Booking Request Declined',
        body: `Your ${booking.service} request on ${apptLabel} was not accepted. Please book a new time.`,
        type: 'booking',
      })
    }
    setBookings(b => filter === 'all' ? b.map(x => x.id === id ? { ...x, status: 'rejected' } : x) : b.filter(x => x.id !== id))
    setActing(null)
  }

  async function acceptBooking() {
    if (!depositModal) return
    const username = depositUsername.trim().replace(/^[@$]/, '')
    if (!username) { setDepositError('Please enter your username.'); return }
    const depositUrl = depositPlatform === 'venmo'
      ? `https://venmo.com/u/${username}`
      : `https://cash.app/$${username}`
    const platformLabel = depositPlatform === 'venmo' ? 'Venmo' : 'CashApp'
    const displayHandle = depositPlatform === 'venmo' ? `@${username}` : `$${username}`

    setDepositSaving(true)
    setDepositError(null)
    const { error } = await supabase.from('bookings')
      .update({ status: 'accepted', deposit_link: depositUrl })
      .eq('id', depositModal.id)
    if (error) { setDepositError(error.message); setDepositSaving(false); return }
    if (depositModal.profile_id) {
      const apptLabel = new Date(depositModal.appointment_at).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
      await supabase.from('notifications').insert({
        profile_id: depositModal.profile_id,
        title: 'Request Accepted — Deposit Required',
        body: `Your ${depositModal.service} on ${apptLabel} has been accepted! Please send a $${depositAmount} deposit via ${platformLabel} to ${displayHandle} to lock in your slot.`,
        type: 'booking',
      })
    }
    setBookings(b => filter === 'all'
      ? b.map(x => x.id === depositModal.id ? { ...x, status: 'accepted', deposit_link: depositUrl } : x)
      : b.filter(x => x.id !== depositModal.id))
    setDepositModal(null)
    setDepositUsername('')
    setDepositAmount(100)
    setDepositSaving(false)
  }

  async function lockBooking(id: string) {
    setActing(id)
    setActionError(null)
    const { error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id)
    if (error) { setActionError(error.message); setActing(null); return }
    const booking = bookings.find(b => b.id === id)
    if (booking?.profile_id) {
      const apptLabel = new Date(booking.appointment_at).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
      await supabase.from('notifications').insert({
        profile_id: booking.profile_id,
        title: 'Appointment Locked In!',
        body: `Deposit received — your ${booking.service} on ${apptLabel} is confirmed and locked in. See you then!`,
        type: 'booking',
      })
    }
    setBookings(b => filter === 'all' ? b.map(x => x.id === id ? { ...x, status: 'confirmed' } : x) : b.filter(x => x.id !== id))
    setActing(null)
  }

  function openCompleteModal(b: Booking) {
    setCompleteModal(b)
    setCmpStyle(b.service)
    setCmpNotes('')
    setCmpDate(new Date().toISOString().split('T')[0])
    setCmpPrice('')
    setCmpPaymentReceived(false)
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
    if (!cmpPaymentReceived) { setCmpError('Please confirm that full payment has been received.'); return }
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
      price: cmpPrice.trim() ? parseFloat(cmpPrice) : null,
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

      {/* ── Check-in alert popup ── */}
      {checkinAlert && (
        <div className="admin-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="admin-modal" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(107,255,184,0.12)', border: '1px solid rgba(107,255,184,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <LogIn size={24} color="#6bffb8" />
            </div>
            <h2 className="admin-modal__title" style={{ color: '#6bffb8' }}>Client Checked In</h2>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', margin: '8px 0 4px' }}>{checkinAlert.name}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>{checkinAlert.service}</p>
            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setCheckinAlert(null)}>Dismiss</button>
              <button className="admin-btn admin-btn--primary" style={{ background: 'rgba(107,255,184,0.15)', border: '1px solid rgba(107,255,184,0.4)', color: '#6bffb8' }}
                onClick={() => {
                  const b = bookings.find(x => x.id === checkinAlert.bookingId)
                  if (b) openWaiver(b)
                  setCheckinAlert(null)
                }}>
                <FileText size={13} style={{ display: 'inline', marginRight: 5 }} /> View Signed Waiver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New booking alert popup ── */}
      {newAlert && (
        <div className="admin-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="admin-modal" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Bell size={24} color="var(--gold)" />
            </div>
            <h2 className="admin-modal__title">New Booking Request</h2>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', margin: '8px 0 4px' }}>{newAlert.name}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>{newAlert.service}</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--gold)', marginBottom: 20 }}>{newAlert.time}</p>
            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => {
                rejectBooking(newAlert.bookingId)
                setNewAlert(null)
              }}>
                <XCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
                Decline
              </button>
              <button className="admin-btn admin-btn--primary" onClick={() => {
                const b = bookings.find(x => x.id === newAlert.bookingId)
                setDepositModal(b ?? { id: newAlert.bookingId, appointment_at: '', service: newAlert.service, notes: null, status: 'pending', profile_id: null, checked_in_at: null, checkin_signature_url: null, tattoo_location: null, tattoo_design: null, reference_image_urls: null, deposit_link: null, profiles: { full_name: newAlert.name, email: null, phone: null } })
                setDepositUsername('')
                setDepositError(null)
                setNewAlert(null)
              }}>
                <CheckCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
                Accept
              </button>
            </div>
            <button
              style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, margin: '12px auto 0' }}
              onClick={() => setNewAlert(null)}
            >
              <X size={12} /> Dismiss — review in list
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {isManager && artists.length > 1 && (
          <select className="admin-modal__select" style={{ maxWidth: 200 }}
            value={artistId} onChange={e => setArtistId(e.target.value)}>
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        {(['pending', 'accepted', 'confirmed', 'all', 'past'] as const).map(f => (
          <button
            key={f}
            className={`admin-btn ${filter === f ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f === 'all' ? 'All Upcoming' : f === 'past' ? 'Past' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {actionError && (
        <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: 12 }}>{actionError}</p>
      )}

      {filter === 'past' ? (
        pastLoading ? (
          <p className="admin-empty">Loading past appointments…</p>
        ) : pastBookings.length === 0 ? (
          <p className="admin-empty">No past appointments found.</p>
        ) : (
          <div className="admin-booking-list">
            {pastBookings.map(b => {
              const client = b.profiles as any
              const statusColor = b.status === 'completed' ? '#4ade80' : b.status === 'no_show' ? '#fbbf24' : '#f87171'
              const statusLabel = b.status === 'completed' ? 'Completed' : b.status === 'no_show' ? 'No Show' : 'Cancelled'
              return (
                <div key={b.id} className="admin-booking-card" style={{ borderLeft: `3px solid ${statusColor}` }}>
                  <div className="admin-booking-card__top">
                    <div>
                      <div className="admin-booking-card__name">{client?.full_name ?? 'Unknown client'}</div>
                      <div className="admin-booking-card__email">{client?.email}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}40`, borderRadius: 6, padding: '3px 9px' }}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="admin-booking-card__detail">
                    <Clock size={13} strokeWidth={1.5} />
                    {fmt(b.appointment_at)}
                  </div>
                  <div className="admin-booking-card__service">{b.service}</div>
                  {b.status === 'no_show' && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 6 }}>
                      {(b as any).no_show_contacted ? '✓ Artist attempted to contact client' : 'No contact attempt recorded'}
                    </p>
                  )}
                  {b.status === 'cancelled' && (b as any).cancellation_reason && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 6 }}>
                      Reason: {CANCEL_REASON_LABEL[(b as any).cancellation_reason] ?? (b as any).cancellation_reason}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : loading ? (
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
                  <span className={`admin-badge admin-badge--${b.status === 'confirmed' ? 'active' : b.status === 'accepted' ? 'upcoming' : b.status === 'pending' ? 'upcoming' : 'inactive'}`}
                    style={b.status === 'accepted' ? { background: 'rgba(212,175,55,0.12)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.3)' } : undefined}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>

                <div className="admin-booking-card__detail">
                  <Clock size={13} strokeWidth={1.5} />
                  {fmt(b.appointment_at)}
                </div>
                <div className="admin-booking-card__service">{b.service}</div>
                {b.notes && <div className="admin-booking-card__notes">{b.notes}</div>}

                {/* Reference images */}
                {b.reference_image_urls && b.reference_image_urls.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onClick={() => setExpandedRefs(expandedRefs === b.id ? null : b.id)}
                    >
                      <Image size={12} strokeWidth={1.5} />
                      {b.reference_image_urls.length} reference image{b.reference_image_urls.length > 1 ? 's' : ''}
                      {expandedRefs === b.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {expandedRefs === b.id && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                        {b.reference_image_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Ref ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-gold)' }} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {b.checked_in_at && (
                  <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: '0.8rem', color: '#4ade80' }}>
                        <CheckCircle size={12} style={{ display: 'inline', marginRight: 5 }} />
                        Checked in · {new Date(b.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {b.tattoo_location && <span style={{ color: 'var(--text-muted)' }}> · {b.tattoo_location}</span>}
                      </div>
                      <button
                        onClick={() => openWaiver(b)}
                        disabled={waiverLoading === b.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: 'var(--gold)', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <FileText size={11} />
                        {waiverLoading === b.id ? 'Loading…' : 'View Waiver'}
                      </button>
                    </div>
                    {b.tattoo_design && <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.77rem' }}>{b.tattoo_design}</p>}
                  </div>
                )}

                {b.status === 'pending' && (
                  <div className="admin-booking-card__actions">
                    <button
                      className="admin-btn admin-btn--danger"
                      onClick={() => rejectBooking(b.id)}
                      disabled={acting === b.id}
                    >
                      <XCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Decline
                    </button>
                    <button
                      className="admin-btn admin-btn--primary"
                      onClick={() => { setDepositModal(b); setDepositUsername(''); setDepositError(null) }}
                      disabled={acting === b.id}
                    >
                      <CheckCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Accept
                    </button>
                  </div>
                )}
                {b.status === 'accepted' && (
                  <div className="admin-booking-card__actions" style={{ marginTop: 8 }}>
                    <div style={{ width: '100%', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 6 }}>
                      Deposit link sent — waiting for payment
                    </div>
                    <button
                      className="admin-btn admin-btn--danger"
                      onClick={() => rejectBooking(b.id)}
                      disabled={acting === b.id}
                      style={{ flex: 1 }}
                    >
                      <XCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Cancel
                    </button>
                    <button
                      className="admin-btn admin-btn--primary"
                      onClick={() => lockBooking(b.id)}
                      disabled={acting === b.id}
                      style={{ flex: 1 }}
                    >
                      <Lock size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Lock Appointment
                    </button>
                  </div>
                )}
                {b.status === 'confirmed' && (
                  <div className="admin-booking-card__actions" style={{ marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
                    <button
                      className="admin-btn admin-btn--complete"
                      onClick={() => openCompleteModal(b)}
                      disabled={acting === b.id}
                      style={{ flex: '1 1 auto' }}
                    >
                      <CheckCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Done
                    </button>
                    <button
                      className="admin-btn admin-btn--ghost"
                      onClick={() => { setNoShowModal(b); setNoShowContacted(false) }}
                      disabled={acting === b.id}
                      style={{ flex: '1 1 auto' }}
                    >
                      <UserX size={13} style={{ display: 'inline', marginRight: 5 }} />
                      No Show
                    </button>
                    <button
                      className="admin-btn admin-btn--danger"
                      onClick={() => { setCancelArtistModal(b); setCancelReason('') }}
                      disabled={acting === b.id}
                      style={{ flex: '1 1 auto' }}
                    >
                      <XCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Cancellation
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── No Show modal ── */}
      {noShowModal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setNoShowModal(null)}>
          <div className="admin-modal" style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <UserX size={36} color="#fbbf24" />
            </div>
            <h2 className="admin-modal__title">Mark as No Show</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Client: <strong style={{ color: 'var(--text)' }}>{noShowModal.profiles?.full_name ?? 'Unknown'}</strong>
              {' · '}<span style={{ color: 'var(--gold)' }}>{fmt(noShowModal.appointment_at)}</span>
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--text)', marginBottom: 14, lineHeight: 1.5 }}>
              Before marking as a no-show, have you attempted to contact the client? This record will be saved to your past appointments for reference.
            </p>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
              <input
                type="checkbox"
                checked={noShowContacted}
                onChange={e => setNoShowContacted(e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                I attempted to contact the client and received no response.
              </span>
            </label>
            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setNoShowModal(null)}>Cancel</button>
              <button
                className="admin-btn admin-btn--primary"
                style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}
                onClick={() => markNoShow(noShowModal)}
                disabled={noShowSaving}
              >
                {noShowSaving ? 'Saving…' : <><UserX size={13} style={{ display: 'inline', marginRight: 5 }} />Mark No Show</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Artist cancellation modal ── */}
      {cancelArtistModal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setCancelArtistModal(null)}>
          <div className="admin-modal" style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <AlertTriangle size={36} color="#f87171" />
            </div>
            <h2 className="admin-modal__title">Cancel Appointment</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Client: <strong style={{ color: 'var(--text)' }}>{cancelArtistModal.profiles?.full_name ?? 'Unknown'}</strong>
              {' · '}<span style={{ color: 'var(--gold)' }}>{fmt(cancelArtistModal.appointment_at)}</span>
            </p>
            <div className="admin-modal__field">
              <label className="admin-modal__label">Reason for cancellation *</label>
              {Object.entries(CANCEL_REASON_LABEL).map(([val, label]) => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, borderRadius: 8, border: `1px solid ${cancelReason === val ? 'var(--gold)' : 'var(--border-subtle)'}`, background: cancelReason === val ? 'rgba(212,175,55,0.07)' : 'transparent', cursor: 'pointer' }}>
                  <input type="radio" name="cancel_reason" value={val} checked={cancelReason === val} onChange={() => setCancelReason(val)} style={{ accentColor: 'var(--gold)' }} />
                  <span style={{ fontSize: '0.85rem' }}>{label}</span>
                </label>
              ))}
            </div>
            <div className="admin-modal__actions" style={{ marginTop: 16 }}>
              <button className="admin-btn admin-btn--ghost" onClick={() => setCancelArtistModal(null)}>Back</button>
              <button
                className="admin-btn admin-btn--danger"
                onClick={() => markCancelledByArtist(cancelArtistModal)}
                disabled={cancelArtistSaving || !cancelReason}
              >
                {cancelArtistSaving ? 'Saving…' : <><XCircle size={13} style={{ display: 'inline', marginRight: 5 }} />Confirm Cancellation</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Signed Waiver modal ── */}
      {waiverModal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setWaiverModal(null)}
          style={{ zIndex: 9998, alignItems: 'flex-start', paddingTop: 24, paddingBottom: 24, overflowY: 'auto' }}>
          <div className="admin-modal" style={{ maxWidth: 560, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="admin-modal__title" style={{ margin: 0 }}>
                <FileText size={16} style={{ display: 'inline', marginRight: 8, color: 'var(--gold)' }} />
                Signed Consent Form
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="admin-btn admin-btn--ghost"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
                  onClick={() => downloadConsentForm(waiverModal.consent, waiverModal.booking)}
                >
                  <Download size={13} /> Export / Print
                </button>
                <button onClick={() => setWaiverModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Personal details */}
            <WaiverSection title="Personal Details">
              <WaiverRow label="Full Name"    value={waiverModal.consent.full_name} />
              <WaiverRow label="Date of Birth" value={waiverModal.consent.date_of_birth ?? '—'} />
              <WaiverRow label="Phone"        value={waiverModal.consent.phone ?? '—'} />
              <WaiverRow label="Email"        value={waiverModal.consent.email ?? '—'} />
              <WaiverRow label="Address"      value={waiverModal.consent.address ?? '—'} />
            </WaiverSection>

            {/* Emergency contact */}
            <WaiverSection title="Emergency Contact">
              <WaiverRow label="Name"  value={waiverModal.consent.emergency_contact_name ?? '—'} />
              <WaiverRow label="Phone" value={waiverModal.consent.emergency_contact_phone ?? '—'} />
            </WaiverSection>

            {/* Tattoo details */}
            {(waiverModal.consent.tattoo_location || waiverModal.consent.tattoo_design) && (
              <WaiverSection title="Tattoo Details (Check-in)">
                {waiverModal.consent.tattoo_location && <WaiverRow label="Location" value={waiverModal.consent.tattoo_location} />}
                {waiverModal.consent.tattoo_design && <WaiverRow label="Design" value={waiverModal.consent.tattoo_design} />}
              </WaiverSection>
            )}

            {/* Consent checkboxes */}
            <WaiverSection title="Consent Items">
              {[
                ['Risks acknowledged', waiverModal.consent.init_risks],
                ['Waiver and release agreed', waiverModal.consent.init_waiver],
                ['Aftercare instructions understood', waiverModal.consent.init_aftercare],
                ['Not under influence of alcohol/drugs', waiverModal.consent.init_no_alcohol],
                ['No medical conditions', waiverModal.consent.init_no_medical],
                ['Photo consent granted', waiverModal.consent.init_photos],
                ['Age 18+ confirmed', waiverModal.consent.init_age],
              ].map(([label, agreed]) => (
                <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: '0.82rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: agreed ? '#6bffb8' : '#ff6b6b', fontSize: '0.9rem' }}>{agreed ? '✓' : '✗'}</span>
                  <span style={{ color: agreed ? 'var(--text)' : 'var(--text-dim)' }}>{label as string}</span>
                </div>
              ))}
            </WaiverSection>

            {/* Consent form signature */}
            {waiverModal.consent.signature_data_url && (
              <WaiverSection title="Consent Form Signature">
                <img src={waiverModal.consent.signature_data_url} alt="Consent signature"
                  style={{ maxWidth: '100%', background: '#fff', borderRadius: 6, padding: 8, border: '1px solid var(--border-gold)', display: 'block' }} />
                {waiverModal.consent.signed_at && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 6 }}>
                    Signed {new Date(waiverModal.consent.signed_at).toLocaleString('en-US')}
                  </p>
                )}
              </WaiverSection>
            )}

            {/* Day-of check-in signature */}
            {waiverModal.consent.checkin_signature_url && (
              <WaiverSection title="Day-of Check-in Signature">
                <img src={waiverModal.consent.checkin_signature_url} alt="Check-in signature"
                  style={{ maxWidth: '100%', background: '#fff', borderRadius: 6, padding: 8, border: '1px solid rgba(107,255,184,0.4)', display: 'block' }} />
                {waiverModal.consent.checked_in_at && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 6 }}>
                    Signed at check-in: {new Date(waiverModal.consent.checked_in_at).toLocaleString('en-US')}
                  </p>
                )}
              </WaiverSection>
            )}

            {/* ID Document */}
            {waiverModal.consent.id_document_url && (
              <WaiverSection title="ID Document">
                <img src={waiverModal.consent.id_document_url} alt="ID document"
                  style={{ maxWidth: '100%', borderRadius: 6, border: '1px solid var(--border-subtle)', display: 'block' }} />
              </WaiverSection>
            )}

            {!waiverModal.consent.signature_data_url && !waiverModal.consent.checkin_signature_url && (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
                No signatures on file yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Accept booking / deposit link modal */}
      {depositModal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setDepositModal(null)}>
          <div className="admin-modal" style={{ maxWidth: 400 }}>
            <h2 className="admin-modal__title">Accept Booking</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 18 }}>
              Client: <strong style={{ color: 'var(--text)' }}>{depositModal.profiles?.full_name ?? 'Unknown'}</strong>
              {depositModal.appointment_at && (
                <> · <span style={{ color: 'var(--gold)' }}>{fmt(depositModal.appointment_at)}</span></>
              )}
            </p>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Deposit amount *</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {([100, 150] as const).map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 8, fontWeight: 700, fontSize: '0.95rem',
                      border: `1px solid ${depositAmount === amt ? 'var(--gold)' : 'var(--border-subtle)'}`,
                      background: depositAmount === amt ? 'rgba(212,175,55,0.12)' : 'transparent',
                      color: depositAmount === amt ? 'var(--gold)' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    ${amt}
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, marginTop: 2 }}>
                      {amt === 100 ? 'Small tattoo' : 'Standard tattoo'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Payment platform *</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {(['venmo', 'cashapp'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDepositPlatform(p)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, fontWeight: 600, fontSize: '0.88rem',
                      border: `1px solid ${depositPlatform === p ? 'var(--gold)' : 'var(--border-subtle)'}`,
                      background: depositPlatform === p ? 'rgba(212,175,55,0.1)' : 'transparent',
                      color: depositPlatform === p ? 'var(--gold)' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {p === 'venmo' ? 'Venmo' : 'CashApp'}
                  </button>
                ))}
              </div>
              <label className="admin-modal__label">
                {depositPlatform === 'venmo' ? 'Venmo username' : 'CashApp $cashtag'} *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <span style={{ padding: '10px 10px 10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRight: 'none', borderRadius: '8px 0 0 8px', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  {depositPlatform === 'venmo' ? '@' : '$'}
                </span>
                <input
                  className="admin-modal__input"
                  style={{ borderRadius: '0 8px 8px 0', flex: 1 }}
                  value={depositUsername}
                  onChange={e => setDepositUsername(e.target.value.replace(/^[@$]/, ''))}
                  placeholder={depositPlatform === 'venmo' ? 'yourname' : 'yourcashtag'}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: 6 }}>
                The client will be notified to send their deposit to this {depositPlatform === 'venmo' ? 'Venmo' : 'CashApp'} account.
              </p>
            </div>

            {depositError && <p className="admin-modal__error">{depositError}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setDepositModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={acceptBooking} disabled={depositSaving}>
                {depositSaving ? 'Sending…' : (
                  <><CheckCircle size={13} style={{ display: 'inline', marginRight: 6 }} />Accept & Send Deposit Link</>
                )}
              </button>
            </div>
          </div>
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
                <h2 className="admin-modal__title">Mark as Done</h2>
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
                  <label className="admin-modal__label">Total Price Charged (optional)</label>
                  <input
                    className="admin-modal__input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cmpPrice}
                    placeholder="e.g. 350"
                    onChange={e => setCmpPrice(e.target.value)}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 18, padding: '12px 14px', borderRadius: 8, border: `1px solid ${cmpPaymentReceived ? 'var(--gold)' : 'var(--border-subtle)'}`, background: cmpPaymentReceived ? 'rgba(212,175,55,0.07)' : 'transparent' }}>
                  <input
                    type="checkbox"
                    checked={cmpPaymentReceived}
                    onChange={e => setCmpPaymentReceived(e.target.checked)}
                    style={{ marginTop: 2, accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>
                    Full payment has been received from the client *
                  </span>
                </label>

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
                      <><CheckCircle size={13} style={{ display: 'inline', marginRight: 6 }} />Mark Done</>
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
