import { supabase } from './supabase'

export const SUPPORT_EMAIL = 'support@hohtattoos.com'
const ADMIN_EMAIL = 'info@digitalsolutionssa.co.za'

/**
 * Opens an in-app support conversation with the studio admin.
 * Looks up the admin by email, then by their linked artist record.
 * Falls back to email if no artist record is found (e.g. after Leonard vR
 * profile is removed — the email fallback keeps the feature working).
 */
export async function openSupportChat(
  currentUserId: string,
  navigate: (path: string) => void,
): Promise<'navigated' | 'email' | 'self'> {
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .maybeSingle()

  if (!adminProfile) return 'email'

  // Admin messaging themselves makes no sense
  if (adminProfile.id === currentUserId) return 'self'

  const { data: adminArtist } = await supabase
    .from('artists')
    .select('id')
    .eq('profile_id', adminProfile.id)
    .maybeSingle()

  if (!adminArtist) return 'email'

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('customer_id', currentUserId)
    .eq('artist_id', adminArtist.id)
    .maybeSingle()

  if (existing) {
    navigate(`/messages/${existing.id}`)
    return 'navigated'
  }

  const { data: created } = await supabase
    .from('conversations')
    .insert({ customer_id: currentUserId, artist_id: adminArtist.id })
    .select('id')
    .single()

  if (created) {
    navigate(`/messages/${created.id}`)
    return 'navigated'
  }

  return 'email'
}
