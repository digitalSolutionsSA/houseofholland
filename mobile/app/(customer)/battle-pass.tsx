import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useMembership } from '../../hooks/useMembership'
import { CURRENT_SEASON } from '../../lib/awardPoints'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

type Reward = { id: string; title: string; points_required: number; quantity_available: number; quantity_claimed: number }
type PointEntry = { id: string; points: number; reason: string; created_at: string }
type Claim = { id: string; reward_id: string }

const REASON_ICON: Record<string, string> = {
  spend: '💰', review: '⭐', flash_day: '⚡', referral: '🔗', upgrade: '🏆', manual: '🎁',
}
const REASON_LABEL: Record<string, string> = {
  spend: 'Purchase', review: 'Review', flash_day: 'Flash Day', referral: 'Referral', upgrade: 'Upgrade Bonus', manual: 'Bonus',
}

const HOW_TO_EARN = [
  { icon: '💰', label: 'Make a purchase', pts: '1–2 pts per R10' },
  { icon: '⭐', label: 'Leave a review', pts: '15 pts' },
  { icon: '⚡', label: 'Attend flash day', pts: '25 pts' },
  { icon: '🔗', label: 'Refer a friend', pts: 'Varies' },
  { icon: '🏆', label: 'Upgrade membership', pts: '50 pts' },
]

