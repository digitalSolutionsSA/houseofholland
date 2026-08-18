import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { isStudioToday, isStudioTomorrow } from '../../lib/studioTime'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { Colors } from '../../constants/colors'

type Booking = {
  id: string
  date: string
  start_time: string
  status: string
  profile: { full_name: string | null } | null
  service_type: string | null
}

export default function ArtistHomeScreen() {
  const { profile, realProfile } = useAuth()
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState({ total: 0, pending: 0 })
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    if (!realProfile) return

    const { data: artistData } = await supabase
      .from('artists')
      .select('id')
      .eq('profile_id', realProfile.id)
      .maybeSingle()

    if (!artistData) return

    const today = new Date().toISOString().split('T')[0]

    const [todayRes, statsRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, date, start_time, status, service_type, profile:profiles(full_name)')
        .eq('artist_id', artistData.id)
        .eq('date', today)
        .order('start_time', { ascending: true }),
      supabase
        .from('bookings')
        .select('id, status')
        .eq('artist_id', artistData.id)
        .in('status', ['pending', 'confirmed']),
    ])

    setTodayBookings((todayRes.data as Booking[] | null) ?? [])
    const all = statsRes.data ?? []
    setStats({ total: all.length, pending: all.filter(b => b.status === 'pending').length })
  }

  useEffect(() => { load() }, [realProfile])

  const quickActions = [
    { label: 'Appointments', icon: 'calendar', route: '/(artist)/bookings' },
    { label: 'Schedule', icon: 'time', route: '/(artist)/schedule' },
    { label: 'Portfolio', icon: 'images', route: '/(artist)/portfolio' },
    { label: 'Record Tattoo', icon: 'checkmark-circle', route: '/(artist)/completions' },
    { label: 'Messages', icon: 'chatbubbles', route: '/(artist)/messages' },
    { label: 'Admin', icon: 'settings', route: '/(artist)/admin' },
  ]

  return (
    <BrandBackground>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} tintColor={Colors.gold} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Header */}
        <View style={{ padding: 18, paddingTop: 56 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Welcome back,</Text>
          <Text style={{ color: Colors.text, fontSize: 22, fontWeight: '700', marginTop: 2 }}>
            {realProfile?.full_name?.split(' ')[0] ?? 'Artist'}
          </Text>
          <View style={{
            flexDirection: 'row', gap: 12, marginTop: 16,
          }}>
            <View style={{
              flex: 1, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: Colors.borderGold, alignItems: 'center',
            }}>
              <Text style={{ color: Colors.gold, fontSize: 26, fontWeight: '800' }}>{stats.total}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>Upcoming</Text>
            </View>
            <View style={{
              flex: 1, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: Colors.borderSubtle, alignItems: 'center',
            }}>
              <Text style={{ color: '#f59e0b', fontSize: 26, fontWeight: '800' }}>{stats.pending}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Today's bookings */}
        {todayBookings.length > 0 && (
          <View style={{ paddingHorizontal: 18, marginBottom: 16 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
              TODAY
            </Text>
            {todayBookings.map(b => (
              <TouchableOpacity
                key={b.id}
                onPress={() => router.push('/(artist)/bookings')}
                style={{
                  backgroundColor: Colors.bgCard,
                  borderRadius: 12, padding: 14,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: Colors.borderSubtle,
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                }}
              >
                <View style={{
                  width: 4, height: '100%', borderRadius: 2,
                  backgroundColor: b.status === 'confirmed' ? '#4ade80' : Colors.gold,
                }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 14 }}>
                    {(b.profile as any)?.full_name ?? 'Client'}
                  </Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    {b.service_type ?? 'Session'} · {b.start_time}
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 3,
                  backgroundColor: b.status === 'confirmed' ? 'rgba(74,222,128,0.15)' : 'rgba(212,175,55,0.15)',
                  borderRadius: 999,
                }}>
                  <Text style={{
                    color: b.status === 'confirmed' ? '#4ade80' : Colors.gold,
                    fontSize: 10, fontWeight: '700',
                  }}>
                    {b.status.toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick actions */}
        <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginHorizontal: 18, marginBottom: 12 }}>
          QUICK ACCESS
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 10 }}>
          {quickActions.map(a => (
            <TouchableOpacity
              key={a.label}
              onPress={() => router.push(a.route as any)}
              style={{
                width: '30%', backgroundColor: Colors.bgCard,
                borderRadius: 14, padding: 16,
                alignItems: 'center', gap: 8,
                borderWidth: 1, borderColor: Colors.borderSubtle,
              }}
            >
              <Ionicons name={a.icon as any} size={24} color={Colors.gold} />
              <Text style={{ color: Colors.text, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </BrandBackground>
  )
}
