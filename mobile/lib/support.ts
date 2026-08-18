import { supabase } from './supabase'
import { router } from 'expo-router'

export const SUPPORT_EMAIL = 'support@hohtattoos.com'
export const SUPPORT_DISPLAY_NAME = 'HoH Support'

export async function getAdminProfileId(): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', SUPPORT_EMAIL)
    .single()
  return data?.id ?? null
}

export async function openSupportChat(userId: string) {
  const adminId = await getAdminProfileId()
  if (!adminId) return

  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('profile_id', adminId)
    .maybeSingle()

  if (!artist) return

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('customer_id', userId)
    .eq('artist_id', artist.id)
    .maybeSingle()

  let conversationId = existing?.id

  if (!conversationId) {
    const { data: created } = await supabase
      .from('conversations')
      .insert({ customer_id: userId, artist_id: artist.id })
      .select('id')
      .single()
    conversationId = created?.id
  }

  if (conversationId) {
    router.push(`/messages/${conversationId}`)
  }
}
