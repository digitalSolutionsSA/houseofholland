import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useMembership } from '../../hooks/useMembership'
import { CURRENT_SEASON } from '../../lib/awardPoints'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors, GoldGradientBtn } from '../../constants/colors'

type Reward = { id: string; title: string; points_required: number; quantity_available: number; quantity_claimed: number }
type Claim = { id: string; reward_id: string; claimed_at: string }

export default function PassportScreen() {
  const { profile } = useAuth()
  const { isPremium } = useMembership()
  const [tattooCount, setTattooCount] = useState(0)
  const [totalHours, setTotalHours] = useState(0)
  const [totalSpend, setTotalSpend] = useState(0)
  const [points, setPoints] = useState(0)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [claiming, setClaiming] = useState<string | null>(null)

  async function load() {
    if (!profile) return
    const [tcRes, ptRes, rwRes, clRes] = await Promise.all([
      supabase.from('tattoo_completions').select('price, duration_hours').eq('profile_id', profile.id),
      supabase.from('loyalty_points').select('points').eq('profile_id', profile.id).eq('season', CURRENT_SEASON),
      supabase.from('battle_pass_rewards').select('*').eq('is_active', true).order('points_required'),
      supabase.from('battle_pass_claims').select('id, reward_id, claimed_at').eq('profile_id', profile.id).eq('season', CURRENT_SEASON),
    ])
    const completions = tcRes.data ?? []
    setTattooCount(completions.length)
    setTotalHours(completions.reduce((s: number, t: any) => s + (t.duration_hours ?? 0), 0))
    setTotalSpend(completions.reduce((s: number, t: any) => s + (t.price ?? 0), 0))
    setPoints((ptRes.data ?? []).reduce((s: number, p: any) => s + p.points, 0))
    setRewards(rwRes.data ?? [])
    setClaims(clRes.data ?? [])
  }

  useEffect(() => { load() }, [profile])

  async function claimReward(reward: Reward) {
    if (!profile || points < reward.points_required) return
    setClaiming(reward.id)
    await supabase.from('battle_pass_claims').insert({
      profile_id: profile.id,
      reward_id: reward.id,
      season: CURRENT_SEASON,
    })
    await supabase.from('battle_pass_rewards').update({
      quantity_claimed: reward.quantity_claimed + 1,
    }).eq('id', reward.id)
    await load()
    setClaiming(null)
    Alert.alert('Reward Claimed!', `Your "${reward.title}" reward has been claimed. Visit the studio to redeem it.`)
  }

  if (!isPremium) return (
    <BrandBackground>
      <PageHeader title="Tattoo Passport" showBack />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="id-card-outline" size={56} color={Colors.gold} />
        <Text style={{ color: Colors.text, fontSize: 22, fontWeight: '800', marginTop: 16, textAlign: 'center' }}>Premium Feature</Text>
        <Text style={{ color: Colors.textMuted, textAlign: 'center', marginTop: 8, fontSize: 14, lineHeight: 22 }}>
          Upgrade to view your tattoo passport, lifetime stats, and claim rewards.
        </Text>
        <GradientButton label="Upgrade Membership" onPress={() => router.push('/(customer)/membership')} style={{ marginTop: 24 }} />
      </View>
    </BrandBackground>
  )

  const claimedIds = new Set(claims.map(c => c.reward_id))

  return (
    <BrandBackground>
      <PageHeader title="Tattoo Passport" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Passport card */}
        <LinearGradient
          colors={[...GoldGradientBtn]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ margin: 18, borderRadius: 20, padding: 20 }}
        >
          <Text style={{ color: Colors.textOnGold, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>
            HOUSE OF HOLLAND · TATTOO PASSPORT
          </Text>
          <Text style={{ color: Colors.textOnGold, fontSize: 22, fontWeight: '800', marginBottom: 16 }}>
            {profile?.full_name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <Stat label="Tattoos" value={tattooCount.toString()} dark />
            <Stat label="Hours" value={totalHours.toFixed(1)} dark />
            <Stat label="Spent" value={`R${totalSpend.toLocaleString()}`} dark />
          </View>
        </LinearGradient>

        {/* Points */}
        <View style={{ marginHorizontal: 18, marginBottom: 24 }}>
          <View style={{
            backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
            alignItems: 'center', borderWidth: 1, borderColor: Colors.borderGold,
          }}>
            <Text style={{ color: Colors.textMuted, fontSize: 12, letterSpacing: 1, marginBottom: 4 }}>LOYALTY POINTS</Text>
            <Text style={{ color: Colors.gold, fontSize: 42, fontWeight: '800' }}>{points}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>Season {CURRENT_SEASON}</Text>
          </View>
        </View>

        {/* Rewards */}
        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 18, marginHorizontal: 18, marginBottom: 12 }}>Rewards</Text>
        <View style={{ paddingHorizontal: 18, gap: 10 }}>
          {rewards.map(r => {
            const claimed = claimedIds.has(r.id)
            const canClaim = points >= r.points_required && !claimed
            const avail = r.quantity_available - r.quantity_claimed
            return (
              <View key={r.id} style={{
                backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
                borderWidth: 1, borderColor: claimed ? Colors.borderGold : Colors.borderSubtle,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: claimed ? Colors.gold : Colors.bgChip,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name={claimed ? 'checkmark' : 'trophy-outline'} size={22} color={claimed ? Colors.textOnGold : Colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 14 }}>{r.title}</Text>
                  <Text style={{ color: Colors.gold, fontSize: 12, marginTop: 2 }}>{r.points_required} pts</Text>
                  {avail > 0 && !claimed && <Text style={{ color: Colors.textDim, fontSize: 11 }}>{avail} remaining</Text>}
                </View>
                {claimed
                  ? <Text style={{ color: Colors.gold, fontSize: 12, fontWeight: '700' }}>Claimed</Text>
                  : canClaim && avail > 0
                  ? <TouchableOpacity
                      onPress={() => claimReward(r)}
                      disabled={claiming === r.id}
                      style={{ backgroundColor: Colors.gold, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}
                    >
                      <Text style={{ color: Colors.textOnGold, fontWeight: '700', fontSize: 12 }}>Claim</Text>
                    </TouchableOpacity>
                  : <Text style={{ color: Colors.textDim, fontSize: 12 }}>{points}/{r.points_required}</Text>
                }
              </View>
            )
          })}
        </View>
      </ScrollView>
    </BrandBackground>
  )
}

function Stat({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <View>
      <Text style={{ color: dark ? 'rgba(26,26,26,0.7)' : Colors.textMuted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: dark ? Colors.textOnGold : Colors.text, fontSize: 20, fontWeight: '800' }}>{value}</Text>
    </View>
  )
}
