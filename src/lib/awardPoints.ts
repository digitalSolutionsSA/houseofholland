import { supabase } from './supabase'

export const CURRENT_SEASON = new Date().getFullYear()

type Plan = 'free' | 'premium' | 'black-card' | null | undefined

// Points per full $100 spent, by category and tier. Free tier earns nothing.
export const SPEND_RATE: Record<'tattoo' | 'other', { premium: number; 'black-card': number }> = {
  tattoo: { premium: 1, 'black-card': 1.5 },
  other:  { premium: 10, 'black-card': 20 },
}

// Flat bonuses by tier
export const BONUS_POINTS = {
  referral:  { premium: 10, 'black-card': 15 },
  birthday:  { premium: 10, 'black-card': 15 },
  flash_day: { premium: 15, 'black-card': 20 },
}

export function bonusFor(kind: keyof typeof BONUS_POINTS, plan: Plan): number {
  return plan === 'premium' || plan === 'black-card' ? BONUS_POINTS[kind][plan] : 0
}

async function getPlan(profileId: string): Promise<Plan> {
  const { data } = await supabase.from('profiles').select('membership_plan').eq('id', profileId).single()
  return data?.membership_plan as Plan
}

export async function awardSpendPoints(opts: {
  profileId: string
  price: number
  awardedBy: string
  referenceId?: string
  category?: 'tattoo' | 'other'
}) {
  const { profileId, price, awardedBy, referenceId, category = 'tattoo' } = opts
  if (price <= 0) return 0

  const plan = await getPlan(profileId)
  if (plan !== 'premium' && plan !== 'black-card') return 0

  const points = Math.floor(price / 100) * SPEND_RATE[category][plan]
  if (points === 0) return 0

  await supabase.from('loyalty_points').insert({
    profile_id: profileId,
    points,
    reason: 'spend',
    reference_id: referenceId ?? null,
    note: `$${Math.round(price)} spent (${category === 'tattoo' ? 'tattoo' : 'other'})`,
    awarded_by: awardedBy,
    season: CURRENT_SEASON,
  })

  return points
}

/** Flash-day completion bonus — once per flash reservation. */
export async function awardFlashDayPoints(opts: { profileId: string; awardedBy: string; referenceId: string; note?: string }) {
  const { profileId, awardedBy, referenceId, note } = opts
  const points = bonusFor('flash_day', await getPlan(profileId))
  if (points === 0) return 0
  const { data: existing } = await supabase
    .from('loyalty_points').select('id')
    .eq('profile_id', profileId).eq('reason', 'flash_day').eq('reference_id', referenceId).maybeSingle()
  if (existing) return 0
  await awardBonusPoints({ profileId, points, reason: 'flash_day', note: note ?? 'Flash day completed', awardedBy, referenceId })
  return points
}

export async function awardBonusPoints(opts: {
  profileId: string
  points: number
  reason: 'referral' | 'review' | 'flash_day' | 'upgrade' | 'manual'
  note?: string
  awardedBy: string
  referenceId?: string
}) {
  const { profileId, points, reason, note, awardedBy, referenceId } = opts

  await supabase.from('loyalty_points').insert({
    profile_id: profileId,
    points,
    reason,
    reference_id: referenceId ?? null,
    note: note ?? null,
    awarded_by: awardedBy,
    season: CURRENT_SEASON,
  })
}
