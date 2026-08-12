import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Award, CheckCircle, Lock, RotateCcw } from 'lucide-react'
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
    const [{ data: comps }, { data: pts }, { data: rws }, { data: cls }] = await Promise.all([
      supabase.from('tattoo_completions').select('price, duration_hours').eq('profile_id', profile!.id),
      supabase.from('loyalty_points').select('points').eq('profile_id', profile!.id).eq('season', CURRENT_SEASON),
      supabase.from('battle_pass_rewards').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('battle_pass_claims').select('reward_id, fulfilled_at').eq('profile_id', profile!.id).eq('season', CURRENT_SEASON),
    ])

    setTattooCount(comps?.length ?? 0)
    setTotalHours((comps ?? []).reduce((s, c) => s + ((c as any).duration_hours ?? 0), 0))
    setTotalSpent((comps ?? []).reduce((s, c) => s + ((c as any).price ?? 0), 0))
    setLoyaltyPoints((pts ?? []).reduce((s, p) => s + p.points, 0))
    setRewards(rws ?? [])
    setClaims(cls ?? [])
    setLoading(false)
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
      <div className="page page--no-nav passport-page">
        <PageHeader title="Tattoo Passport" backTo="/profile" align="center" goldTitle serif />
        <div className="passport-page__locked">
          <div className="passport-page__locked-icon">
            <Award size={36} strokeWidth={1.2} />
          </div>
          <h2 className="passport-page__locked-title">Premium Feature</h2>
          <p className="passport-page__locked-body">
            The Tattoo Passport tracks your loyalty journey and unlocks rewards as you collect tattoos at House of Holland.
            Upgrade to <strong>Premium</strong> to start earning — or get <strong>Black Card</strong> for 2× points per R10 spent.
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
    ? `R${(totalSpent / 1000).toFixed(1)}k`
    : `R${Math.round(totalSpent).toLocaleString()}`

  const nextReward = rewards.find(r => loyaltyPoints < r.points_required)
  const progressToNext = nextReward
    ? Math.min(1, loyaltyPoints / nextReward.points_required)
    : 1

  return (
    <div className="page page--no-nav passport-page">

      {/* Hero stats strip */}
      <div className="passport-page__hero">
        <div className="passport-page__hero-stat">
          <strong>{hoursDisplay}</strong>
          <span>hours in the chair</span>
        </div>
        <div className="passport-page__hero-stat">
          <strong>{spentDisplay}</strong>
          <span>spent at House of Holland</span>
        </div>
        <div className="passport-page__hero-stat">
          <strong>{tattooCount}</strong>
          <span>tattoos</span>
        </div>
      </div>

      <PageHeader title="Tattoo Passport" backTo="/profile" align="center" goldTitle serif />

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Loading…</p>
      ) : (
        <>
          {/* Season + points summary */}
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
              {isBlackCard ? '2 pts per R10 spent · Black Card' : '1 pt per R10 spent · Premium'}
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

          {/* Member loyalty rewards */}
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
