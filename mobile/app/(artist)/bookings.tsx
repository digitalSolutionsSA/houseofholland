import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { CategoryChips } from '../../components/shared/CategoryChips'
import { Colors } from '../../constants/colors'

type Booking = {
  id: string
  service: string
  date: string
  time_slot: string
  status: string
  reference_image_url: string | null
  customer: { id: string; full_name: string; phone: string | null } | null
}

const FILTERS = ['upcoming', 'pending', 'completed', 'cancelled']
const STATUS_COLOR: Record<string, string> = {
  confirmed: '#4ade80', pending: '#fbbf24', completed: '#60a5fa',
  cancelled: '#f87171', rescheduled: '#c084fc',
}

export default function ArtistBookingsScreen() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState('upcoming')
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    if (!profile) return
    let query = supabase
      .from('bookings')
      .select('id, service, date, time_slot, status, reference_image_url, customer:profiles(id, full_name, phone)')
      .eq('artist_id', profile.artist_id ?? profile.id)
      .order('date', { ascending: true })

    if (filter === 'upcoming') query = query.in('status', ['confirmed', 'rescheduled']).gte('date', new Date().toISOString().split('T')[0])
    else if (filter === 'pending') query = query.eq('status', 'pending')
    else if (filter === 'completed') query = query.eq('status', 'completed')
    else if (filter === 'cancelled') query = query.eq('status', 'cancelled')

    const { data } = await query
    setBookings((data ?? []).map((b: any) => ({
      ...b,
      customer: Array.isArray(b.customer) ? b.customer[0] : b.customer,
    })))
  }

  useEffect(() => { load() }, [filter, profile])

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }

  async function updateStatus(bookingId: string, status: string, customerId?: string) {
    await supabase.from('bookings').update({ status }).eq('id', bookingId)
    if (status === 'confirmed' && customerId) {
      await supabase.from('notifications').insert({
        profile_id: customerId,
        title: 'Booking Confirmed',
        message: 'Your booking has been confirmed by the artist.',
        type: 'booking',
      })
    }
    if (status === 'cancelled' && customerId) {
      await supabase.from('notifications').insert({
        profile_id: customerId,
        title: 'Booking Cancelled',
        message: 'Your booking has been cancelled by the artist.',
        type: 'booking',
      })
    }
    load()
  }

  async function flagCustomer(booking: Booking) {
    if (!booking.customer) return
    Alert.prompt(
      'Flag Customer',
      'Reason for flagging (visible to admin only):',
      async (reason) => {
        if (!reason?.trim()) return
        await supabase.from('flagged_customers').upsert({
          profile_id: booking.customer!.id,
          flagged_by: profile?.id,
          reason,
        }, { onConflict: 'profile_id' })
        Alert.alert('Flagged', 'Customer has been flagged for admin review.')
      },
      'plain-text'
    )
  }

  function confirmAction(bookingId: string, status: string, label: string, customerId?: string) {
    Alert.alert(`${label}?`, `Are you sure you want to ${label.toLowerCase()} this booking?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, style: status === 'cancelled' ? 'destructive' : 'default', onPress: () => updateStatus(bookingId, status, customerId) },
    ])
  }

  return (
    <BrandBackground>
      <PageHeader title="Appointments" />
      <CategoryChips items={FILTERS} selected={filter} onSelect={setFilter} style={{ marginBottom: 8 }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
      >
        {bookings.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="calendar-outline" size={48} color={Colors.textDim} />
            <Text style={{ color: Colors.textMuted, marginTop: 12 }}>No {filter} appointments</Text>
          </View>
        )}
        {bookings.map(b => (
          <View key={b.id} style={{
            backgroundColor: Colors.bgCard, borderRadius: 14, overflow: 'hidden',
            borderWidth: 1, borderColor: Colors.borderSubtle,
          }}>
            <View style={{ width: 4, position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: STATUS_COLOR[b.status] ?? Colors.borderSubtle }} />
            <View style={{ paddingLeft: 14, paddingRight: 12, paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15, flex: 1 }}>
                  {b.customer?.full_name ?? 'Unknown'}
                </Text>
                <View style={{ backgroundColor: STATUS_COLOR[b.status] + '30', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: STATUS_COLOR[b.status], fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>{b.status}</Text>
                </View>
              </View>
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{b.service}</Text>
              <Text style={{ color: Colors.textDim, fontSize: 12, marginTop: 2 }}>
                {new Date(b.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })} · {b.time_slot}
              </Text>
              {b.customer?.phone && <Text style={{ color: Colors.textDim, fontSize: 12 }}>{b.customer.phone}</Text>}

              {b.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => confirmAction(b.id, 'confirmed', 'Confirm', b.customer?.id)}
                    style={{ flex: 1, backgroundColor: '#4ade80', borderRadius: 8, padding: 9, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#0a0a0a', fontWeight: '700', fontSize: 13 }}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmAction(b.id, 'cancelled', 'Cancel', b.customer?.id)}
                    style={{ flex: 1, backgroundColor: '#f87171', borderRadius: 8, padding: 9, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#0a0a0a', fontWeight: '700', fontSize: 13 }}>Decline</Text>
                  </TouchableOpacity>
                </View>
              )}
              {(b.status === 'confirmed' || b.status === 'rescheduled') && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => confirmAction(b.id, 'completed', 'Complete', b.customer?.id)}
                    style={{ flex: 1, backgroundColor: '#60a5fa', borderRadius: 8, padding: 9, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#0a0a0a', fontWeight: '700', fontSize: 13 }}>Mark Done</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => flagCustomer(b)}
                    style={{ backgroundColor: Colors.bgChip, borderRadius: 8, padding: 9, alignItems: 'center', paddingHorizontal: 14 }}
                  >
                    <Ionicons name="flag-outline" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </BrandBackground>
  )
}
