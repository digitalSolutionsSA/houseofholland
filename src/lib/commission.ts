import type { MembershipPlan } from './supabase'

export const PLAN_PRICES: Record<MembershipPlan, number> = {
  free: 0,
  premium: 4.99,
  'black-card': 6.99,
}

export function getCommissionRate(paidCustomers: number): number {
  if (paidCustomers >= 1000) return 0.10
  if (paidCustomers >= 500)  return 0.075
  if (paidCustomers >= 250)  return 0.05
  if (paidCustomers > 0)     return 0.025
  return 0
}

export function getTierLabel(paid: number): string {
  if (paid >= 1000) return '10% — capped'
  if (paid >= 500)  return '7.5%'
  if (paid >= 250)  return '5.0%'
  if (paid > 0)     return '2.5%'
  return 'No tier yet'
}

export function getTierColor(paid: number): string {
  if (paid >= 1000) return '#e8c97e'
  if (paid >= 500)  return '#c8a96e'
  if (paid >= 250)  return 'var(--gold)'
  if (paid > 0)     return '#8ab4a0'
  return 'var(--text-muted)'
}

/** Returns the next paid-customer threshold, or null if already capped. */
export function nextTierThreshold(paid: number): number | null {
  if (paid < 1)    return 1
  if (paid < 250)  return 250
  if (paid < 500)  return 500
  if (paid < 1000) return 1000
  return null
}

export function monthsInPeriod(createdAt: string, periodMonths: number): number {
  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setMonth(windowStart.getMonth() - periodMonths)
  const signup = new Date(createdAt)
  const effectiveStart = signup > windowStart ? signup : windowStart
  const diffMs = now.getTime() - effectiveStart.getTime()
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.4375)
  return Math.max(0, Math.min(Math.floor(diffMonths), periodMonths))
}

export function calcCommission(
  customers: Array<{ membership_plan: MembershipPlan; created_at: string }>,
  periodMonths: number
): number {
  const paid = customers.filter(c => c.membership_plan !== 'free')
  const rate = getCommissionRate(paid.length)
  if (rate === 0) return 0
  return paid.reduce((sum, c) => {
    return sum + PLAN_PRICES[c.membership_plan] * monthsInPeriod(c.created_at, periodMonths) * rate
  }, 0)
}
