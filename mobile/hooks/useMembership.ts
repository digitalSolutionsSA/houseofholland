import { useAuth } from '../context/AuthContext'
import type { MembershipPlan } from '../lib/supabase'

const TIER_ORDER: MembershipPlan[] = ['free', 'premium', 'black-card']

export function useMembership() {
  const { profile } = useAuth()
  const tier: MembershipPlan = profile?.membership_plan ?? 'free'
  const tierIndex = TIER_ORDER.indexOf(tier)
  const isPremium = tierIndex >= 1
  const isBlackCard = tierIndex >= 2

  const vaultLimit = isBlackCard ? Infinity : isPremium ? 10 : 0
  const shopDiscount = isBlackCard ? 0.15 : isPremium ? 0.075 : 0
  const flashNoticeDays = isBlackCard ? 7 : isPremium ? 2 : 0
  const pointsMultiplier = isBlackCard ? 1.5 : isPremium ? 1.0 : 0
  const spendPointsRate = isBlackCard ? 2 : isPremium ? 1 : 0

  function hasAccess(required: MembershipPlan): boolean {
    return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(required)
  }

  return {
    tier,
    tierIndex,
    isPremium,
    isBlackCard,
    vaultLimit,
    shopDiscount,
    flashNoticeDays,
    pointsMultiplier,
    spendPointsRate,
    hasAccess,
  }
}
