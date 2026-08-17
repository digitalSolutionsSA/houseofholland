import { supabase } from './supabase'

export const SUPPORT_EMAIL = 'support@hohtattoos.com'
export const SUPPORT_DISPLAY_NAME = 'HoH Support'
export const SUPPORT_AVATAR = '/logo-gold.webp'
const ADMIN_EMAIL = 'info@digitalsolutionssa.co.za'

// Module-level cache so we only hit the DB once per session
let _adminProfileId: string | null | undefined = undefined

/** Returns the admin's profile ID (cached after first call). */
export async function getAdminProfileId(): Promise<string | null> {
  if (_adminProfileId !== undefined) return _adminProfileId
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .maybeSingle()
  _adminProfileId = data?.id ?? null
  return _adminProfileId as string | null
}

/**
 * Opens an in-app support conversation with the studio admin.
 * Looks up the admin by email → linked artist record → conversation.
 * Falls back gracefully to email when the admin has no artist profile.
 */
export async function openSupportChat(
  currentUserId: string,
  navigate: (path: string) => void,
): Promise<'navigated' | 'email' | 'self'> {
  const adminId = await getAdminProfileId()
  if (!adminId) return 'email'

  // Admin messaging themselves makes no sense
  if (adminId === currentUserId) return 'self'

  const { data: adminArtist } = await supabase
    .from('artists')
    .select('id')
    .eq('profile_id', adminId)
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
