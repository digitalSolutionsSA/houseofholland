import { Capacitor } from '@capacitor/core'
import { Purchases, LOG_LEVEL, type PurchasesOffering } from '@revenuecat/purchases-capacitor'
import type { MembershipPlan } from './supabase'

// RevenueCat public SDK keys — safe to ship in the client (same trust level as
// a Stripe publishable key). Get these from RevenueCat → Project settings → API keys.
// Leave blank until RevenueCat is set up; purchasing stays disabled until then.
const REVENUECAT_IOS_KEY = ''
const REVENUECAT_ANDROID_KEY = ''

// RevenueCat entitlement identifiers — must match what's configured in the
// RevenueCat dashboard (Entitlements tab), each attached to the matching
// App Store / Play subscription product.
export const ENTITLEMENT_BY_TIER: Record<'premium' | 'black-card', string> = {
  premium: 'premium',
  'black-card': 'black_card',
}

let configured = false

export function iapAvailable(): boolean {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') return REVENUECAT_IOS_KEY.length > 0
  if (platform === 'android') return REVENUECAT_ANDROID_KEY.length > 0
  return false
}

// Call once, after we know the signed-in user's id — RevenueCat uses this as
// its app_user_id, which is how our webhook maps a purchase back to a profile.
export async function configurePurchases(userId: string) {
  if (!iapAvailable() || configured) return
  const apiKey = Capacitor.getPlatform() === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY

  await Purchases.setLogLevel({ level: LOG_LEVEL.WARN })
  await Purchases.configure({ apiKey, appUserID: userId })
  configured = true
}

export async function logOutPurchases() {
  if (!configured) return
  try { await Purchases.logOut() } catch { /* no-op if already logged out */ }
  configured = false
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const { current } = await Purchases.getOfferings()
  return current
}

// Purchases the package for a tier and returns the tier if the resulting
// entitlements confirm it — the source of truth for unlocking UI state is
// still the webhook-updated `profiles.membership_plan` in Supabase, this is
// just for immediate optimistic feedback.
export async function purchaseTier(tier: 'premium' | 'black-card'): Promise<MembershipPlan | null> {
  const offering = await getCurrentOffering()
  const pkg = offering?.availablePackages.find(
    p => p.identifier === tier || p.product.identifier.includes(tier.replace('-', '_'))
  )
  if (!pkg) throw new Error('This plan is not available for purchase right now.')

  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
  const entitlement = ENTITLEMENT_BY_TIER[tier]
  return customerInfo.entitlements.active[entitlement] ? tier : null
}

export async function restorePurchases(): Promise<void> {
  await Purchases.restorePurchases()
}
