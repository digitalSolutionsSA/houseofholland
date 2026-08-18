import { useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { Colors } from '../../constants/colors'

const ALLOWED_EMAILS = ['info@digitalsolutionssa.co.za', 'armand@hohtattoos.com']

type Referral = {
  id: string; created_at: string; commission_amount: number | null; status: string
  referred: { full_name: string; email: string } | null
  referrer: { full_name: string; email: string } | null
}

export default function AdminReferralsScreen() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [total, setTotal] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('referrals')
      .select(`id, created_at, commission_amount, status,
        referred:profiles!referrals_referred_id_fkey(full_name, email),
        referrer:profiles!referrals_referrer_id_fkey(full_name, email)`)
      .order('created_at', { ascending: false })
    const mapped = (data ?? []).map((r: any) => ({
      ...r,
      referred: Array.isArray(r.referred) ? r.referred[0] : r.referred,
      referrer: Array.isArray(r.referrer) ? r.referrer[0] : r.referrer,
    }))
    setReferrals(mapped)
    setTotal(mapped.filter((r: Referral) => r.status === 'paid').reduce((s: number, r: Referral) => s + (r.commission_amount ?? 0), 0))
  }

  useEffect(() => { load() }, [])
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }

  const STATUS_COLOR: Record<string, string> = { pending: '#fbbf24', paid: '#4ade80', rejected: '#f87171' }

  return (
    <BrandBackground>
      <PageHeader title="Referrals" showBack />
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
          {referrals.length} referrals · Paid out: <Text style={{ color: Colors.gold, fontWeight: '700' }}>R{total.toFixed(2)}</Text>
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
      >
        {referrals.length === 0 && <Text style={{ color: Colors.textMuted }}>No referrals yet</Text>}
        {referrals.map(r => (
          <View key={r.id} style={{
            backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
            borderWidth: 1, borderColor: Colors.borderSubtle,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: Colors.text, fontWeight: '700', flex: 1 }}>
                {r.referred?.full_name ?? 'Unknown'}
              </Text>
              <View style={{ backgroundColor: (STATUS_COLOR[r.status] ?? Colors.textDim) + '30', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: STATUS_COLOR[r.status] ?? Colors.textDim, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>{r.status}</Text>
              </View>
            </View>
            <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
              Referred by: {r.referrer?.full_name ?? 'Unknown'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ color: Colors.textDim, fontSize: 12 }}>
                {new Date(r.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              {r.commission_amount != null && (
                <Text style={{ color: Colors.gold, fontWeight: '700', fontSize: 13 }}>R{r.commission_amount.toFixed(2)}</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </BrandBackground>
  )
}
