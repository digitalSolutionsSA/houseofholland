import { supabase } from './supabase'

export const CURRENT_SEASON = new Date().getFullYear()

export async function awardSpendPoints(opts: {
  profileId: string
  price: number
  awardedBy: string
  referenceId?: string
}) {
  const { profileId, price, awardedBy, referenceId } = opts
  if (price <= 0) return 0

  const { data: profile } = await supabase
    .from('profiles')
    .select('membership_plan')
    .eq('id', profileId)
    .single()

  const plan = profile?.membership_plan
  const rate = plan === 'black-card' ? 2 : plan === 'premium' ? 1 : 0
  if (rate === 0) return 0

  const points = Math.floor(price / 10) * rate
  if (points === 0) return 0

  await supabase.from('loyalty_points').insert({
    profile_id: profileId,
    points,
    reason: 'spend',
    reference_id: referenceId ?? null,
    note: `$${Math.round(price)} spent`,
    awarded_by: awardedBy,
    season: CURRENT_SEASON,
  })

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
