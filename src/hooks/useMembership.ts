import { useAuth } from '../context/AuthContext'
import type { MembershipPlan } from '../lib/supabase'

const TIER_ORDER: MembershipPlan[] = ['free', 'premium', 'black-card']

export function useMembership() {
  const { profile } = useAuth()
  const tier = (profile?.membership_plan ?? 'free') as MembershipPlan
  const tierIndex = TIER_ORDER.indexOf(tier)

  const isPremium  = tierIndex >= 1
  const isBlackCard = tierIndex >= 2

  return {
    tier,
    tierIndex,
    isPremium,
    isBlackCard,
    // Vault: free = locked, premium = 3, black-card = unlimited
    vaultLimit: isBlackCard ? Infinity : isPremium ? 3 : 0,
    // Shop discount: 0 | 7.5% | 15%
    shopDiscount: isBlackCard ? 0.15 : isPremium ? 0.075 : 0,
    // How many days before the event a tier can join the flash queue
    flashNoticeDays: isBlackCard ? 7 : isPremium ? 2 : 0,
    // Loyalty points multiplier: free = none, premium = 1×, black-card = 1.5×
    pointsMultiplier: isBlackCard ? 1.5 : isPremium ? 1.0 : 0,
    hasAccess: (required: MembershipPlan) =>
      tierIndex >= TIER_ORDER.indexOf(required),
  }
}
