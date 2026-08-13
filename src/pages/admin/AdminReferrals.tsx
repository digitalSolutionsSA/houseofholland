import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Users, DollarSign, Star, Zap, Crown, Lock, CreditCard } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { MembershipPlan } from '../../lib/supabase'
import {
  PLAN_PRICES,
  getCommissionRate,
  getTierColor,
  monthsInPeriod,
} from '../../lib/commission'

// Only these two accounts may view commission data
const ALLOWED_EMAILS = ['info@digitalsolutionssa.co.za', 'armandgroesbeek@gmail.com']

const PLAN_LABELS: Record<MembershipPlan, string> = {
  free: 'Member (Free)',
  premium: 'Premium',
  'black-card': 'Black Card',
}

const PLAN_ICONS: Record<MembershipPlan, typeof Star> = {
  free: Star,
  premium: Zap,
  'black-card': Crown,
}

function planColor(plan: MembershipPlan) {
  if (plan === 'black-card') return 'var(--gold)'
  if (plan === 'premium') return '#8ab4a0'
  return 'var(--text-muted)'
}

type Customer = {
  id: string
  full_name: string | null
  email: string | null
  membership_plan: MembershipPlan
  created_at: string
}

type ArtistRow = {
  id: string
  name: string
  referral_code: string | null
  avatar_url: string | null
  customers: Customer[]
}

function artistCommission(customers: Customer[], periodMonths: number): number {
  const paid = customers.filter(c => c.membership_plan !== 'free')
  const rate = getCommissionRate(paid.length)
  if (rate === 0) return 0
  return paid.reduce((sum, c) => {
    const months = monthsInPeriod(c.created_at, periodMonths)
    return sum + PLAN_PRICES[c.membership_plan] * months * rate
  }, 0)
}

function planBreakdown(customers: Customer[], periodMonths: number, rate: number) {
  const premium   = customers.filter(c => c.membership_plan === 'premium')
  const blackCard = customers.filter(c => c.membership_plan === 'black-card')
  const calcPlan  = (list: Customer[]) =>
    list.reduce((s, c) => s + PLAN_PRICES[c.membership_plan] * monthsInPeriod(c.created_at, periodMonths) * rate, 0)
  return {
    premiumCount:   premium.length,
    blackCardCount: blackCard.length,
    premiumComm:    calcPlan(premium),
    blackCardComm:  calcPlan(blackCard),
  }
}

function paidCount(customers: Customer[]) {
  return customers.filter(c => c.membership_plan !== 'free').length
}

const DEFAULT_PERIOD = 6

