import { useState } from 'react'
import { Search, Trophy, Gift, Zap, Users, Star, CheckCircle, ShieldOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { awardBonusPoints, CURRENT_SEASON } from '../../lib/awardPoints'

type Client = { id: string; full_name: string | null; email: string | null; membership_plan: string }
type PointTx = { id: string; points: number; reason: string; note: string | null; created_at: string }
type Reward  = { id: string; tier: number; name: string; points_required: number; quantity_total: number; quantity_claimed: number }
type Claim   = { id: string; reward_id: string; claimed_at: string; fulfilled_at: string | null; battle_pass_rewards: Reward | null }

const BONUS_OPTIONS = [
  { reason: 'review'    as const, label: 'Review',            points: 15,  icon: Star },
  { reason: 'flash_day' as const, label: 'Flash Day',         points: 20,  icon: Zap },
  { reason: 'referral'  as const, label: 'Referral',          points: 50,  icon: Users },
  { reason: 'upgrade'   as const, label: 'Black Card Upgrade', points: 100, icon: Trophy },
  { reason: 'manual'    as const, label: 'Manual (custom)',   points: 0,   icon: Gift },
]

const REASON_LABELS: Record<string, string> = {
  spend: 'Purchase', referral: 'Referral', review: 'Review',
  flash_day: 'Flash day', upgrade: 'Upgrade bonus', manual: 'Manual',
}

export function AdminPoints() {
  const { profile } = useAuth()
  const isManager = profile?.role === 'manager'
  const isSuper = !!profile?.is_super_admin

  const [search, setSearch]           = useState('')
  const [results, setResults]         = useState<Client[]>([])
  const [client, setClient]           = useState<Client | null>(null)
  const [totalPoints, setTotalPoints] = useState(0)
  const [history, setHistory]         = useState<PointTx[]>([])
  const [rewards, setRewards]         = useState<Reward[]>([])
  const [claims, setClaims]           = useState<Claim[]>([])
  const [loadingClient, setLoadingClient] = useState(false)

  const [bonusReason, setBonusReason] = useState<typeof BONUS_OPTIONS[number]['reason']>('review')
  const [customPts, setCustomPts]     = useState('')
  const [bonusNote, setBonusNote]     = useState('')
  const [awarding, setAwarding]       = useState(false)
  const [awardMsg, setAwardMsg]       = useState<string | null>(null)

  async function searchClients(q: string) {
    setSearch(q)
    if (q.length < 2) { setResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, membership_plan')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .in('membership_plan', ['premium', 'black-card'])
      .limit(6)
    setResults(data ?? [])
  }

  async function selectClient(c: Client) {
    setClient(c)
    setResults([])
    setSearch('')
    setLoadingClient(true)
    setAwardMsg(null)

    const [{ data: txs }, { data: rws }, { data: cls }] = await Promise.all([
      supabase
        .from('loyalty_points')
        .select('id, points, reason, note, created_at')
        .eq('profile_id', c.id)
        .eq('season', CURRENT_SEASON)
        .order('created_at', { ascending: false }),
      supabase
        .from('battle_pass_rewards')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('battle_pass_claims')
        .select('id, reward_id, claimed_at, fulfilled_at, battle_pass_rewards(*)')
        .eq('profile_id', c.id)
        .eq('season', CURRENT_SEASON),
    ])

    const pts = (txs ?? []).reduce((s, t) => s + t.points, 0)
    setTotalPoints(pts)
    setHistory(txs ?? [])
    setRewards(rws ?? [])
    setClaims((cls ?? []) as unknown as Claim[])
    setLoadingClient(false)
  }

  async function awardPoints() {
    if (!client || !profile?.id) return
    const selected = BONUS_OPTIONS.find(o => o.reason === bonusReason)!
    const pts = bonusReason === 'manual'
      ? (customPts.trim() ? parseInt(customPts) : 0)
      : selected.points

    if (pts <= 0) return
    setAwarding(true)
    setAwardMsg(null)

    await awardBonusPoints({
      profileId: client.id,
      points: pts,
      reason: bonusReason,
      note: bonusNote.trim() || selected.label,
      awardedBy: profile.id,
    })

    setAwardMsg(`✓ Awarded ${pts} points to ${client.full_name ?? client.email}`)
    setCustomPts('')
    setBonusNote('')
    setAwarding(false)
    selectClient(client)
  }

  async function fulfillClaim(claimId: string) {
    if (!profile?.id) return
    await supabase
      .from('battle_pass_claims')
      .update({ fulfilled_at: new Date().toISOString(), fulfilled_by: profile.id })
      .eq('id', claimId)
    selectClient(client!)
  }

  const pendingClaims = claims.filter(c => !c.fulfilled_at)
  const fulfilledClaims = claims.filter(c => c.fulfilled_at)

  if (!isSuper) return (
    <div className="admin-page__access-denied">
      <ShieldOff size={40} strokeWidth={1.2} />
      <p>Access restricted.</p>
    </div>
  )

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Client Points</h1>
      </div>

      {/* Customer search */}
      <div style={{ position: 'relative', maxWidth: 400, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, padding: '10px 14px' }}>
          <Search size={15} color="var(--text-muted)" />
          <input
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.9rem', flex: 1 }}
            value={client ? `${client.full_name ?? ''} (${client.email})` : search}
            onChange={e => { setClient(null); setTotalPoints(0); setHistory([]); setClaims([]); searchClients(e.target.value) }}
            placeholder="Search premium/black card members…"
          />
        </div>
        {results.length > 0 && !client && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, zIndex: 10, marginTop: 4 }}>
            {results.map(r => (
              <button key={r.id} type="button"
                onClick={() => selectClient(r)}
                style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div style={{ fontWeight: 600 }}>{r.full_name ?? 'No name'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                  <span>{r.email}</span>
                  <span style={{ color: 'var(--gold)', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.08em', fontWeight: 700 }}>
                    {r.membership_plan}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {client && (
        <>
          {loadingClient ? (
            <p className="admin-empty">Loading…</p>
          ) : (
            <div style={{ display: 'grid', gap: 24 }}>

              {/* Points summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                <div className="admin-stat">
                  <div className="admin-stat__value" style={{ fontSize: '2.2rem' }}>{totalPoints}</div>
                  <div className="admin-stat__label">Points · Season {CURRENT_SEASON}</div>
                </div>
                {rewards.map(r => {
                  const unlocked = totalPoints >= r.points_required
                  const claimed = claims.some(c => c.reward_id === r.id)
                  return (
                    <div key={r.id} className="admin-stat" style={{ opacity: unlocked ? 1 : 0.5 }}>
                      <div className="admin-stat__value" style={{ fontSize: '1.1rem', color: unlocked ? 'var(--gold)' : 'var(--text-muted)' }}>
                        {unlocked ? (claimed ? '✓ Claimed' : '✓ Unlocked') : `${r.points_required} pts`}
                      </div>
                      <div className="admin-stat__label">Tier {r.tier}: {r.name}</div>
                    </div>
                  )
                })}
              </div>

              {/* Pending claims to fulfill */}
              {pendingClaims.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10, fontWeight: 700 }}>
                    Pending Reward Claims
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pendingClaims.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {(c.battle_pass_rewards as any)?.name ?? 'Reward'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Claimed {new Date(c.claimed_at).toLocaleDateString()}
                          </div>
                        </div>
                        {isManager && (
                          <button className="admin-btn admin-btn--primary" style={{ fontSize: '0.75rem', padding: '6px 14px' }}
                            onClick={() => fulfillClaim(c.id)}>
                            <CheckCircle size={12} style={{ display: 'inline', marginRight: 5 }} />
                            Mark Collected
                          </button>
                        )}
                        {!isManager && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Awaiting collection</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Award bonus points */}
              <div>
                <h3 style={{ fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12, fontWeight: 700 }}>
                  Award Bonus Points
                </h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {BONUS_OPTIONS.map(opt => {
                      const Icon = opt.icon
                      const active = bonusReason === opt.reason
                      return (
                        <button
                          key={opt.reason}
                          onClick={() => setBonusReason(opt.reason)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '8px 14px', borderRadius: 8, fontSize: '0.8rem',
                            fontWeight: 600, border: `1px solid ${active ? 'var(--gold)' : 'var(--border-subtle)'}`,
                            background: active ? 'rgba(var(--accent-rgb),0.12)' : 'transparent',
                            color: active ? 'var(--gold)' : 'var(--text-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          <Icon size={13} />
                          {opt.label}
                          {opt.points > 0 && <span style={{ opacity: 0.7 }}>({opt.points})</span>}
                        </button>
                      )
                    })}
                  </div>

                  {bonusReason === 'manual' && (
                    <div className="admin-modal__field">
                      <label className="admin-modal__label">Custom Points</label>
                      <input className="admin-modal__input" type="number" min="1"
                        value={customPts} placeholder="Enter amount"
                        onChange={e => setCustomPts(e.target.value)}
                        style={{ maxWidth: 180 }} />
                    </div>
                  )}

                  <div className="admin-modal__field">
                    <label className="admin-modal__label">Note (optional)</label>
                    <input className="admin-modal__input" value={bonusNote}
                      placeholder="e.g. Left a 5-star Google review"
                      onChange={e => setBonusNote(e.target.value)} />
                  </div>

                  <div>
                    <button className="admin-btn admin-btn--primary"
                      onClick={awardPoints} disabled={awarding}>
                      <Trophy size={13} style={{ display: 'inline', marginRight: 6 }} />
                      {awarding ? 'Awarding…' : `Award ${bonusReason === 'manual' ? (customPts || '?') : BONUS_OPTIONS.find(o => o.reason === bonusReason)?.points} pts`}
                    </button>
                    {awardMsg && (
                      <p style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--gold)' }}>{awardMsg}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Points history */}
              {history.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10, fontWeight: 700 }}>
                    Points History
                  </h3>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Reason</th>
                        <th>Note</th>
                        <th>Pts</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(tx => (
                        <tr key={tx.id}>
                          <td style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>{REASON_LABELS[tx.reason] ?? tx.reason}</td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tx.note ?? '—'}</td>
                          <td style={{ fontWeight: 700, color: 'var(--gold)' }}>+{tx.points}</td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {new Date(tx.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {fulfilledClaims.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8, fontWeight: 700 }}>
                    Collected Rewards
                  </h3>
                  {fulfilledClaims.map(c => (
                    <div key={c.id} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      ✓ {(c.battle_pass_rewards as any)?.name} — collected {new Date(c.fulfilled_at!).toLocaleDateString()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!client && (
        <p className="admin-empty">Search for a Premium or Black Card member to view their points and battle pass progress.</p>
      )}
    </div>
  )
}
