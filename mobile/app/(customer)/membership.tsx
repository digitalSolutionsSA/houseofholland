import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../context/AuthContext'
import { useMembership } from '../../hooks/useMembership'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { Colors, GoldGradientBtn } from '../../constants/colors'

type Plan = { id: 'free' | 'premium' | 'black-card'; label: string; price: string; color: string; features: string[] }

const PLANS: Plan[] = [
  {
    id: 'free', label: 'Member', price: 'Free',
    color: Colors.textMuted,
    features: ['Book appointments', 'Access flash events (day of)', 'Messages & notifications', 'Browse artists & merch'],
  },
  {
    id: 'premium', label: 'Premium', price: 'R49.99/mo',
    color: '#dc2626',
    features: ['Everything in Member', 'Earn loyalty points (1pt/R10)', 'Battle Pass rewards', '2-day early flash access', '7.5% merch discount', 'Tattoo Vault (10 entries)', 'Tattoo Passport'],
  },
  {
    id: 'black-card', label: 'Black Card', price: 'R69.99/mo',
    color: Colors.gold,
    features: ['Everything in Premium', 'Earn 2x loyalty points', '7-day early flash access', '15% merch discount', 'Unlimited Tattoo Vault', '1.5x points multiplier'],
  },
]

export default function MembershipScreen() {
  const { profile } = useAuth()
  const { tier } = useMembership()

  async function upgrade(plan: Plan) {
    if (plan.id === 'free') return
    if (plan.id === tier) { Alert.alert('Current Plan', 'You are already on this plan.'); return }

    Alert.alert(
      `Upgrade to ${plan.label}`,
      `You will be redirected to complete payment of ${plan.price}.\n\nThis feature requires PayFast payment integration.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            const { data, error } = await supabase.functions.invoke('create-payfast-payment', {
              body: {
                tier: plan.id,
                return_url: 'hoh://membership',
                cancel_url: 'hoh://membership',
              },
            })
            if (error || !data?.url) {
              Alert.alert('Error', 'Could not start payment. Please try again.')
              return
            }
            // Open PayFast URL in browser
            const { Linking } = require('react-native')
            Linking.openURL(data.url)
          },
        },
      ]
    )
  }

  return (
    <BrandBackground>
      <PageHeader title="Membership" showBack />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 14 }}>
        <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 4 }}>
          Current plan: <Text style={{ color: Colors.gold, fontWeight: '700' }}>
            {PLANS.find(p => p.id === tier)?.label ?? 'Member'}
          </Text>
        </Text>

        {PLANS.map(plan => {
          const current = plan.id === tier
          const isGold = plan.id === 'black-card'
          return (
            <View key={plan.id} style={{
              borderRadius: 18, overflow: 'hidden',
              borderWidth: current ? 2 : 1,
              borderColor: current ? plan.color : Colors.borderSubtle,
            }}>
              {isGold
                ? <LinearGradient colors={[...GoldGradientBtn]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
                    <PlanContent plan={plan} current={current} onUpgrade={upgrade} dark />
                  </LinearGradient>
                : <View style={{ backgroundColor: Colors.bgCard, padding: 18 }}>
                    <PlanContent plan={plan} current={current} onUpgrade={upgrade} />
                  </View>
              }
            </View>
          )
        })}
      </ScrollView>
    </BrandBackground>
  )
}

function PlanContent({ plan, current, onUpgrade, dark }: {
  plan: Plan; current: boolean; onUpgrade: (p: Plan) => void; dark?: boolean
}) {
  const textColor = dark ? Colors.textOnGold : Colors.text
  const mutedColor = dark ? 'rgba(26,26,26,0.65)' : Colors.textMuted

  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ color: textColor, fontSize: 20, fontWeight: '800' }}>{plan.label}</Text>
        {current && (
          <View style={{ backgroundColor: dark ? 'rgba(26,26,26,0.2)' : Colors.bgChip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: textColor, fontSize: 11, fontWeight: '700' }}>CURRENT</Text>
          </View>
        )}
      </View>
      <Text style={{ color: dark ? Colors.textOnGold : Colors.gold, fontSize: 22, fontWeight: '800', marginBottom: 14 }}>
        {plan.price}
      </Text>
      {plan.features.map(f => (
        <View key={f} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
          <Ionicons name="checkmark-circle" size={16} color={dark ? Colors.textOnGold : plan.color} style={{ marginTop: 1 }} />
          <Text style={{ color: mutedColor, fontSize: 13, flex: 1 }}>{f}</Text>
        </View>
      ))}
      {!current && plan.id !== 'free' && (
        <TouchableOpacity
          onPress={() => onUpgrade(plan)}
          style={{
            marginTop: 14, borderRadius: 12, padding: 12, alignItems: 'center',
            backgroundColor: dark ? 'rgba(26,26,26,0.25)' : plan.color,
          }}
        >
          <Text style={{ color: dark ? Colors.textOnGold : '#fff', fontWeight: '700', fontSize: 15 }}>
            Upgrade to {plan.label}
          </Text>
        </TouchableOpacity>
      )}
    </>
  )
}
