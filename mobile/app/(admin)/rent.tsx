import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { CategoryChips } from '../../components/shared/CategoryChips'
import { Colors } from '../../constants/colors'

type Payment = {
  id: string; amount: number; month: string; status: string; paid_at: string
  artist: { full_name: string } | null
}

const FILTERS = ['pending', 'paid', 'overdue']
const STATUS_COLOR: Record<string, string> = { paid: '#4ade80', pending: '#fbbf24', overdue: '#f87171' }

export default function AdminRentScreen() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [filter, setFilter] = useState('pending')
  const [refreshing, setRefreshing] = useState(false)
  const [total, setTotal] = useState(0)

  async function load() {
    let q = supabase
      .from('booth_rent_payments')
      .select('id, amount, month, status, paid_at, artist:artists(full_name)')
      .order('month', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    const mapped = (data ?? []).map((p: any) => ({
      ...p,
      artist: Array.isArray(p.artist) ? p.artist[0] : p.artist,
    }))
    setPayments(mapped)
    setTotal(mapped.reduce((s: number, p: Payment) => s + p.amount, 0))
  }

  useEffect(() => { load() }, [filter])
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }

  async function confirm(payment: Payment) {
    Alert.alert('Confirm Payment', `Mark R${payment.amount.toFixed(2)} from ${payment.artist?.full_name} as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        await supabase.from('booth_rent_payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', payment.id)
        load()
      }},
    ])
  }

  return (
    <BrandBackground>
      <PageHeader title="Booth Rent" showBack />
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
          Showing {payments.length} payment{payments.length !== 1 ? 's' : ''} · Total: <Text style={{ color: Colors.gold, fontWeight: '700' }}>R{total.toFixed(2)}</Text>
        </Text>
      </View>
      <CategoryChips items={FILTERS} selected={filter} onSelect={setFilter} style={{ marginBottom: 8 }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
      >
        {payments.length === 0 && <Text style={{ color: Colors.textMuted }}>No {filter} payments</Text>}
        {payments.map(p => (
          <View key={p.id} style={{
            backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
            borderWidth: 1, borderColor: Colors.borderSubtle,
            flexDirection: 'row', alignItems: 'center', gap: 12,
          }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: STATUS_COLOR[p.status] ?? Colors.textDim, flexShrink: 0 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '700' }}>{p.artist?.full_name ?? 'Unknown'}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                {new Date(p.month + '-01').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })} · {p.status}
              </Text>
            </View>
            <Text style={{ color: Colors.gold, fontWeight: '700', fontSize: 15 }}>R{p.amount.toFixed(2)}</Text>
            {p.status === 'pending' && (
              <TouchableOpacity onPress={() => confirm(p)} style={{ backgroundColor: '#4ade80', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: '#0a0a0a', fontWeight: '700', fontSize: 12 }}>Confirm</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </BrandBackground>
  )
}
