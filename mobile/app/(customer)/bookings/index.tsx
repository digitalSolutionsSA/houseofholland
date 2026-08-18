import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, Image,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { isStudioToday } from '../../../lib/studioTime'
import { BrandBackground } from '../../../components/shared/BrandBackground'
import { PageHeader } from '../../../components/shared/PageHeader'
import { GradientButton } from '../../../components/shared/GradientButton'
import { Colors } from '../../../constants/colors'

type Booking = {
  id: string
  date: string
  start_time: string
  status: string
  service_type: string | null
  notes: string | null
  deposit_paid: boolean
  artist_id: string
  artist: { full_name: string; avatar_url: string | null; profile_id: string } | null
}

const STATUS_COLOR: Record<string, string> = {
  pending: Colors.gold,
  confirmed: '#4ade80',
  accepted: '#60a5fa',
  cancelled: '#ef4444',
  completed: Colors.textMuted,
  no_show: '#f97316',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function BookingsScreen() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)

  async function load() {
    if (!profile) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('bookings')
      .select('id, date, start_time, status, service_type, notes, deposit_paid, artist_id, artist:artists(full_name, avatar_url, profile_id)')
      .eq('profile_id', profile.id)
      .in('status', ['pending', 'accepted', 'confirmed'])
      .gte('date', today)
      .order('date', { ascending: true })
    setBookings((data ?? []).map((b: any) => ({
      ...b,
      artist: Array.isArray(b.artist) ? b.artist[0] : b.artist,
    })))
  }

  useEffect(() => { load() }, [profile])

  async function cancelBooking(booking: Booking) {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel? This cannot be undone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Appointment', style: 'destructive',
          onPress: async () => {
            setCancelling(booking.id)
            await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id)
            await supabase.from('notifications').insert({
              profile_id: booking.artist.profile_id,
              title: 'Booking Cancelled',
              body: `${profile!.full_name} cancelled their appointment on ${formatDate(booking.date)}`,
              type: 'booking',
            })
            setCancelling(null)
            load()
          },
        },
      ]
    )
  }

  return (
    <BrandBackground>
      <PageHeader
        title="My Bookings"
        right={
          <TouchableOpacity
            onPress={() => router.push('/(customer)/bookings/select-time')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="add" size={22} color={Colors.gold} />
            <Text style={{ color: Colors.gold, fontWeight: '700', fontSize: 14 }}>Book</Text>
          </TouchableOpacity>
        }
      />
      <FlatList
        data={bookings}
        keyExtractor={b => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} tintColor={Colors.gold} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: Colors.bgCard,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: Colors.borderSubtle,
            overflow: 'hidden',
          }}>
            {/* Status bar */}
            <View style={{ height: 3, backgroundColor: STATUS_COLOR[item.status] ?? Colors.textDim }} />
            <View style={{ padding: 14 }}>
              {/* Artist row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: Colors.bgChip, overflow: 'hidden',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.artist?.avatar_url
                    ? <Image source={{ uri: item.artist.avatar_url }} style={{ width: 40, height: 40 }} />
                    : <Text style={{ color: Colors.gold, fontWeight: '700' }}>{item.artist?.full_name?.[0] ?? '?'}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15 }}>
                    {item.artist?.full_name ?? 'Artist'}
                  </Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                    {item.service_type ?? 'Tattoo Session'}
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 10, paddingVertical: 4,
                  backgroundColor: `${STATUS_COLOR[item.status]}22`,
                  borderRadius: 999,
                }}>
                  <Text style={{ color: STATUS_COLOR[item.status], fontSize: 11, fontWeight: '700' }}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Date/time */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{formatDate(item.date)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{item.start_time}</Text>
              </View>

              {/* Check-in button if today */}
              {isStudioToday(item.date) && item.status === 'confirmed' && (
                <TouchableOpacity
                  onPress={() => router.push(`/(customer)/bookings/checkin/${item.id}`)}
                  style={{
                    backgroundColor: Colors.gold, borderRadius: 10,
                    padding: 10, alignItems: 'center', marginBottom: 8,
                  }}
                >
                  <Text style={{ color: Colors.textOnGold, fontWeight: '700', fontSize: 14 }}>
                    Check In Now
                  </Text>
                </TouchableOpacity>
              )}

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => router.push(`/(customer)/bookings/select-time?reschedule=${item.id}&artist=${item.artist_id}`)}
                  style={{
                    flex: 1, borderWidth: 1, borderColor: Colors.borderSubtle,
                    borderRadius: 10, padding: 10, alignItems: 'center',
                  }}
                >
                  <Text style={{ color: Colors.text, fontSize: 13, fontWeight: '600' }}>Reschedule</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => cancelBooking(item)}
                  disabled={cancelling === item.id}
                  style={{
                    flex: 1, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
                    borderRadius: 10, padding: 10, alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>
                    {cancelling === item.id ? 'Cancelling…' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 60, gap: 16 }}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textDim} />
            <Text style={{ color: Colors.textMuted, fontSize: 16 }}>No upcoming appointments</Text>
            <GradientButton label="Book Now" onPress={() => router.push('/(customer)/bookings/select-time')} />
          </View>
        )}
      />
    </BrandBackground>
  )
}
