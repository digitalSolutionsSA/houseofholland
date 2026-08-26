import { supabase } from './supabase'
import { awardBonusPoints, CURRENT_SEASON } from './awardPoints'

export type FlashReservation = {
  id: string
  position: number | null
  reserved_at: string
  status: 'waiting' | 'claimed' | 'completed'
}

/**
 * Inserts a flash_reservations row and stamps waiver_signed_at — callers
 * must only invoke this once the customer has a signed consent form on
 * file (checked by the caller, since where that check happens differs
 * between the direct-join button and the sign-then-join redirect flow).
 * Also awards flash-day attendance points, same as the previous inline
 * logic in FlashQueuePage — centralised here so both entry points behave
 * identically.
 */
export async function joinFlashQueue(opts: {
  eventId: string
  eventTitle: string
  eventStatus: 'upcoming' | 'open' | 'closed'
  profileId: string
  isPremium: boolean
  selectedTattoos?: number[]
}): Promise<{ data?: FlashReservation; error?: string }> {
  const { eventId, eventTitle, eventStatus, profileId, isPremium, selectedTattoos } = opts

  const { data, error } = await supabase
    .from('flash_reservations')
    .insert({
      flash_event_id: eventId,
      profile_id: profileId,
      waiver_signed_at: new Date().toISOString(),
      selected_tattoo_numbers: selectedTattoos && selectedTattoos.length > 0 ? selectedTattoos.slice(0, 2) : null,
    })
    .select('id, position, reserved_at, status')
    .single()

  if (error) return { error: error.message }

  if (eventStatus === 'open' && isPremium) {
    const { data: existing } = await supabase
      .from('loyalty_points')
      .select('id')
      .eq('profile_id', profileId)
      .eq('reason', 'flash_day')
      .eq('reference_id', eventId)
      .eq('season', CURRENT_SEASON)
      .maybeSingle()

    if (!existing) {
      await awardBonusPoints({
        profileId,
        points: 20,
        reason: 'flash_day',
        note: eventTitle,
        awardedBy: profileId,
        referenceId: eventId,
      })
    }
  }

  return { data: data as FlashReservation }
}
