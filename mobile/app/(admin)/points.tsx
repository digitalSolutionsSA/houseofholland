import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { awardPoints, CURRENT_SEASON } from '../../lib/awardPoints'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { InputField } from '../../components/shared/InputField'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

type Profile = { id: string; full_name: string; email: string }

export default function AdminPointsScreen() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Profile | null>(null)
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('manual')
  const [sending, setSending] = useState(false)

  async function searchProfiles() {
    if (search.length < 2) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
      .eq('role', 'public')
      .limit(10)
    setResults(data ?? [])
  }

  async function award() {
    if (!selected) { Alert.alert('Select a customer first'); return }
    const pts = parseInt(points)
    if (isNaN(pts) || pts <= 0) { Alert.alert('Enter a valid points amount'); return }

    Alert.alert('Award Points', `Award ${pts} points to ${selected.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Award', onPress: async () => {
        setSending(true)
        await awardPoints(selected.id, pts, 'manual')
        setSending(false)
        setPoints(''); setSelected(null); setSearch(''); setResults([])
        Alert.alert('Done', `${pts} points awarded to ${selected.full_name}.`)
      }},
    ])
  }

  return (
    <BrandBackground>
      <PageHeader title="Award Points" showBack />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <InputField
          label="Search Customer"
          value={search}
          onChangeText={v => { setSearch(v); if (v.length > 1) searchProfiles() }}
          placeholder="Name or email…"
          autoCapitalize="none"
        />

        {results.length > 0 && !selected && (
          <View style={{ backgroundColor: Colors.bgCard, borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: Colors.borderSubtle }}>
            {results.map((p, i) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => { setSelected(p); setResults([]) }}
                style={{
                  padding: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: Colors.borderSubtle,
                }}
              >
                <Text style={{ color: Colors.text, fontWeight: '600' }}>{p.full_name}</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{p.email}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selected && (
          <View style={{
            backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, marginBottom: 16,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            borderWidth: 1, borderColor: Colors.borderGold,
          }}>
            <Ionicons name="person-circle" size={28} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '700' }}>{selected.full_name}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{selected.email}</Text>
            </View>
            <TouchableOpacity onPress={() => { setSelected(null); setSearch('') }}>
              <Ionicons name="close-circle" size={20} color={Colors.textDim} />
            </TouchableOpacity>
          </View>
        )}

        <InputField
          label={`Points (Season ${CURRENT_SEASON})`}
          value={points}
          onChangeText={setPoints}
          keyboardType="number-pad"
          placeholder="e.g. 50"
        />

        <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Reason</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {['manual', 'spend', 'review', 'referral', 'upgrade'].map(r => (
            <TouchableOpacity key={r} onPress={() => setReason(r)} style={{
              paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
              backgroundColor: reason === r ? Colors.gold : Colors.bgChip,
              borderWidth: 1, borderColor: reason === r ? Colors.gold : Colors.borderSubtle,
            }}>
              <Text style={{ color: reason === r ? Colors.textOnGold : Colors.textMuted, fontSize: 13, textTransform: 'capitalize' }}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <GradientButton label={sending ? 'Awarding…' : 'Award Points'} onPress={award} loading={sending} />
      </ScrollView>
    </BrandBackground>
  )
}