export function AdminReferrals() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<ArtistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [periodMonths, setPeriodMonths] = useState(DEFAULT_PERIOD)

  const isAllowed = ALLOWED_EMAILS.includes((profile?.email ?? '').toLowerCase())

  useEffect(() => {
    if (!isAllowed) { setLoading(false); return }

    async function load() {
      setLoading(true)

      const { data: artists } = await supabase
        .from('artists')
        .select('id, name, referral_code, avatar_url')
        .order('name')

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, membership_plan, referred_by_code, created_at')
        .not('referred_by_code', 'is', null)
        .order('created_at', { ascending: false })

      const codeToCustomers: Record<string, Customer[]> = {}
      for (const p of profiles ?? []) {
        const code = p.referred_by_code as string
        if (!codeToCustomers[code]) codeToCustomers[code] = []
        codeToCustomers[code].push({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          membership_plan: (p.membership_plan ?? 'free') as MembershipPlan,
          created_at: p.created_at,
        })
      }

      setRows(
        (artists ?? []).map(a => ({
          ...a,
          customers: a.referral_code ? (codeToCustomers[a.referral_code] ?? []) : [],
        }))
      )
      setLoading(false)
    }
    load()
  }, [isAllowed])

  if (!isAllowed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, color: 'var(--text-muted)' }}>
        <Lock size={32} strokeWidth={1.5} style={{ color: 'var(--border-gold)' }} />
        <p style={{ fontSize: '0.9rem' }}>You don't have permission to view this page.</p>
      </div>
    )
  }

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalPaid = rows.reduce((s, r) => s + paidCount(r.customers), 0)
  const totalCustomers = rows.reduce((s, r) => s + r.customers.length, 0)
  const totalCommission = rows.reduce((s, r) => s + artistCommission(r.customers, periodMonths), 0)

  const artistsWithReferrals = rows.filter(r => r.customers.length > 0).length

  return (
    <div>
      {/* Header row */}
      <div className="admin-page__header">
        <h1 className="admin-page__title">Artist Referrals</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Period</label>
          <select
            className="admin-modal__select"
            style={{ padding: '5px 8px', fontSize: '0.82rem', width: 'auto' }}
            value={periodMonths}
            onChange={e => setPeriodMonths(Number(e.target.value))}
          >
            <option value={1}>1 month</option>
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>
        </div>
      </div>

      {/* Commission tier reference — horizontal scroll on mobile */}
      <div style={{ overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 6, minWidth: 'max-content' }}>
          {[
            { label: '0 customers', rate: '0%',   color: 'var(--text-dim)' },
            { label: '1–249',       rate: '2.5%', color: '#8ab4a0' },
            { label: '250–499',     rate: '5.0%', color: 'var(--gold)' },
            { label: '500–999',     rate: '7.5%', color: '#c8a96e' },
            { label: '1000+ cap',   rate: '10%',  color: '#e8c97e' },
          ].map(t => (
            <div key={t.label} style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${t.color}`, fontSize: '0.73rem', display: 'flex', gap: 5, alignItems: 'center', whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t.label}</span>
              <span style={{ color: t.color, fontWeight: 700 }}>{t.rate}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary cards — commission full-width on top, two stats below */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {/* Commission — spans full width */}
        <div style={{ gridColumn: '1 / -1', background: 'var(--surface)', border: '1px solid var(--border-gold)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <DollarSign size={13} strokeWidth={1.5} style={{ color: 'var(--gold)' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Commission ({periodMonths}mo)</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pro-rated · tiered 2.5 / 5.0 / 7.5 / 10%</div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '-0.02em' }}>
            ${totalCommission.toFixed(2)}
          </div>
        </div>

        {/* Customers */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Users size={12} strokeWidth={1.5} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Customers</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{totalCustomers}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{totalPaid} on paid plans</div>
        </div>

        {/* Artists */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Users size={12} strokeWidth={1.5} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Artists</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{artistsWithReferrals}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>of {rows.length} total</div>
        </div>
      </div>

      {/* Artist accordion list */}
      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(artist => {
            const isOpen = expanded.has(artist.id)
            const paid = paidCount(artist.customers)
            const rate = getCommissionRate(paid)
            const commission = artistCommission(artist.customers, periodMonths)
            const tierColor = getTierColor(paid)

            return (
              <div key={artist.id} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>

                {/* Artist row — tap to expand */}
                <button
                  style={{ width: '100%', background: 'var(--surface)', border: 'none', cursor: 'pointer', padding: '12px 14px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12, textAlign: 'left' }}
                  onClick={() => toggle(artist.id)}
                >
                  {/* Avatar */}
                  {artist.avatar_url
                    ? <img src={artist.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-gold)', flexShrink: 0 }} />
                    : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', flexShrink: 0 }} />}

                  {/* Name + code + tier */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem', marginBottom: 3 }}>{artist.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <code style={{ color: 'var(--gold)', letterSpacing: '0.08em', fontFamily: 'monospace' }}>{artist.referral_code ?? '—'}</code>
                      </span>
                      {paid > 0 && (
                        <span style={{ fontSize: '0.68rem', color: tierColor, fontWeight: 700, background: `${tierColor}18`, border: `1px solid ${tierColor}40`, padding: '1px 6px', borderRadius: 10 }}>
                          {(rate * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>

                    {/* Stats row — commission · referred · paid */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 7 }}>
                      <div>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: rate > 0 ? 'var(--gold)' : 'var(--text-dim)' }}>
                          {rate > 0 ? `$${commission.toFixed(2)}` : '—'}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 3 }}>due</span>
                      </div>
                      <div style={{ width: 1, background: 'var(--border)' }} />
                      <div>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>{artist.customers.length}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 3 }}>referred</span>
                      </div>
                      <div style={{ width: 1, background: 'var(--border)' }} />
                      <div>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: paid > 0 ? 'var(--text)' : 'var(--text-dim)' }}>{paid}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 3 }}>paid</span>
                      </div>
                    </div>
                  </div>

                  {/* Chevron */}
                  <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {artist.customers.length === 0 ? (
                      <p style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.83rem', textAlign: 'center' }}>
                        No customers have signed up with this code yet.
                      </p>
                    ) : (() => {
                      const bd = planBreakdown(artist.customers, periodMonths, rate)
                      return (
                        <>
                          {/* Plan breakdown pills */}
                          {rate > 0 && (
                            <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Breakdown — {periodMonths}mo window, pro-rated
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {bd.premiumCount > 0 && (
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 12px', borderRadius: 8, background: 'rgba(138,180,160,0.1)', border: '1px solid rgba(138,180,160,0.3)', flex: '1 1 auto' }}>
                                    <Zap size={12} style={{ color: '#8ab4a0', flexShrink: 0 }} />
                                    <div>
                                      <div style={{ fontSize: '0.72rem', color: '#8ab4a0' }}>Premium × {bd.premiumCount} @ $4.99</div>
                                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#8ab4a0' }}>${bd.premiumComm.toFixed(2)}</div>
                                    </div>
                                  </div>
                                )}
                                {bd.blackCardCount > 0 && (
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 12px', borderRadius: 8, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', flex: '1 1 auto' }}>
                                    <CreditCard size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                                    <div>
                                      <div style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>Black Card × {bd.blackCardCount} @ $6.99</div>
                                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gold)' }}>${bd.blackCardComm.toFixed(2)}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Customer table — scrolls horizontally on mobile */}
                          <div style={{ overflowX: 'auto' }}>
                            <table className="admin-table" style={{ margin: 0, borderRadius: 0, minWidth: 520 }}>
                              <thead>
                                <tr>
                                  <th>Customer</th>
                                  <th>Plan</th>
                                  <th>Joined</th>
                                  <th style={{ textAlign: 'center' }}>Months</th>
                                  <th style={{ textAlign: 'right' }}>Commission</th>
                                </tr>
                              </thead>
                              <tbody>
                                {artist.customers.map(c => {
                                  const PlanIcon = PLAN_ICONS[c.membership_plan]
                                  const monthly = PLAN_PRICES[c.membership_plan]
                                  const months = monthsInPeriod(c.created_at, periodMonths)
                                  const comm = monthly * months * rate
                                  return (
                                    <tr key={c.id}>
                                      <td>
                                        <div style={{ fontWeight: 500, fontSize: '0.83rem' }}>{c.full_name ?? '—'}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{c.email ?? '—'}</div>
                                      </td>
                                      <td>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: planColor(c.membership_plan), fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                          <PlanIcon size={11} strokeWidth={2} />
                                          {PLAN_LABELS[c.membership_plan]}
                                        </span>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                          {monthly > 0 ? `$${monthly.toFixed(2)}/mo` : 'Free'}
                                        </div>
                                      </td>
                                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                                      </td>
                                      <td style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                                        {c.membership_plan === 'free' ? (
                                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                                        ) : (
                                          <>
                                            <span style={{ color: months < periodMonths ? '#c8a96e' : 'var(--text-muted)', fontWeight: 600 }}>{months}</span>
                                            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>/{periodMonths}</span>
                                            {months < periodMonths && (
                                              <div style={{ fontSize: '0.62rem', color: '#c8a96e' }}>pro-rated</div>
                                            )}
                                          </>
                                        )}
                                      </td>
                                      <td style={{ textAlign: 'right', color: comm > 0 ? 'var(--gold)' : 'var(--text-muted)', fontWeight: comm > 0 ? 700 : 400, fontSize: '0.83rem', whiteSpace: 'nowrap' }}>
                                        {comm > 0 ? `$${comm.toFixed(2)}` : rate === 0 ? 'Not eligible' : '—'}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                              <tfoot>
                                <tr style={{ background: 'var(--surface)' }}>
                                  <td colSpan={3} style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Total due to {artist.name}
                                  </td>
                                  <td />
                                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: rate > 0 ? 'var(--gold)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                    {rate > 0 ? `$${commission.toFixed(2)}` : 'Not eligible'}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Grand total footer */}
      {!loading && (
        <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border-gold)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              Total payable — {periodMonths} month period
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {totalPaid} paid · {totalCustomers} referred · pro-rated
            </div>
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '-0.02em', flexShrink: 0 }}>
            ${totalCommission.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}
