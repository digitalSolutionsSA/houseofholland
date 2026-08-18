import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { Colors, GoldGradientBtn } from '../../constants/colors'

type Stat = { label: string; value: string; icon: string; route: string }

export default function AdminDashboard() {
  const [stats, setStats] = useState({ bookings: 0, pending: 0, revenue: 0, customers: 0, artists: 0, openRent: 0 })
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const [bRes, pRes, cRes, aRes, rRes] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true }).gte('date', new Date().toISOString().split('T')[0]),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'public'),
      supabase.from('artists').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('booth_rent_payments').select('id', { count: 'exact', head: true }).neq('status', 'paid'),
    ])
    const [tcRes] = await Promise.all([
      supabase.from('tattoo_completions').select('price').gte('completed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ])
    const revenue = (tcRes.data ?? []).reduce((s: number, t: any) => s + (t.price ?? 0), 0)
    setStats({
      bookings: bRes.count ?? 0,
      pending: pRes.count ?? 0,
      revenue,
      customers: cRes.count ?? 0,
      artists: aRes.count ?? 0,
      openRent: rRes.count ?? 0,
    })
  }

  useEffect(() => { load() }, [])
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }

  const STATS: Stat[] = [
    { label: 'Upcoming Bookings', value: stats.bookings.toString(), icon: 'calendar', route: '/(admin)/bookings' },
    { label: 'Pending Approval', value: stats.pending.toString(), icon: 'time', route: '/(admin)/bookings' },
    { label: 'Monthly Revenue', value: `R${stats.revenue.toLocaleString()}`, icon: 'cash', route: '/(admin)/completions' },
    { label: 'Customers', value: stats.customers.toString(), icon: 'people', route: '/(admin)/artists' },
    { label: 'Active Artists', value: stats.artists.toString(), icon: 'color-palette', route: '/(admin)/artists' },
    { label: 'Rent Outstanding', value: stats.openRent.toString(), icon: 'home', route: '/(admin)/rent' },
  ]

  const QUICK: Array<{ label: string; icon: string; route: string }> = [
    { label: 'Bookings', icon: 'calendar-outline', route: '/(admin)/bookings' },
    { label: 'Completions', icon: 'checkmark-done-outline', route: '/(admin)/completions' },
    { label: 'Artists', icon: 'color-palette-outline', route: '/(admin)/artists' },
    { label: 'Merch', icon: 'shirt-outline', route: '/(admin)/merch' },
    { label: 'Flash Events', icon: 'flash-outline', route: '/(admin)/flash' },
    { label: 'Notifications', icon: 'megaphone-outline', route: '/(admin)/notifications' },
    { label: 'Booth Rent', icon: 'home-outline', route: '/(admin)/rent' },
    { label: 'Waivers', icon: 'document-text-outline', route: '/(admin)/waivers' },
    { label: 'Referrals', icon: 'link-outline', route: '/(admin)/referrals' },
    { label: 'Points', icon: 'trophy-outline', route: '/(admin)/points' },
    { label: 'Guest Artists', icon: 'person-add-outline', route: '/(admin)/guest-artists' },
  ]

  return (
    <BrandBackground>
      <PageHeader title="Admin Dashboard" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
      >
        {/* Revenue card */}
        <LinearGradient colors={[...GoldGradientBtn]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 18, padding: 18, marginBottom: 16 }}>
          <Text style={{ color: 'rgba(26,26,26,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>THIS MONTH'S REVENUE</Text>
          <Text style={{ color: Colors.textOnGold, fontSize: 36, fontWeight: '800', marginVertical: 4 }}>
            R{stats.revenue.toLocaleString()}
          </Text>
          <Text style={{ color: 'rgba(26,26,26,0.65)', fontSize: 13 }}>{stats.bookings} upcoming bookings · {stats.pending} pending</Text>
        </LinearGradient>

        {/* Stats grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {STATS.slice(2).map(s => (
            <TouchableOpacity
              key={s.label}
              onPress={() => router.push(s.route as any)}
              style={{
                width: '47.5%', backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
                borderWidth: 1, borderColor: Colors.borderSubtle,
              }}
            >
              <Ionicons name={s.icon as any} size={22} color={Colors.gold} style={{ marginBottom: 8 }} />
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 18 }}>{s.value}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick access */}
        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Quick Access</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {QUICK.map(q => (
            <TouchableOpacity
              key={q.label}
              onPress={() => router.push(q.route as any)}
              style={{
                width: '30%', backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12,
                alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.borderSubtle,
              }}
            >
              <Ionicons name={q.icon as any} size={22} color={Colors.gold} />
              <Text style={{ color: Colors.textMuted, fontSize: 11, textAlign: 'center' }}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </BrandBackground>
  )
}
