import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { Colors } from '../../constants/colors'

type Waiver = {
  id: string; consented_at: string; signature_url: string | null
  emergency_contact_name: string | null; emergency_contact_phone: string | null
  customer: { full_name: string; email: string } | null
}

export default function AdminWaiversScreen() {
  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [selected, setSelected] = useState<Waiver | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('consent_forms')
      .select('id, consented_at, signature_url, emergency_contact_name, emergency_contact_phone, customer:profiles(full_name, email)')
      .order('consented_at', { ascending: false })
    setWaivers((data ?? []).map((w: any) => ({
      ...w,
      customer: Array.isArray(w.customer) ? w.customer[0] : w.customer,
    })))
  }

  useEffect(() => { load() }, [])
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }

  return (
    <BrandBackground>
      <PageHeader title="Waivers" showBack />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
      >
        {waivers.length === 0 && <Text style={{ color: Colors.textMuted }}>No consent forms submitted</Text>}
        {waivers.map(w => (
          <TouchableOpacity
            key={w.id}
            onPress={() => setSelected(w)}
            style={{
              backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
              borderWidth: 1, borderColor: Colors.borderSubtle,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ade80' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 14 }}>{w.customer?.full_name ?? 'Unknown'}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{w.customer?.email}</Text>
              <Text style={{ color: Colors.textDim, fontSize: 12 }}>
                {new Date(w.consented_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!selected} animationType="slide">
        <View style={{ flex: 1, backgroundColor: Colors.bg }}>
          <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => setSelected(null)}><Ionicons name="close" size={24} color={Colors.text} /></TouchableOpacity>
            <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 18 }}>Consent Form</Text>
          </View>
          {selected && (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              <View style={{ backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Customer</Text>
                <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15 }}>{selected.customer?.full_name}</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{selected.customer?.email}</Text>
              </View>
              <View style={{ backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Emergency Contact</Text>
                <Text style={{ color: Colors.text, fontWeight: '600' }}>{selected.emergency_contact_name ?? '—'}</Text>
                <Text style={{ color: Colors.textMuted }}>{selected.emergency_contact_phone ?? '—'}</Text>
              </View>
              <View style={{ backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 8 }}>Signed</Text>
                <Text style={{ color: Colors.text }}>
                  {new Date(selected.consented_at).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
              {selected.signature_url && (
                <View style={{ backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14 }}>
                  <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 8 }}>Signature</Text>
                  <Image source={{ uri: selected.signature_url }} style={{ height: 100, borderRadius: 8 }} resizeMode="contain" />
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </BrandBackground>
  )
}
