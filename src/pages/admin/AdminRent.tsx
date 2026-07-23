import { useEffect, useState } from 'react'
import { CheckCircle2, Pencil, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Artist = { id: string; name: string; avatar_url: string | null }
type RentRow = { artist_id: string; weekly_rate: number; currency: string; notes: string | null; artist_name: string; artist_avatar: string | null }
type Payment = { id: string; artist_id: string; amount: number; weeks_covered: number; period_from: string; period_to: string; status: string; reference: string | null; created_at: string; artist_name?: string }

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(n)
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export function AdminRent() {
  const [rentRows, setRentRows]   = useState<RentRow[]>([])
  const [artists, setArtists]     = useState<Artist[]>([])
  const [payments, setPayments]   = useState<Payment[]>([])
  const [loading, setLoading]     = useState(true)
  const [rateModal, setRateModal] = useState<string | null>(null) // artist_id
  const [rate, setRate]           = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [{ data: ar }, { data: rr }, { data: pp }] = await Promise.all([
      supabase.from('artists').select('id, name, avatar_url').eq('is_active', true).order('name'),
      supabase.from('booth_rent').select('*, artists(name, avatar_url)').order('artist_id'),
      supabase.from('rent_payments').select('*, artists(name)').order('created_at', { ascending: false }).limit(50),
    ])

    setArtists(ar ?? [])
    setRentRows((rr ?? []).map((r: any) => ({
      artist_id: r.artist_id, weekly_rate: r.weekly_rate, currency: r.currency, notes: r.notes,
      artist_name: r.artists?.name ?? '—', artist_avatar: r.artists?.avatar_url ?? null,
    })))
    setPayments((pp ?? []).map((p: any) => ({ ...p, artist_name: p.artists?.name ?? '—' })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openRate(artistId: string) {
    const existing = rentRows.find(r => r.artist_id === artistId)
    setRate(existing ? String(existing.weekly_rate) : '')
    setNotes(existing?.notes ?? '')
    setError(null)
    setRateModal(artistId)
  }

  async function saveRate() {
    if (!rateModal) return
    const r = parseFloat(rate)
    if (isNaN(r) || r < 0) { setError('Enter a valid rate.'); return }
    setSaving(true); setError(null)

    const payload = { artist_id: rateModal, weekly_rate: r, notes: notes || null, updated_at: new Date().toISOString() }
    const existing = rentRows.find(x => x.artist_id === rateModal)

    if (existing) {
      await supabase.from('booth_rent').update(payload).eq('artist_id', rateModal)
    } else {
      await supabase.from('booth_rent').insert(payload)
    }

    setSaving(false); setRateModal(null); load()
  }

  async function confirmPayment(id: string) {
    await supabase.from('rent_payments').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', id)
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'confirmed' } : p))
  }

  async function rejectPayment(id: string) {
    await supabase.from('rent_payments').update({ status: 'failed' }).eq('id', id)
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'failed' } : p))
  }

  const rateMap = new Map(rentRows.map(r => [r.artist_id, r]))

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Booth Rent</h1>
      </div>

      {/* ── Rates table ── */}
      <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>WEEKLY RATES</h2>

      {loading ? <p className="admin-empty">Loading…</p> : (
        <table className="admin-table" style={{ marginBottom: 40 }}>
          <thead><tr><th>Artist</th><th>Weekly Rate</th><th>Monthly (est.)</th><th>Notes</th><th>Actions</th></tr></thead>
          <tbody>
            {artists.map(a => {
              const row = rateMap.get(a.id)
              return (
                <tr key={a.id}>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {a.avatar_url && <img src={a.avatar_url} className="admin-table__avatar" alt="" style={{ width: 28, height: 28 }} />}
                      {a.name}
                    </span>
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {row ? fmt(row.weekly_rate) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {row ? fmt(row.weekly_rate * 4) : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: 180 }}>{row?.notes ?? '—'}</td>
                  <td>
                    <button className="admin-btn admin-btn--ghost" onClick={() => openRate(a.id)}>
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* ── Pending payments ── */}
      <h2 style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>PAYMENT SUBMISSIONS</h2>

      {payments.length === 0 ? (
        <p className="admin-empty">No payments submitted yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Artist</th><th>Amount</th><th>Period</th><th>Weeks</th><th>Reference</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td>{p.artist_name}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.amount)}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{fmtDate(p.period_from)} – {fmtDate(p.period_to)}</td>
                <td style={{ color: 'var(--text-muted)' }}>{p.weeks_covered}</td>
                <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.reference ?? '—'}</td>
                <td>
                  <span className={`admin-badge admin-badge--${p.status === 'confirmed' ? 'active' : p.status === 'failed' ? 'danger' : 'upcoming'}`}
                    style={{ textTransform: 'capitalize' }}>
                    {p.status}
                  </span>
                </td>
                <td>
                  {p.status === 'pending' && (
                    <div className="admin-actions">
                      <button className="admin-btn admin-btn--ghost" onClick={() => confirmPayment(p.id)} title="Confirm received">
                        <CheckCircle2 size={13} style={{ color: '#4ade80' }} />
                      </button>
                      <button className="admin-btn admin-btn--danger" onClick={() => rejectPayment(p.id)} title="Mark as failed">
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Rate modal ── */}
      {rateModal && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && setRateModal(null)}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">
              Set Weekly Rate — {artists.find(a => a.id === rateModal)?.name}
            </h2>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Weekly Rate (ZAR)</label>
              <input className="admin-modal__input" type="number" min="0" step="50" value={rate}
                placeholder="e.g. 1500"
                onChange={e => setRate(e.target.value)} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Notes (optional)</label>
              <input className="admin-modal__input" value={notes}
                placeholder="e.g. Includes utilities"
                onChange={e => setNotes(e.target.value)} />
            </div>

            {error && <p className="admin-modal__error">{error}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setRateModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={saveRate} disabled={saving}>
                {saving ? 'Saving…' : 'Save Rate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
