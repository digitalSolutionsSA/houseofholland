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
  artist: { full_name: string; avatar_url: string | null } | null
  service_type: string | null
}

type FlashEvent = {
  id: string
  title: string
  event_date: string
  status: string
}

export default function CustomerHomeScreen() {
  const { profile, signOut } = useAuth()
  const [nextBooking, setNextBooking] = useState<Booking | null>(null)
  const [flashEvent, setFlashEvent] = useState<FlashEvent | null>(null)
  const [notifications, setNotifications] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    if (!profile) return

    const [bookingRes, flashRes, notifRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, date, start_time, status, service_type, artist:artists(full_name, avatar_url)')
        .eq('profile_id', profile.id)
        .in('status', ['pending', 'confirmed'])
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('flash_events')
        .select('id, title, event_date, status')
        .eq('status', 'upcoming')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profile.id)
        .eq('read', false),
    ])

    setNextBooking((bookingRes.data as Booking | null))
    setFlashEvent(flashRes.data)
    setNotifications(notifRes.count ?? 0)
  }

  useEffect(() => { load() }, [profile])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const quickActions = [
    { label: 'Book', icon: 'calendar', route: '/(customer)/bookings' },
    { label: 'Artists', icon: 'people', route: '/(customer)/artists' },
    { label: 'Merch', icon: 'shirt', route: '/(customer)/merch' },
    { label: 'Vault', icon: 'images', route: '/(customer)/vault' },
    { label: 'Passport', icon: 'id-card', route: '/(customer)/passport' },
    { label: 'Consent', icon: 'document-text', route: '/(customer)/consent' },
  ]

  return (
    <BrandBackground>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 18,
          paddingTop: 56,
        }}>
          <View>
            <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{greeting()},</Text>
            <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '700', marginTop: 2 }}>
              {profile?.full_name?.split(' ')[0] ?? 'Welcome'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(customer)/profile')}
            style={{ position: 'relative' }}
          >
            <Ionicons name="notifications-outline" size={26} color={Colors.gold} />
            {notifications > 0 && (
              <View style={{
                position: 'absolute',
                top: -4, right: -4,
                backgroundColor: '#dc2626',
                width: 16, height: 16,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                  {notifications > 9 ? '9+' : notifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Next appointment card */}
        {nextBooking && (
          <TouchableOpacity
            onPress={() => router.push('/(customer)/bookings')}
            style={{
              marginHorizontal: 18,
              marginBottom: 16,
              backgroundColor: Colors.bgCard,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: Colors.borderGold,
            }}
          >
            <Text style={{ color: Colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
              {isStudioToday(nextBooking.date) ? 'TODAY' : isStudioTomorrow(nextBooking.date) ? 'TOMORROW' : 'NEXT APPOINTMENT'}
            </Text>
            <Text style={{ color: Colors.text, fontSize: 17, fontWeight: '700' }}>
              {nextBooking.service_type ?? 'Tattoo Session'}
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>
              with {(nextBooking.artist as any)?.full_name ?? 'Artist'} · {new Date(nextBooking.date).toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <View style={{
              marginTop: 10,
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: nextBooking.status === 'confirmed' ? 'rgba(34,197,94,0.2)' : 'rgba(212,175,55,0.2)',
              borderRadius: 999,
              alignSelf: 'flex-start',
            }}>
              <Text style={{
                color: nextBooking.status === 'confirmed' ? '#4ade80' : Colors.gold,
                fontSize: 11,
                fontWeight: '700',
              }}>
                {nextBooking.status.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Flash event teaser */}
        {flashEvent && (
          <TouchableOpacity
            onPress={() => router.push(`/(customer)/flash-queue`)}
            style={{
              marginHorizontal: 18,
              marginBottom: 16,
              backgroundColor: Colors.bgCard,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: Colors.borderSubtle,
            }}
          >
            <Text style={{ color: Colors.goldBright, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
              ⚡ FLASH EVENT
            </Text>
            <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '600' }}>{flashEvent.title}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>
              {new Date(flashEvent.event_date).toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </TouchableOpacity>
        )}

        {/* Quick actions */}
        <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginHorizontal: 18, marginBottom: 12 }}>
          QUICK ACCESS
        </Text>
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: 14,
          gap: 10,
        }}>
          {quickActions.map(a => (
            <TouchableOpacity
              key={a.label}
              onPress={() => router.push(a.route as any)}
              style={{
                width: '30%',
                backgroundColor: Colors.bgCard,
                borderRadius: 14,
                padding: 16,
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: Colors.borderSubtle,
              }}
            >
              <Ionicons name={a.icon as any} size={24} color={Colors.gold} />
              <Text style={{ color: Colors.text, fontSize: 12, fontWeight: '600' }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </BrandBackground>
  )
}
