import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import { BrandBackground } from '../../../components/shared/BrandBackground'
import { PageHeader } from '../../../components/shared/PageHeader'
import { Colors } from '../../../constants/colors'

type FlashEvent = {
  id: string
  title: string
  event_date: string
  status: string
  max_spots: number
  cover_image_url: string | null
  description: string | null
}

const STATUS_COLOR: Record<string, string> = {
  upcoming: Colors.gold,
  active: '#4ade80',
  completed: Colors.textMuted,
  cancelled: '#ef4444',
}

export default function FlashQueueScreen() {
  const [events, setEvents] = useState<FlashEvent[]>([])
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('flash_events')
      .select('id, title, event_date, status, max_spots, cover_image_url, description')
      .in('status', ['upcoming', 'active'])
      .order('event_date', { ascending: true })
    setEvents(data ?? [])
  }

  useEffect(() => { load() }, [])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-ZA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  return (
    <BrandBackground>
      <PageHeader title="Flash Events" />
      <FlatList
        data={events}
        keyExtractor={e => e.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} tintColor={Colors.gold} />}
        contentContainerStyle={{ padding: 16, gap: 14 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(customer)/flash-queue/${item.id}`)}
            style={{
              backgroundColor: Colors.bgCard,
              borderRadius: 18,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: Colors.borderSubtle,
            }}
          >
            {item.cover_image_url && (
              <Image source={{ uri: item.cover_image_url }} style={{ width: '100%', height: 160, resizeMode: 'cover' }} />
            )}
            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: Colors.text, fontWeight: '800', fontSize: 17 }}>{item.title}</Text>
                <View style={{
                  paddingHorizontal: 10, paddingVertical: 4,
                  backgroundColor: `${STATUS_COLOR[item.status]}22`, borderRadius: 999,
                }}>
                  <Text style={{ color: STATUS_COLOR[item.status], fontSize: 11, fontWeight: '700' }}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{formatDate(item.event_date)}</Text>
              </View>
              {item.max_spots && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
                  <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{item.max_spots} spots available</Text>
                </View>
              )}
              {item.description && (
                <Text numberOfLines={2} style={{ color: Colors.textMuted, fontSize: 13, marginTop: 8 }}>
                  {item.description}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10 }}>
                <Text style={{ color: Colors.gold, fontSize: 13, fontWeight: '700' }}>View Details</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.gold} />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 60, gap: 12 }}>
            <Ionicons name="flash-outline" size={48} color={Colors.textDim} />
            <Text style={{ color: Colors.textMuted, fontSize: 16 }}>No upcoming flash events</Text>
            <Text style={{ color: Colors.textDim, fontSize: 13 }}>Check back soon!</Text>
          </View>
        )}
      />
    </BrandBackground>
  )
}
