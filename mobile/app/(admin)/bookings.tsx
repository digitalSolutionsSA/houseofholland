import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { CategoryChips } from '../../components/shared/CategoryChips'
import { Colors } from '../../constants/colors'

type Booking = {
  id: string; service: string; date: string; time_slot: string; status: string
  customer: { full_name: string } | null
  artist: { full_name: string } | null
}

const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled']
const STATUS_COLOR: Record<string, string> = { confirmed: '#4ade80', pending: '#fbbf24', completed: '#60a5fa', cancelled: '#f87171', rescheduled: '#c084fc' }

export default function AdminBookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    let q = supabase.from('bookings').select(`id, service, date, time_slot, status,
      customer:profiles!bookings_profile_id_fkey(full_name),
      artist:artists(full_name)`)
      .order('date', { ascending: false }).limit(50)
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setBookings((data ?? []).map((b: any) => ({
      ...b,
      customer: Array.isArray(b.customer) ? b.customer[0] : b.customer,
      artist: Array.isArray(b.artist) ? b.artist[0] : b.artist,
    })))
  }

  useEffect(() => { load() }, [filter])
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }

  async function updateStatus(id: string, status: string) {
    await supabase.from('bookings').update({ status }).eq('id', id)
    load()
  }

  return (
    <BrandBackground>
      <PageHeader title="Bookings" showBack />
      <CategoryChips items={FILTERS} selected={filter} onSelect={setFilter} style={{ marginBottom: 8 }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
      >
        {bookings.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ color: Colors.textMuted }}>No bookings found</Text>
          </View>
        )}
        {bookings.map(b => (
          <View key={b.id} style={{ backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.borderSubtle }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: Colors.text, fontWeight: '700', flex: 1 }}>{b.customer?.full_name ?? 'Unknown'}</Text>
              <View style={{ backgroundColor: STATUS_COLOR[b.status] + '30', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: STATUS_COLOR[b.status], fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>{b.status}</Text>
              </View>
            </View>
            <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{b.service} · {b.artist?.full_name ?? 'No artist'}</Text>
            <Text style={{ color: Colors.textDim, fontSize: 12, marginTop: 2 }}>
              {new Date(b.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })} · {b.time_slot}
            </Text>
            {b.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity onPress={() => updateStatus(b.id, 'confirmed')} style={{ flex: 1, backgroundColor: '#4ade80', borderRadius: 8, padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#0a0a0a', fontWeight: '700', fontSize: 13 }}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => updateStatus(b.id, 'cancelled')} style={{ flex: 1, backgroundColor: '#f87171', borderRadius: 8, padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#0a0a0a', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </BrandBackground>
  )
}