export default function BattlePassScreen() {
  const { profile } = useAuth()
  const { isPremium } = useMembership()
  const [points, setPoints] = useState(0)
  const [history, setHistory] = useState<PointEntry[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [claiming, setClaiming] = useState<string | null>(null)

  async function load() {
    if (!profile) return
    const [ptRes, rwRes, clRes] = await Promise.all([
      supabase.from('loyalty_points').select('id, points, reason, created_at').eq('profile_id', profile.id).eq('season', CURRENT_SEASON).order('created_at', { ascending: false }),
      supabase.from('battle_pass_rewards').select('*').eq('is_active', true).order('points_required'),
      supabase.from('battle_pass_claims').select('id, reward_id').eq('profile_id', profile.id).eq('season', CURRENT_SEASON),
    ])
    const entries = ptRes.data ?? []
    setHistory(entries)
    setPoints(entries.reduce((s: number, p: PointEntry) => s + p.points, 0))
    setRewards(rwRes.data ?? [])
    setClaims(clRes.data ?? [])
  }

  useEffect(() => { load() }, [profile])

  async function claimReward(reward: Reward) {
    if (!profile) return
    setClaiming(reward.id)
    await supabase.from('battle_pass_claims').insert({ profile_id: profile.id, reward_id: reward.id, season: CURRENT_SEASON })
    await supabase.from('battle_pass_rewards').update({ quantity_claimed: reward.quantity_claimed + 1 }).eq('id', reward.id)
    await load()
    setClaiming(null)
    Alert.alert('Reward Claimed!', `"${reward.title}" has been claimed. Visit the studio to redeem.`)
  }

  if (!isPremium) return (
    <BrandBackground>
      <PageHeader title="Battle Pass" showBack />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="trophy-outline" size={56} color={Colors.gold} />
        <Text style={{ color: Colors.text, fontSize: 22, fontWeight: '800', marginTop: 16, textAlign: 'center' }}>Premium Feature</Text>
        <Text style={{ color: Colors.textMuted, textAlign: 'center', marginTop: 8, fontSize: 14 }}>Upgrade to earn and redeem loyalty points.</Text>
        <GradientButton label="Upgrade" onPress={() => router.push('/(customer)/membership')} style={{ marginTop: 24 }} />
      </View>
    </BrandBackground>
  )

  const claimedIds = new Set(claims.map(c => c.reward_id))
  const maxPts = rewards.at(-1)?.points_required ?? 100
  const progress = Math.min(points / maxPts, 1)

  return (
    <BrandBackground>
      <PageHeader title="Battle Pass" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Points overview */}
        <View style={{ margin: 18, backgroundColor: Colors.bgCard, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: Colors.borderGold }}>
          <Text style={{ color: Colors.textMuted, fontSize: 12, letterSpacing: 1 }}>SEASON {CURRENT_SEASON}</Text>
          <Text style={{ color: Colors.gold, fontSize: 52, fontWeight: '800', marginVertical: 4 }}>{points}</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 13, marginBottom: 12 }}>loyalty points</Text>
          <View style={{ height: 8, backgroundColor: Colors.bgChip, borderRadius: 4 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: Colors.gold, width: `${progress * 100}%` }} />
          </View>
          <Text style={{ color: Colors.textDim, fontSize: 11, marginTop: 6, textAlign: 'right' }}>
            {points} / {maxPts} pts to max reward
          </Text>
        </View>

        {/* Rewards track */}
        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 18, marginHorizontal: 18, marginBottom: 12 }}>Rewards</Text>
        <View style={{ paddingHorizontal: 18, gap: 8, marginBottom: 24 }}>
          {rewards.map(r => {
            const claimed = claimedIds.has(r.id)
            const canClaim = points >= r.points_required && !claimed && (r.quantity_available - r.quantity_claimed) > 0
            return (
              <View key={r.id} style={{
                backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
                borderWidth: 1, borderColor: claimed ? Colors.gold : Colors.borderSubtle,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                <Text style={{ fontSize: 28 }}>🏆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text, fontWeight: '700' }}>{r.title}</Text>
                  <Text style={{ color: Colors.gold, fontSize: 12 }}>{r.points_required} pts required</Text>
                </View>
                {claimed
                  ? <View style={{ backgroundColor: 'rgba(212,175,55,0.2)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ color: Colors.gold, fontWeight: '700', fontSize: 12 }}>✓ Claimed</Text>
                    </View>
                  : canClaim
                  ? <TouchableOpacity
                      onPress={() => claimReward(r)}
                      disabled={claiming === r.id}
                      style={{ backgroundColor: Colors.gold, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}
                    >
                      <Text style={{ color: Colors.textOnGold, fontWeight: '700', fontSize: 12 }}>
                        {claiming === r.id ? '…' : 'Claim'}
                      </Text>
                    </TouchableOpacity>
                  : <Text style={{ color: Colors.textDim, fontSize: 12 }}>{points}/{r.points_required}</Text>
                }
              </View>
            )
          })}
        </View>

        {/* How to earn */}
        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 18, marginHorizontal: 18, marginBottom: 12 }}>How to Earn</Text>
        <View style={{ paddingHorizontal: 18, gap: 8, marginBottom: 24 }}>
          {HOW_TO_EARN.map(h => (
            <View key={h.label} style={{
              backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12,
              flexDirection: 'row', alignItems: 'center', gap: 12,
              borderWidth: 1, borderColor: Colors.borderSubtle,
            }}>
              <Text style={{ fontSize: 24 }}>{h.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.text, fontSize: 14 }}>{h.label}</Text>
              </View>
              <Text style={{ color: Colors.gold, fontSize: 13, fontWeight: '700' }}>{h.pts}</Text>
            </View>
          ))}
        </View>

        {/* Points history */}
        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 18, marginHorizontal: 18, marginBottom: 12 }}>History</Text>
        <View style={{ paddingHorizontal: 18, gap: 8 }}>
          {history.map(e => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 20 }}>{REASON_ICON[e.reason] ?? '•'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.text, fontSize: 13 }}>{REASON_LABEL[e.reason] ?? e.reason}</Text>
                <Text style={{ color: Colors.textDim, fontSize: 11 }}>
                  {new Date(e.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <Text style={{ color: Colors.gold, fontWeight: '700', fontSize: 14 }}>+{e.points}</Text>
            </View>
          ))}
          {history.length === 0 && <Text style={{ color: Colors.textMuted }}>No points earned yet this season</Text>}
        </View>
      </ScrollView>
    </BrandBackground>
  )
}
