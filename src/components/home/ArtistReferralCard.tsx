import { useEffect, useState } from 'react'
import { Copy, Check, GitBranch, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  PLAN_PRICES,
  getCommissionRate,
  getTierColor,
  nextTierThreshold,
  monthsInPeriod,
} from '../../lib/commission'
import type { MembershipPlan } from '../../lib/supabase'

type Customer = {
  membership_plan: MembershipPlan
  created_at: string
}

const PERIOD = 6 // always show 6-month window for artists

function calcCommission(customers: Customer[]): number {
  const paid = customers.filter(c => c.membership_plan !== 'free')
  const rate = getCommissionRate(paid.length)
  if (rate === 0) return 0
  return paid.reduce((s, c) => s + PLAN_PRICES[c.membership_plan] * monthsInPeriod(c.created_at, PERIOD) * rate, 0)
}

function TierBar({ paid }: { paid: number }) {
  const thresholds = [1, 250, 500, 1000]
  const labels     = ['2.5%', '5.0%', '7.5%', '10%']
  const next = nextTierThreshold(paid)
  const currentIdx = paid === 0 ? -1 : paid < 250 ? 0 : paid < 500 ? 1 : paid < 1000 ? 2 : 3

  if (next === null) {
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Commission tier</span>
          <span style={{ fontSize: '0.72rem', color: '#e8c97e', fontWeight: 700 }}>Max tier reached — 10%</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #8ab4a0, var(--gold), #e8c97e)', borderRadius: 99 }} />
        </div>
      </div>
    )
  }

  const from = thresholds[Math.max(currentIdx, 0)] ?? 0
  const prevThreshold = currentIdx < 0 ? 0 : from
  const progress = paid === 0 ? 0 : Math.min((paid - prevThreshold) / (next - prevThreshold), 1)

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {paid === 0 ? 'Get your first paid referral to start earning' : `${next - paid} more paid members → unlock ${labels[currentIdx + 1]}`}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{paid}/{next}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: paid === 0 ? 'rgba(255,255,255,0.15)' : getTierColor(paid),
          borderRadius: 99,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

export function ArtistReferralCard() {
  const { profile } = useAuth()
  const [code, setCode]           = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [copied, setCopied]       = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    async function load() {
      const { data: artist } = await supabase
        .from('artists')
        .select('referral_code')
        .eq('profile_id', profile!.id)
        .maybeSingle()

      if (!artist?.referral_code) { setLoading(false); return }
      setCode(artist.referral_code)

      const { data: refs } = await supabase
        .from('profiles')
        .select('membership_plan, created_at')
        .eq('referred_by_code', artist.referral_code)

      setCustomers((refs ?? []) as Customer[])
      setLoading(false)
    }
    load()
  }, [profile?.id])

  function copyCode() {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading || !code) return null

  const paid = customers.filter(c => c.membership_plan !== 'free').length
  const rate = getCommissionRate(paid)
  const commission = calcCommission(customers)
  const tierColor = getTierColor(paid)

  return (
    <section className="artist-home__section">
      <h2 className="artist-home__section-title">
        <TrendingUp size={14} strokeWidth={2} /> My Referral Earnings
      </h2>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-gold)',
        borderRadius: 12,
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle gold glow top-right */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(212,175,55,0.07)', pointerEvents: 'none' }} />

        {/* Code + tier row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Your referral code</div>
            <button
              onClick={copyCode}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.35)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
            >
              <GitBranch size={13} style={{ color: 'var(--gold)' }} />
              <code style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.15em', fontFamily: 'monospace' }}>{code}</code>
              {copied
                ? <Check size={13} style={{ color: '#6bffb8' }} />
                : <Copy size={13} style={{ color: 'var(--text-muted)' }} />}
            </button>
          </div>

          {rate > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: tierColor, lineHeight: 1 }}>{(rate * 100).toFixed(1)}%</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>commission</div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { val: customers.length, label: 'Referred' },
            { val: paid,             label: 'Paid plans' },
            { val: commission > 0 ? `$${commission.toFixed(2)}` : '—', label: '6mo estimate', gold: commission > 0 },
          ].map(({ val, label, gold }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: gold ? 'var(--gold)' : 'var(--text)' }}>{val}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tier progress bar */}
        <TierBar paid={paid} />

        {/* Motivation nudge */}
        {paid === 0 && (
          <p style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Share your code with clients when they sign up — every paid membership earns you commission.
          </p>
        )}
      </div>
    </section>
  )
}
