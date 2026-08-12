import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Trophy, Star, Zap, Users, Gift, RotateCcw, CheckCircle, Lock } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMembership } from '../hooks/useMembership'
import { CURRENT_SEASON } from '../lib/awardPoints'
import './BattlePassPage.css'

type Reward = {
  id: string
  tier: number
  name: string
  description: string | null
  points_required: number
  quantity_total: number
  quantity_claimed: number
  is_active: boolean
  sort_order: number
}

type PointTx = {
  id: string
  points: number
  reason: string
  note: string | null
  created_at: string
}

type Claim = { reward_id: string; season: number; fulfilled_at: string | null }

const REASON_LABELS: Record<string, string> = {
  spend:     'Purchase',
  referral:  'Referral bonus',
  review:    'Review bonus',
  flash_day: 'Flash day attendance',
  upgrade:   'Black Card upgrade bonus',
  manual:    'Manual award',
}

const REASON_ICONS: Record<string, typeof Star> = {
  spend:     Star,
  referral:  Users,
  review:    Star,
  flash_day: Zap,
  upgrade:   Trophy,
  manual:    Gift,
}

export function BattlePassPage() {
  const { profile } = useAuth()
  const { isPremium, isBlackCard, spendPointsRate } = useMembership()

  const [totalPoints, setTotalPoints] = useState(0)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [history, setHistory] = useState<PointTx[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id || !isPremium) { setLoading(false); return }
    load()
  }, [profile?.id, isPremium])

  async function load() {
    setLoading(true)
    const [{ data: txs }, { data: rws }, { data: cls }] = await Promise.all([
      supabase
        .from('loyalty_points')
        .select('id, points, reason, note, created_at')
        .eq('profile_id', profile!.id)
        .eq('season', CURRENT_SEASON)
        .order('created_at', { ascending: false }),
      supabase
        .from('battle_pass_rewards')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('battle_pass_claims')
        .select('reward_id, season, fulfilled_at')
        .eq('profile_id', profile!.id)
        .eq('season', CURRENT_SEASON),
    ])

    const pts = (txs ?? []).reduce((s, t) => s + t.points, 0)
    setTotalPoints(pts)
    setRewards(rws ?? [])
    setHistory(txs ?? [])
    setClaims(cls ?? [])
    setLoading(false)
  }

  async function claimReward(reward: Reward) {
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
      <div className="page page--no-nav bp-page">
        <PageHeader title="Battle Pass" backTo="/profile" align="center" goldTitle serif />
        <div className="bp-locked">
          <Trophy size={40} strokeWidth={1.2} className="bp-locked__icon" />
          <h2>Premium Feature</h2>
          <p>The Battle Pass is available on <strong>Premium</strong> and <strong>Black Card</strong> memberships. Earn points every time you spend at House of Holland and unlock limited edition rewards.</p>
          <Link to="/membership" className="bp-locked__cta">View Membership Plans</Link>
        </div>
      </div>
    )
  }

  const highestUnlocked = rewards.filter(r => totalPoints >= r.points_required).pop()
  const nextReward = rewards.find(r => totalPoints < r.points_required)
  const progressToNext = nextReward
    ? Math.min(1, totalPoints / nextReward.points_required)
    : 1

  return (
    <div className="page page--no-nav bp-page">
      <PageHeader title="Battle Pass" backTo="/profile" align="center" goldTitle serif />

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>Loading…</p>
      ) : (
        <>
          {/* Season header */}
          <div className="bp-season">
            <span className="bp-season__label">Season {CURRENT_SEASON}</span>
            <span className="bp-season__reset">
              <RotateCcw size={11} strokeWidth={2} />
              Resets Jan 1 {CURRENT_SEASON + 1}
            </span>
          </div>

          {/* Points total */}
          <div className="bp-points-card">
            <div className="bp-points-card__value">{totalPoints.toLocaleString()}</div>
            <div className="bp-points-card__label">Points this season</div>
            <div className="bp-points-card__rate">
              {isBlackCard
                ? '2 pts per R10 spent (Black Card)'
                : '1 pt per R10 spent (Premium)'}
            </div>
            {nextReward && (
              <div className="bp-points-card__progress">
                <div className="bp-points-card__progress-track">
                  <div
                    className="bp-points-card__progress-fill"
                    style={{ width: `${progressToNext * 100}%` }}
                  />
                </div>
                <span className="bp-points-card__progress-label">
                  {totalPoints} / {nextReward.points_required} pts → {nextReward.name}
                </span>
              </div>
            )}
            {!nextReward && rewards.length > 0 && (
              <p className="bp-points-card__maxed">🎉 All rewards unlocked this season!</p>
            )}
          </div>

          {/* Battle pass track */}
          <div className="bp-track">
            <h2 className="bp-track__heading">Rewards Track</h2>
            <div className="bp-track__list">
              {rewards.map((r, idx) => {
                const unlocked = totalPoints >= r.points_required
                const claimed = claims.some(c => c.reward_id === r.id)
                const fulfilled = claims.find(c => c.reward_id === r.id)?.fulfilled_at
                const soldOut = r.quantity_claimed >= r.quantity_total
                const isNext = !unlocked && rewards.findIndex(x => totalPoints < x.points_required) === idx

                return (
                  <div
                    key={r.id}
                    className={`bp-tier ${unlocked ? 'bp-tier--unlocked' : ''} ${isNext ? 'bp-tier--next' : ''}`}
                  >
                    <div className="bp-tier__badge">
                      {unlocked
                        ? <CheckCircle size={22} strokeWidth={1.8} />
                        : <Lock size={18} strokeWidth={1.8} />}
                    </div>
                    <div className="bp-tier__body">
                      <div className="bp-tier__top">
                        <span className="bp-tier__number">TIER {r.tier}</span>
                        <span className="bp-tier__pts">{r.points_required} pts</span>
                      </div>
                      <div className="bp-tier__name">{r.name}</div>
                      {r.description && (
                        <div className="bp-tier__desc">{r.description}</div>
                      )}
                      <div className="bp-tier__stock">
                        {r.quantity_total - r.quantity_claimed} / {r.quantity_total} remaining
                      </div>

                      {unlocked && !claimed && !soldOut && (
                        <button
                          className="bp-tier__claim"
                          onClick={() => claimReward(r)}
                          disabled={claiming === r.id}
                        >
                          {claiming === r.id ? 'Claiming…' : 'Claim Reward'}
                        </button>
                      )}
                      {claimed && (
                        <div className="bp-tier__claimed">
                          {fulfilled
                            ? '✓ Collected'
                            : '⏳ Claimed — awaiting collection'}
                        </div>
                      )}
                      {unlocked && soldOut && !claimed && (
                        <div className="bp-tier__soldout">Sold out this season</div>
                      )}

                      {isNext && !unlocked && (
                        <div className="bp-tier__need">
                          {r.points_required - totalPoints} more pts needed
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* How to earn */}
          <div className="bp-earn">
            <h2 className="bp-earn__heading">How to Earn Points</h2>
            <div className="bp-earn__grid">
              <div className="bp-earn__item">
                <Star size={18} className="bp-earn__icon" />
                <div>
                  <strong>Spend at HOH</strong>
                  <span>{spendPointsRate} pt{spendPointsRate !== 1 ? 's' : ''} per R10 on tattoos or merch</span>
                </div>
              </div>
              <div className="bp-earn__item">
                <Users size={18} className="bp-earn__icon" />
                <div>
                  <strong>Refer a friend</strong>
                  <span>50 pts when they get a paid membership</span>
                </div>
              </div>
              <div className="bp-earn__item">
                <Star size={18} className="bp-earn__icon" />
                <div>
                  <strong>Leave a review</strong>
                  <span>15 pts for a verified review</span>
                </div>
              </div>
              <div className="bp-earn__item">
                <Zap size={18} className="bp-earn__icon" />
                <div>
                  <strong>Attend a Flash Day</strong>
                  <span>20 pts per flash day attended</span>
                </div>
              </div>
              {!isBlackCard && (
                <div className="bp-earn__item">
                  <Trophy size={18} className="bp-earn__icon" />
                  <div>
                    <strong>Upgrade to Black Card</strong>
                    <span>100 pts bonus + earn 2× per R10</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Points history */}
          {history.length > 0 && (
            <div className="bp-history">
              <h2 className="bp-history__heading">Points History</h2>
              <div className="bp-history__list">
                {history.map(tx => {
                  const Icon = REASON_ICONS[tx.reason] ?? Gift
                  return (
                    <div key={tx.id} className="bp-history__row">
                      <Icon size={14} className="bp-history__icon" />
                      <div className="bp-history__info">
                        <span className="bp-history__label">
                          {REASON_LABELS[tx.reason] ?? tx.reason}
                        </span>
                        {tx.note && <span className="bp-history__note">{tx.note}</span>}
                      </div>
                      <span className="bp-history__pts">+{tx.points}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
