import { useEffect, useState } from 'react'
import { CreditCard, Calendar, CheckCircle2, AlertCircle, X, Pen } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './BoothRentPage.css'

type RentConfig = { weekly_rate: number; currency: string; notes: string | null; artist_name: string }
type Payment = {
  id: string; amount: number; weeks_covered: number
  period_from: string; period_to: string; status: string
  reference: string | null; created_at: string; confirmed_at: string | null
  payment_method: string
}

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}
function addWeeks(date: Date, weeks: number) {
  const d = new Date(date); d.setDate(d.getDate() + weeks * 7); return d
}
function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function genRef(artistName: string) {
  const initials = artistName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3)
  return `HOH-RENT-${initials}-${Date.now().toString(36).toUpperCase().slice(-5)}`
}

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  pending:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)',  label: 'Awaiting Confirmation' },
  confirmed: { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.25)', label: 'Confirmed' },
  failed:    { color: '#fb6424', bg: 'rgba(251,100,36,0.08)', border: 'rgba(251,100,36,0.25)', label: 'Failed' },
}

export function BoothRentPage() {
  const { profile } = useAuth()
  const [rent, setRent]           = useState<RentConfig | null>(null)
  const [artistId, setArtistId]   = useState<string | null>(null)
  const [payments, setPayments]   = useState<Payment[]>([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [weeks, setWeeks]         = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<{ ref: string; amount: number } | null>(null)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    load()
  }, [profile?.id])

  async function load() {
    // Get artist_id from profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('artist_id')
      .eq('id', profile!.id)
      .single()

    if (!prof?.artist_id) { setLoading(false); return }
    const aid = prof.artist_id
    setArtistId(aid)

    const [{ data: rentData }, { data: payData }] = await Promise.all([
      supabase
        .from('booth_rent')
        .select('weekly_rate, currency, notes, artists(name)')
        .eq('artist_id', aid)
        .single(),
      supabase
        .from('rent_payments')
        .select('*')
        .eq('artist_id', aid)
        .order('created_at', { ascending: false })
        .limit(24),
    ])

    if (rentData) {
      setRent({
        weekly_rate: rentData.weekly_rate,
        currency: rentData.currency,
        notes: rentData.notes,
        artist_name: (rentData as any).artists?.name ?? 'Artist',
      })
    }
    setPayments(payData ?? [])
    setLoading(false)
  }

  const monthlyRate  = rent ? rent.weekly_rate * 4 : 0
  const payAmount    = rent ? rent.weekly_rate * weeks : 0
  const periodStart  = new Date()
  const periodEnd    = addWeeks(periodStart, weeks)

  async function submitPayment() {
    if (!artistId || !rent) return
    setSubmitting(true); setError(null)

    const ref = genRef(rent.artist_name)
    const { error: err } = await supabase.from('rent_payments').insert({
      artist_id:    artistId,
      amount:       payAmount,
      weeks_covered: weeks,
      period_from:  toDateStr(periodStart),
      period_to:    toDateStr(periodEnd),
      status:       'pending',
      payment_method: 'eft',
      reference:    ref,
    })

    if (err) { setError(err.message); setSubmitting(false); return }

    setSubmitted({ ref, amount: payAmount })
    setSubmitting(false)
    load()
  }

  if (loading) return (
    <div className="page booth-rent-page">
      <PageHeader title="Booth Rent" backTo="/profile" />
      <p style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</p>
    </div>
  )

  if (!artistId) return (
    <div className="page booth-rent-page">
      <PageHeader title="Booth Rent" backTo="/profile" />
      <div className="booth-rent__unlinked">
        <AlertCircle size={32} strokeWidth={1.5} style={{ color: 'var(--gold)', opacity: 0.6 }} />
        <p>Your account isn't linked to an artist profile yet. Contact management to get set up.</p>
      </div>
    </div>
  )

  if (!rent) return (
    <div className="page booth-rent-page">
      <PageHeader title="Booth Rent" backTo="/profile" />
      <div className="booth-rent__unlinked">
        <AlertCircle size={32} strokeWidth={1.5} style={{ color: 'var(--gold)', opacity: 0.6 }} />
        <p>No rent rate has been configured for your profile yet. Contact management.</p>
      </div>
    </div>
  )

  return (
    <div className="page booth-rent-page">
      <PageHeader title="Booth Rent" backTo="/profile" />

      <div className="booth-rent__content">

        {/* ── Rate card ── */}
        <div className="booth-rent__rate-card">
          <p className="booth-rent__rate-label">Weekly Rate</p>
          <p className="booth-rent__rate-amount">{fmt(rent.weekly_rate, rent.currency)}</p>
          <p className="booth-rent__rate-monthly">≈ {fmt(monthlyRate, rent.currency)} / month</p>
          {rent.notes && <p className="booth-rent__rate-notes">{rent.notes}</p>}
        </div>

        {/* ── Pay button ── */}
        <button className="booth-rent__pay-btn" onClick={() => { setModal(true); setSubmitted(null); setError(null) }}>
          <CreditCard size={16} strokeWidth={1.5} />
          Make a Payment
        </button>

        {/* ── Payment history ── */}
        <div className="booth-rent__history">
          <p className="booth-rent__history-label">Payment History</p>
          {payments.length === 0 ? (
            <p className="booth-rent__empty">No payments recorded yet.</p>
          ) : (
            <div className="booth-rent__history-list">
              {payments.map(p => {
                const s = STATUS_STYLE[p.status] ?? STATUS_STYLE.pending
                return (
                  <div key={p.id} className="booth-rent__payment-row">
                    <div className="booth-rent__payment-left">
                      <p className="booth-rent__payment-amount">{fmt(p.amount, rent.currency)}</p>
                      <p className="booth-rent__payment-period">
                        {fmtDate(p.period_from)} – {fmtDate(p.period_to)}
                        <span className="booth-rent__payment-weeks"> · {p.weeks_covered}w</span>
                      </p>
                      {p.reference && (
                        <p className="booth-rent__payment-ref">Ref: {p.reference}</p>
                      )}
                    </div>
                    <span className="booth-rent__payment-status"
                      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Payment modal ── */}
      {modal && (
        <div className="booth-rent__overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="booth-rent__modal">
            <div className="booth-rent__modal-head">
              <h2>Make a Payment</h2>
              <button onClick={() => setModal(false)}><X size={18} strokeWidth={1.5} /></button>
            </div>

            {submitted ? (
              <div className="booth-rent__modal-success">
                <CheckCircle2 size={40} strokeWidth={1.5} style={{ color: '#4ade80' }} />
                <h3>Payment Submitted</h3>
                <p>Your payment of <strong>{fmt(submitted.amount, rent.currency)}</strong> has been logged and is awaiting confirmation.</p>
                <div className="booth-rent__ref-box">
                  <p className="booth-rent__ref-label">EFT Reference</p>
                  <p className="booth-rent__ref-value">{submitted.ref}</p>
                  <p className="booth-rent__ref-note">Use this exact reference when making your EFT so we can match it automatically.</p>
                </div>
                <button className="booth-rent__modal-close-btn" onClick={() => setModal(false)}>Done</button>
              </div>
            ) : (
              <>
                {/* Weeks selector */}
                <div className="booth-rent__modal-body">
                  <p className="booth-rent__modal-label">How many weeks would you like to pay?</p>
                  <div className="booth-rent__week-options">
                    {[1, 2, 4].map(w => (
                      <button
                        key={w}
                        className={`booth-rent__week-btn${weeks === w ? ' booth-rent__week-btn--active' : ''}`}
                        onClick={() => setWeeks(w)}
                      >
                        <span className="booth-rent__week-num">{w}</span>
                        <span className="booth-rent__week-label">{w === 1 ? 'week' : w === 4 ? 'month' : 'weeks'}</span>
                        <span className="booth-rent__week-amount">{fmt(rent.weekly_rate * w, rent.currency)}</span>
                      </button>
                    ))}
                  </div>

                  <div className="booth-rent__summary">
                    <div className="booth-rent__summary-row">
                      <span>Period</span>
                      <span>{fmtDate(toDateStr(periodStart))} – {fmtDate(toDateStr(periodEnd))}</span>
                    </div>
                    <div className="booth-rent__summary-row booth-rent__summary-row--total">
                      <span>Total</span>
                      <span>{fmt(payAmount, rent.currency)}</span>
                    </div>
                  </div>

                  <div className="booth-rent__eft-info">
                    <Pen size={13} strokeWidth={1.5} />
                    <p>After confirming, you'll receive a unique reference number to use for your EFT payment. Management will confirm once the transfer is received.</p>
                  </div>

                  {error && <p className="booth-rent__modal-error">{error}</p>}

                  <button
                    className="booth-rent__confirm-btn"
                    onClick={submitPayment}
                    disabled={submitting}
                  >
                    <Calendar size={15} strokeWidth={1.5} />
                    {submitting ? 'Submitting…' : `Confirm ${fmt(payAmount, rent.currency)} Payment`}
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
