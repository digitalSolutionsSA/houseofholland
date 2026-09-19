import { supabase } from './supabase'

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
 * Flash-day points are NOT awarded here — they are granted when the
 * appointment is completed (see AdminFlashQueue).
 */
export async function joinFlashQueue(opts: {
  eventId: string
  eventTitle: string
  eventStatus: 'upcoming' | 'open' | 'closed'
  profileId: string
  isPremium: boolean
  selectedTattoos?: number[]
}): Promise<{ data?: FlashReservation; error?: string }> {
  const { eventId, profileId, selectedTattoos } = opts

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

  return { data: data as FlashReservation }
}
