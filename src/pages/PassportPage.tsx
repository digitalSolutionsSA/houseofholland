import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { PageHeader } from '../components/shared/PageHeader'
import { OutlineButton } from '../components/shared/OutlineButton'
import { ProgressRing3D } from '../components/three/ProgressRing3D'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './PassportPage.css'

type Reward = {
  id: string
  tattoo_count: number
  tier: string
  reward_label: string
}

function getTier(count: number) {
  if (count >= 20) return 'BLACK'
  if (count >= 10) return 'GOLD'
  if (count >= 5)  return 'SILVER'
  return 'BRONZE'
}

const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'BLACK'] as const

export function PassportPage() {
  const { profile } = useAuth()
  const [tattooCount, setTattooCount] = useState(0)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTier, setActiveTier] = useState<typeof TIERS[number]>('BRONZE')

  useEffect(() => {
    if (!profile?.id) return
    async function load() {
      const [{ count }, { data: rw }] = await Promise.all([
        supabase
          .from('tattoo_completions')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', profile!.id),
        supabase
          .from('passport_rewards')
          .select('*')
          .order('sort_order'),
      ])

      const n = count ?? 0
      setTattooCount(n)
      setRewards(rw ?? [])
      setActiveTier(getTier(n))
      setLoading(false)
    }
    load()
  }, [profile?.id])

  // Next reward after current count
  const nextReward = rewards.find(r => r.tattoo_count > tattooCount)
  const prevMilestone = nextReward
    ? (rewards.filter(r => r.tattoo_count <= tattooCount).pop()?.tattoo_count ?? 0)
    : tattooCount
  const progress = nextReward
    ? (tattooCount - prevMilestone) / (nextReward.tattoo_count - prevMilestone)
    : 1

  const tierRewards = rewards.filter(r => r.tier.toUpperCase() === activeTier)
  const points = tattooCount * 100

  if (profile && (profile.role === 'artist' || profile.role === 'manager')) {
    return <Navigate to="/home" replace />
  }

  return (
    <div className="page page--no-nav passport-page">
      <PageHeader
        title="Tattoo Passport"
        backTo="/profile"
        align="center"
        goldTitle
        serif
      />

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Loading…</p>
      ) : (
        <>
          <ProgressRing3D
            value={tattooCount}
            label="Tattoos Completed"
            progress={tattooCount === 0 ? 0 : progress}
          />

          {nextReward ? (
            <article className="passport-page__reward">
              <div>
                <p className="passport-page__reward-label">NEXT REWARD AT {nextReward.tattoo_count} TATTOOS</p>
                <h2>{tattooCount} / {nextReward.tattoo_count}</h2>
                <p className="passport-page__reward-item">{nextReward.reward_label}</p>
              </div>
            </article>
          ) : (
            <article className="passport-page__reward">
              <div>
                <p className="passport-page__reward-label">ALL REWARDS UNLOCKED</p>
                <p className="passport-page__reward-item">You've reached the top. Legend status.</p>
              </div>
            </article>
          )}

          <div className="passport-page__tiers" role="tablist">
            {TIERS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={activeTier === t}
                className={activeTier === t ? 'is-active' : ''}
                onClick={() => setActiveTier(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <article className="passport-page__stats">
            <div>
              <strong>{tattooCount}</strong>
              <span>Tattoos</span>
            </div>
            <div>
              <strong>{points.toLocaleString()}</strong>
              <span>Points</span>
            </div>
            <div>
              <strong className="is-gold">{getTier(tattooCount)}</strong>
              <span>Tier</span>
            </div>
          </article>

          {tierRewards.length > 0 && (
            <ul className="passport-page__tier-rewards">
              {tierRewards.map(r => (
                <li key={r.id} className={tattooCount >= r.tattoo_count ? 'is-unlocked' : ''}>
                  <span className="passport-page__reward-check">
                    {tattooCount >= r.tattoo_count ? '✓' : '○'}
                  </span>
                  <div>
                    <span className="passport-page__reward-count">{r.tattoo_count} tattoos</span>
                    <span className="passport-page__reward-name">{r.reward_label}</span>
                  </div>
                </li>
              ))}
              {tierRewards.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>
                  No rewards in this tier yet.
                </p>
              )}
            </ul>
          )}

          <div className="passport-page__cta">
            <Link to="/membership">
              <OutlineButton>VIEW MEMBERSHIP</OutlineButton>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
