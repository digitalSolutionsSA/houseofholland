import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Award, CheckCircle, Lock, RotateCcw, Download } from 'lucide-react'
import { toPng } from 'html-to-image'
import { PageHeader } from '../components/shared/PageHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMembership } from '../hooks/useMembership'
import { CURRENT_SEASON } from '../lib/awardPoints'
import './PassportPage.css'

type BattleReward = {
  id: string
  tier: number
  name: string
  description: string | null
  points_required: number
  quantity_total: number
  quantity_claimed: number
}

type Claim = { reward_id: string; fulfilled_at: string | null }

export function PassportPage() {
  const { profile } = useAuth()
  const { isPremium, isBlackCard } = useMembership()

  const passportRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const [tattooCount, setTattooCount] = useState(0)
  const [totalHours, setTotalHours] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [rewards, setRewards] = useState<BattleReward[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id || !isPremium) { setLoading(false); return }
    load()
  }, [profile?.id, isPremium])

  async function load() {
    setLoading(true)
    const [{ data: comps }, { data: orders }, { data: pts }, { data: rws }, { data: cls }] = await Promise.all([
      supabase.from('tattoo_completions').select('price, duration_hours').eq('profile_id', profile!.id),
      supabase.from('orders').select('total').eq('profile_id', profile!.id).in('status', ['paid', 'fulfilled']),
      supabase.from('loyalty_points').select('points').eq('profile_id', profile!.id).eq('season', CURRENT_SEASON),
      supabase.from('battle_pass_rewards').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('battle_pass_claims').select('reward_id, fulfilled_at').eq('profile_id', profile!.id).eq('season', CURRENT_SEASON),
    ])

    const tattooSpend  = (comps   ?? []).reduce((s, c) => s + ((c as any).price ?? 0), 0)
    const merchSpend   = (orders  ?? []).reduce((s, o) => s + ((o as any).total ?? 0), 0)

    setTattooCount(comps?.length ?? 0)
    setTotalHours((comps ?? []).reduce((s, c) => s + ((c as any).duration_hours ?? 0), 0))
    setTotalSpent(tattooSpend + merchSpend)
    setLoyaltyPoints((pts ?? []).reduce((s, p) => s + p.points, 0))
    setRewards(rws ?? [])
    setClaims(cls ?? [])
    setLoading(false)
  }

  async function downloadPassport() {
    if (!passportRef.current || downloading) return
    setDownloading(true)
    try {
      const node = passportRef.current
      const opts = {
        pixelRatio: 3,
        backgroundColor: isBlackCard ? '#0c0a05' : '#0a0707',
        cacheBust: true,
      }
      // First call primes font/image caches; second produces the clean result
      await toPng(node, opts)
      const dataUrl = await toPng(node, opts)
      const a = document.createElement('a')
      a.download = `HOH-Passport-${(profile?.full_name ?? 'Member').replace(/\s+/g, '-')}.png`
      a.href = dataUrl
      a.click()
    } catch (err) {
      console.error('Passport download failed', err)
    }
    setDownloading(false)
  }

  async function claimReward(reward: BattleReward) {
    if (!profile?.id) return
    setClaiming(reward.id)
    const { error } = await supabase.from('battle_pass_claims').insert({
      profile_id: profile.id,
      reward_id: reward.id,
      season: CURRENT_SEASON,
    })
    if (!error) {
      await supabase
        .from('battle_pass_rewards')
        .update({ quantity_claimed: reward.quantity_claimed + 1 })
        .eq('id', reward.id)
    }
    setClaiming(null)
    load()
  }

  if (profile && (profile.role === 'artist' || profile.role === 'manager')) {
    return <Navigate to="/home" replace />
  }

  if (!loading && !isPremium) {
    return (
      <div className="page passport-page">
        <PageHeader title="Tattoo Passport" backTo="/profile" align="center" goldTitle serif />
        <div className="passport-page__locked">
          <div className="passport-page__locked-icon">
            <Award size={36} strokeWidth={1.2} />
          </div>
          <h2 className="passport-page__locked-title">Premium Feature</h2>
          <p className="passport-page__locked-body">
            The Tattoo Passport tracks your loyalty journey and unlocks rewards as you collect tattoos at House of Holland.
            Upgrade to <strong>Premium</strong> to start earning — or get <strong>Black Card</strong> for 2× points per $10 spent.
          </p>
          <Link to="/membership" className="passport-page__locked-cta">
            View Membership Plans
          </Link>
        </div>
      </div>
    )
  }

  const hoursDisplay = totalHours === 0
    ? '0'
    : totalHours % 1 === 0
      ? String(totalHours)
      : totalHours.toFixed(1)

  const spentDisplay = totalSpent >= 1000
    ? `$${(totalSpent / 1000).toFixed(1)}k`
    : `$${Math.round(totalSpent).toLocaleString()}`

  const memberSince = profile?.created_at
    ? new Date((profile as any).created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—'

  const passportNo = `HOH-${(profile?.id ?? '').slice(0, 8).toUpperCase()}`

  const tierLabel = isBlackCard ? 'BLACK CARD' : 'PREMIUM'
  const logoSrc   = isBlackCard ? '/logo-gold.png' : '/logo-red.png'

  const nextReward = rewards.find(r => loyaltyPoints < r.points_required)
  const progressToNext = nextReward
    ? Math.min(1, loyaltyPoints / nextReward.points_required)
    : 1

  return (
    <div className="page passport-page">
      <PageHeader title="Tattoo Passport" backTo="/profile" align="center" goldTitle serif />

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>Loading…</p>
      ) : (
        <>
          {/* ── Passport Card ── */}
          <div className="passport-card" ref={passportRef}>
            {/* Security texture */}
            <div className="passport-card__texture" aria-hidden />

            {/* Corner ornaments */}
            <span className="passport-card__corner passport-card__corner--tl" aria-hidden />
            <span className="passport-card__corner passport-card__corner--tr" aria-hidden />
            <span className="passport-card__corner passport-card__corner--bl" aria-hidden />
            <span className="passport-card__corner passport-card__corner--br" aria-hidden />

            {/* Header: logo + issuer */}
            <div className="passport-card__head">
              <img src={logoSrc} alt="House of Holland" className="passport-card__logo" />
              <div className="passport-card__issuer">
                <span className="passport-card__country">HOUSE OF HOLLAND</span>
                <span className="passport-card__studio">◆ TATTOO EMPORIUM ◆</span>
              </div>
            </div>

            {/* Document type */}
            <div className="passport-card__type-row">
              <span className="passport-card__rule" />
              <span className="passport-card__type">TATTOO PASSPORT</span>
              <span className="passport-card__rule" />
            </div>

            {/* Bearer + tier */}
            <div className="passport-card__bearer-row">
              <div>
                <p className="passport-card__field-label">BEARER</p>
                <p className="passport-card__field-name">
                  {(profile?.full_name ?? 'MEMBER').toUpperCase()}
                </p>
              </div>
              <div className="passport-card__tier-pill">
                ◆ {tierLabel}
              </div>
            </div>

            {/* Stats */}
            <div className="passport-card__stats">
              <div className="passport-card__stat">
                <strong>{tattooCount}</strong>
                <span>tattoos</span>
              </div>
              <div className="passport-card__stat passport-card__stat--center">
                <strong>{spentDisplay}</strong>
                <span>spent at House of Holland</span>
              </div>
              <div className="passport-card__stat">
                <strong>{hoursDisplay}</strong>
                <span>hours in the chair</span>
              </div>
            </div>

            {/* MRZ-style footer */}
            <div className="passport-card__mrz">
              <div className="passport-card__mrz-inner">
                <span className="passport-card__mrz-field">
                  <span className="passport-card__mrz-label">NO.</span>
                  {passportNo}
                </span>
                <span className="passport-card__mrz-sep" />
                <span className="passport-card__mrz-field">
                  <span className="passport-card__mrz-label">SINCE</span>
                  {memberSince}
                </span>
                <span className="passport-card__mrz-sep" />
                <span className="passport-card__mrz-field">
                  <span className="passport-card__mrz-label">SEASON</span>
                  {CURRENT_SEASON}
                </span>
              </div>
            </div>
          </div>

          {/* ── Download button ── */}
          <div className="passport-page__download-row">
            <button
              className="passport-page__download-btn"
              onClick={downloadPassport}
              disabled={downloading}
            >
              <Download size={14} strokeWidth={2} />
              {downloading ? 'Generating…' : 'Save Passport Image'}
            </button>
          </div>

          {/* ── Points summary ── */}
          <div className="passport-page__points-card">
            <div className="passport-page__points-header">
              <span className="passport-page__points-season">Season {CURRENT_SEASON}</span>
              <span className="passport-page__points-reset">
                <RotateCcw size={11} strokeWidth={2} />
                Resets Jan 1 {CURRENT_SEASON + 1}
              </span>
            </div>
            <div className="passport-page__points-value">{loyaltyPoints.toLocaleString()}</div>
            <div className="passport-page__points-label">Loyalty Points</div>
            <div className="passport-page__points-rate">
              {isBlackCard ? '2 pts per $10 spent · Black Card' : '1 pt per $10 spent · Premium'}
            </div>
            {nextReward && (
              <div className="passport-page__points-progress">
                <div className="passport-page__points-track">
                  <div
                    className="passport-page__points-fill"
                    style={{ width: `${progressToNext * 100}%` }}
                  />
                </div>
                <span className="passport-page__points-progress-label">
                  {loyaltyPoints} / {nextReward.points_required} pts → {nextReward.name}
                </span>
              </div>
            )}
            {!nextReward && rewards.length > 0 && (
              <p className="passport-page__points-maxed">🎉 All rewards unlocked this season!</p>
            )}
          </div>

          {/* ── Member loyalty rewards ── */}
          <div className="passport-page__rewards">
            <h2 className="passport-page__rewards-heading">Member Loyalty Rewards</h2>
            <div className="passport-page__rewards-list">
              {rewards.map((r, idx) => {
                const unlocked = loyaltyPoints >= r.points_required
                const claimed = claims.some(c => c.reward_id === r.id)
                const fulfilled = claims.find(c => c.reward_id === r.id)?.fulfilled_at
                const soldOut = r.quantity_claimed >= r.quantity_total
                const isNext = !unlocked && rewards.findIndex(x => loyaltyPoints < x.points_required) === idx

                return (
                  <div
                    key={r.id}
                    className={[
                      'passport-page__reward-tier',
                      unlocked ? 'is-unlocked' : '',
                      isNext ? 'is-next' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <div className="passport-page__reward-badge">
                      {unlocked
                        ? <CheckCircle size={20} strokeWidth={1.8} />
                        : <Lock size={16} strokeWidth={1.8} />}
                    </div>
                    <div className="passport-page__reward-body">
                      <div className="passport-page__reward-meta">
                        <span className="passport-page__reward-tier-label">TIER {r.tier}</span>
                        <span className="passport-page__reward-pts">{r.points_required.toLocaleString()} pts</span>
                      </div>
                      <div className="passport-page__reward-name">{r.name}</div>
                      {r.description && (
                        <div className="passport-page__reward-desc">{r.description}</div>
                      )}
                      <div className="passport-page__reward-stock">
                        {r.quantity_total - r.quantity_claimed} / {r.quantity_total} remaining
                      </div>
                      {unlocked && !claimed && !soldOut && (
                        <button
                          className="passport-page__reward-claim"
                          onClick={() => claimReward(r)}
                          disabled={claiming === r.id}
                        >
                          {claiming === r.id ? 'Claiming…' : 'Claim Reward'}
                        </button>
                      )}
                      {claimed && (
                        <div className="passport-page__reward-claimed">
                          {fulfilled ? '✓ Collected' : '⏳ Claimed — awaiting collection'}
                        </div>
                      )}
                      {unlocked && soldOut && !claimed && (
                        <div className="passport-page__reward-soldout">Sold out this season</div>
                      )}
                      {isNext && (
                        <div className="passport-page__reward-need">
                          {r.points_required - loyaltyPoints} more pts needed
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {rewards.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
                  Rewards coming soon — check back next season.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
