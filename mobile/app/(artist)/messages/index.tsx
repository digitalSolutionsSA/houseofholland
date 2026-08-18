import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { BrandBackground } from '../../../components/shared/BrandBackground'
import { PageHeader } from '../../../components/shared/PageHeader'
import { Colors } from '../../../constants/colors'

type Conversation = {
  id: string
  customer_id: string
  customer_name: string
  customer_avatar: string | null
  last_message: string
  last_message_at: string
  unread_count: number
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function ArtistMessagesScreen() {
  const { profile } = useAuth()
  const [convos, setConvos] = useState<Conversation[]>([])

  useEffect(() => {
    if (!profile) return
    load()
    const sub = supabase
      .channel('artist-convos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load)
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [profile])

  async function load() {
    if (!profile) return
    const { data } = await supabase
      .from('conversations')
      .select(`id, customer_id, customer:profiles!conversations_customer_id_fkey(full_name, avatar_url),
        messages(content, created_at, sender_id)`)
      .eq('artist_id', profile.artist_id ?? profile.id)
      .order('created_at', { referencedTable: 'messages', ascending: false })

    const mapped: Conversation[] = (data ?? []).map((c: any) => {
      const msgs: any[] = c.messages ?? []
      msgs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const last = msgs[0]
      const unread = msgs.filter((m: any) => m.sender_id !== profile.id).length
      const customer = Array.isArray(c.customer) ? c.customer[0] : c.customer
      return {
        id: c.id,
        customer_id: c.customer_id,
        customer_name: customer?.full_name ?? 'Customer',
        customer_avatar: customer?.avatar_url ?? null,
        last_message: last?.content ?? '',
        last_message_at: last?.created_at ?? c.created_at,
        unread_count: unread,
      }
    })
    setConvos(mapped)
  }

  return (
    <BrandBackground>
      <PageHeader title="Messages" />
      <FlatList
        data={convos}
        keyExtractor={c => c.id}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.borderSubtle, marginLeft: 76 }} />}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Ionicons name="chatbubbles-outline" size={48} color={Colors.textDim} />
            <Text style={{ color: Colors.textMuted, marginTop: 12 }}>No conversations yet</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(artist)/messages/${item.id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 }}
            activeOpacity={0.7}
          >
            <View style={{ width: 50, height: 50, borderRadius: 25, overflow: 'hidden', backgroundColor: Colors.bgChip, alignItems: 'center', justifyContent: 'center' }}>
              {item.customer_avatar
                ? <Image source={{ uri: item.customer_avatar }} style={{ width: 50, height: 50 }} />
                : <Ionicons name="person" size={24} color={Colors.textDim} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: Colors.text, fontWeight: item.unread_count > 0 ? '700' : '500', fontSize: 15 }}>
                  {item.customer_name}
                </Text>
                <Text style={{ color: Colors.textDim, fontSize: 12 }}>{timeAgo(item.last_message_at)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                <Text numberOfLines={1} style={{ color: Colors.textMuted, fontSize: 13, flex: 1 }}>
                  {item.last_message || 'No messages yet'}
                </Text>
                {item.unread_count > 0 && (
                  <View style={{ backgroundColor: Colors.gold, borderRadius: 999, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}>
                    <Text style={{ color: Colors.textOnGold, fontSize: 11, fontWeight: '700' }}>
                      {item.unread_count > 9 ? '9+' : item.unread_count}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </BrandBackground>
  )
}
