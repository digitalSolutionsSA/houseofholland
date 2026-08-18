import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { BrandBackground } from '../../../components/shared/BrandBackground'
import { PageHeader } from '../../../components/shared/PageHeader'
import { Colors } from '../../../constants/colors'

type Conversation = {
  id: string
  artist_id: string
  artist: { full_name: string; avatar_url: string | null } | null
  last_message: string | null
  last_message_at: string | null
  unread: number
}

export default function MessagesScreen() {
  const { profile } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    if (!profile) return
    const { data } = await supabase
      .from('conversations')
      .select(`
        id, artist_id,
        artist:artists(full_name, avatar_url),
        messages(body, created_at)
      `)
      .eq('customer_id', profile.id)
      .order('created_at', { referencedTable: 'messages', ascending: false })

    if (data) {
      const mapped = data.map((c: any) => ({
        id: c.id,
        artist_id: c.artist_id,
        artist: Array.isArray(c.artist) ? c.artist[0] : c.artist,
        last_message: c.messages?.[0]?.body ?? null,
        last_message_at: c.messages?.[0]?.created_at ?? null,
        unread: 0,
      }))
      setConversations(mapped)
    }
  }

  useEffect(() => { load() }, [profile])

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <BrandBackground>
      <PageHeader title="Messages" />
      <FlatList
        data={conversations}
        keyExtractor={c => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} tintColor={Colors.gold} />}
        contentContainerStyle={{ paddingTop: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(customer)/messages/${item.id}`)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: Colors.borderSubtle,
              gap: 12,
            }}
          >
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: Colors.bgChip,
              alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {item.artist?.avatar_url ? (
                <Image source={{ uri: item.artist.avatar_url }} style={{ width: 48, height: 48 }} />
              ) : (
                <Text style={{ color: Colors.gold, fontSize: 18, fontWeight: '700' }}>
                  {item.artist?.full_name?.[0] ?? '?'}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15 }}>
                {item.artist?.full_name ?? 'Unknown'}
              </Text>
              {item.last_message && (
                <Text numberOfLines={1} style={{ color: Colors.textMuted, fontSize: 13, marginTop: 2 }}>
                  {item.last_message}
                </Text>
              )}
            </View>
            {item.last_message_at && (
              <Text style={{ color: Colors.textDim, fontSize: 11 }}>{timeAgo(item.last_message_at)}</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 15 }}>No conversations yet</Text>
          </View>
        )}
      />
    </BrandBackground>
  )
}
