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
    // Vault: free = locked, premium = 10, black-card = unlimited
    vaultLimit: isBlackCard ? Infinity : isPremium ? 10 : 0,
    // Shop discount: 0 | 7.5% | 15%
    shopDiscount: isBlackCard ? 0.15 : isPremium ? 0.075 : 0,
    // How many days before the event a tier can join the flash queue
    flashNoticeDays: isBlackCard ? 7 : isPremium ? 2 : 0,
    // Passport points multiplier (tattoo-count based, legacy)
    pointsMultiplier: isBlackCard ? 1.5 : isPremium ? 1.0 : 0,
    // Battle pass spend rate: points earned per R10 spent
    // Points per $100: tattoos / other spend
    tattooPointsRate: isBlackCard ? 1.5 : isPremium ? 1 : 0,
    otherPointsRate: isBlackCard ? 20 : isPremium ? 10 : 0,
    referralPoints: isBlackCard ? 15 : isPremium ? 10 : 0,
    birthdayPoints: isBlackCard ? 15 : isPremium ? 10 : 0,
    flashDayPoints: isBlackCard ? 20 : isPremium ? 15 : 0,
    hasAccess: (required: MembershipPlan) =>
      tierIndex >= TIER_ORDER.indexOf(required),
  }
}
