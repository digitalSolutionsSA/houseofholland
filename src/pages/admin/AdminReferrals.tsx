import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Users, DollarSign, Star, Zap, Crown, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { MembershipPlan } from '../../lib/supabase'

// Only these two accounts may view commission data
const ALLOWED_EMAILS = ['info@digitalsolutionssa.co.za', 'armandgroesbeek@gmail.com']

const PLAN_PRICES: Record<MembershipPlan, number> = {
  free: 0,
  premium: 4.99,
  'black-card': 6.99,
}

// Tiered commission based on number of paid customers per artist
function getCommissionRate(paidCustomers: number): number {
  if (paidCustomers >= 2500) return 0.10  // 10%
  if (paidCustomers >= 1000) return 0.075 // 7.5%
  if (paidCustomers >= 500)  return 0.05  // 5%
  if (paidCustomers >= 250)  return 0.025 // 2.5%
  return 0 // Not yet eligible
}

function getTierLabel(paidCustomers: number): string {
  if (paidCustomers >= 2500) return '10% (2500+ paid)'
  if (paidCustomers >= 1000) return '7.5% (1000+ paid)'
  if (paidCustomers >= 500)  return '5% (500+ paid)'
  if (paidCustomers >= 250)  return '2.5% (250+ paid)'
  return 'Not yet eligible (< 250 paid)'
}

function getTierColor(paidCustomers: number): string {
  if (paidCustomers >= 2500) return '#e8c97e'
  if (paidCustomers >= 1000) return '#c8a96e'
  if (paidCustomers >= 500)  return 'var(--gold)'
  if (paidCustomers >= 250)  return '#8ab4a0'
  return 'var(--text-muted)'
}

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
  const paid = customers.filter(c => c.membership_plan !== 'free').length
  const rate = getCommissionRate(paid)
  if (rate === 0) return 0
  return customers.reduce((sum, c) => {
    return sum + PLAN_PRICES[c.membership_plan] * periodMonths * rate
  }, 0)
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

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Artist Referrals</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Period</label>
          <select
            className="admin-modal__select"
            style={{ padding: '4px 8px', fontSize: '0.82rem', width: 'auto' }}
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

      {/* Commission tier reference */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: '< 250 paid', rate: 'No commission', color: 'var(--text-muted)' },
          { label: '250+ paid', rate: '2.5%', color: '#8ab4a0' },
          { label: '500+ paid', rate: '5%', color: 'var(--gold)' },
          { label: '1000+ paid', rate: '7.5%', color: '#c8a96e' },
          { label: '2500+ paid', rate: '10%', color: '#e8c97e' },
        ].map(t => (
          <div key={t.label} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${t.color}`, fontSize: '0.75rem', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>{t.label}</span>
            <span style={{ color: t.color, fontWeight: 700 }}>{t.rate}</span>
          </div>
        ))}
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Referred Customers', value: totalCustomers, icon: Users, sub: `${totalPaid} on paid plans` },
          { label: `Commission (${periodMonths}mo)`, value: `$${totalCommission.toFixed(2)}`, icon: DollarSign, sub: 'Tiered: 2.5 / 5 / 7.5%' },
          { label: 'Artists with Referrals', value: rows.filter(r => r.customers.length > 0).length, icon: Users, sub: `of ${rows.length} total artists` },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border-gold)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon size={14} strokeWidth={1.5} style={{ color: 'var(--gold)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(artist => {
            const isOpen = expanded.has(artist.id)
            const paid = paidCount(artist.customers)
            const rate = getCommissionRate(paid)
            const commission = artistCommission(artist.customers, periodMonths)
            const tierLabel = getTierLabel(paid)
            const tierColor = getTierColor(paid)

            return (
              <div key={artist.id} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  style={{ width: '100%', background: 'var(--surface)', border: 'none', cursor: 'pointer', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
                  onClick={() => toggle(artist.id)}
                >
                  {artist.avatar_url
                    ? <img src={artist.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-gold)' }} />
                    : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', flexShrink: 0 }} />}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>{artist.name}</div>
                    <div style={{ fontSize: '0.73rem', display: 'flex', gap: 10, marginTop: 2 }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Code: <code style={{ color: 'var(--gold)', letterSpacing: '0.1em' }}>{artist.referral_code ?? '—'}</code>
                      </span>
                      <span style={{ color: tierColor, fontWeight: 600 }}>{tierLabel}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', marginRight: 8, flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, color: rate > 0 ? 'var(--gold)' : 'var(--text-muted)', fontSize: '0.95rem' }}>
                      {rate > 0 ? `$${commission.toFixed(2)}` : '—'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{periodMonths}mo due</div>
                  </div>

                  <div style={{ textAlign: 'right', marginRight: 8, flexShrink: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>{artist.customers.length}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>referred</div>
                  </div>

                  <div style={{ textAlign: 'right', marginRight: 8, flexShrink: 0 }}>
                    <div style={{ fontWeight: 600, color: paid > 0 ? 'var(--text)' : 'var(--text-muted)', fontSize: '0.9rem' }}>{paid}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>paid</div>
                  </div>

                  {isOpen
                    ? <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    : <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                </button>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {artist.customers.length === 0 ? (
                      <p style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                        No customers have signed up with this code yet.
                      </p>
                    ) : (
                      <table className="admin-table" style={{ margin: 0, borderRadius: 0 }}>
                        <thead>
                          <tr>
                            <th>Customer</th>
                            <th>Email</th>
                            <th>Plan</th>
                            <th>Monthly Fee</th>
                            <th>Commission ({periodMonths}mo @ {(rate * 100).toFixed(1)}%)</th>
                            <th>Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {artist.customers.map(c => {
                            const PlanIcon = PLAN_ICONS[c.membership_plan]
                            const monthly = PLAN_PRICES[c.membership_plan]
                            const comm = monthly * periodMonths * rate
                            return (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 500 }}>{c.full_name ?? '—'}</td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{c.email ?? '—'}</td>
                                <td>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: planColor(c.membership_plan), fontSize: '0.82rem' }}>
                                    <PlanIcon size={12} strokeWidth={2} />
                                    {PLAN_LABELS[c.membership_plan]}
                                  </span>
                                </td>
                                <td style={{ color: monthly > 0 ? 'var(--text)' : 'var(--text-muted)', fontSize: '0.82rem' }}>
                                  {monthly > 0 ? `$${monthly.toFixed(2)}` : 'Free'}
                                </td>
                                <td style={{ color: comm > 0 ? 'var(--gold)' : 'var(--text-muted)', fontWeight: comm > 0 ? 600 : 400, fontSize: '0.82rem' }}>
                                  {comm > 0 ? `$${comm.toFixed(2)}` : rate === 0 ? 'Not eligible yet' : '—'}
                                </td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                  {new Date(c.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: 'var(--surface)' }}>
                            <td colSpan={4} style={{ fontWeight: 600, fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                              Total due to {artist.name}
                            </td>
                            <td style={{ fontWeight: 700, color: rate > 0 ? 'var(--gold)' : 'var(--text-muted)' }}>
                              {rate > 0 ? `$${commission.toFixed(2)}` : 'Not eligible yet'}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && (
        <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border-gold)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              Total Commission Payable — {periodMonths} month period
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Tiered rates (2.5 / 5 / 7.5%) · {totalPaid} paid customers · {totalCustomers} total referred
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--gold)' }}>
            ${totalCommission.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}
