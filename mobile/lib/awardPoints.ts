import { supabase } from './supabase'
import type { MembershipPlan } from './supabase'

export const CURRENT_SEASON = 'S1-2025'

const POINTS_PER_R10: Record<MembershipPlan, number> = {
  free: 0,
  premium: 1,
  'black-card': 2,
}

export async function awardSpendPoints(
  profileId: string,
  price: number,
  awardedBy: string
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('membership_plan')
    .eq('id', profileId)
    .single()

  if (!profile) return
  const rate = POINTS_PER_R10[profile.membership_plan as MembershipPlan] ?? 0
  if (rate === 0) return

  const points = Math.floor((price / 10) * rate)
  if (points <= 0) return

  await supabase.from('loyalty_points').insert({
    profile_id: profileId,
    points,
    reason: 'spend',
    season: CURRENT_SEASON,
    awarded_by: awardedBy,
  })
}

export type BonusReason = 'review' | 'flash_day' | 'referral' | 'upgrade' | 'manual'

export async function awardBonusPoints(
  profileId: string,
  points: number,
  reason: BonusReason,
  awardedBy: string
) {
  await supabase.from('loyalty_points').insert({
    profile_id: profileId,
    points,
    reason,
    season: CURRENT_SEASON,
    awarded_by: awardedBy,
  })
}
