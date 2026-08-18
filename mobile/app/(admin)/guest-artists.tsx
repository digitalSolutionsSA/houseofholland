import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, Switch } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { InputField } from '../../components/shared/InputField'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

type GuestArtist = {
  id: string; name: string; instagram: string | null; style: string | null
  visit_date: string | null; is_active: boolean
}

export default function AdminGuestArtistsScreen() {
  const [guests, setGuests] = useState<GuestArtist[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [instagram, setInstagram] = useState('')
  const [style, setStyle] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase.from('guest_artists').select('*').order('visit_date', { ascending: false })
    setGuests(data ?? [])
  }

  useEffect(() => { load() }, [])
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }

  async function save() {
    if (!name.trim()) { Alert.alert('Name required'); return }
    setSaving(true)
    await supabase.from('guest_artists').insert({ name, instagram_handle: instagram || null, style: style || null, visit_date: visitDate || null, is_active: true })
    setSaving(false)
    setAdding(false); setName(''); setInstagram(''); setStyle(''); setVisitDate('')
    load()
  }

  async function toggleActive(g: GuestArtist) {
    await supabase.from('guest_artists').update({ is_active: !g.is_active }).eq('id', g.id)
    load()
  }

  async function deleteGuest(g: GuestArtist) {
    Alert.alert('Delete', `Remove ${g.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('guest_artists').delete().eq('id', g.id); load() } },
    ])
  }

  return (
    <BrandBackground>
      <PageHeader title="Guest Artists" showBack />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
      >
        {adding ? (
          <View style={{ backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.borderGold }}>
            <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Add Guest Artist</Text>
            <InputField label="Name" value={name} onChangeText={setName} placeholder="Artist name" autoCapitalize="words" />
            <InputField label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="@handle" autoCapitalize="none" />
            <InputField label="Style" value={style} onChangeText={setStyle} placeholder="e.g. Realism" />
            <InputField label="Visit Date" value={visitDate} onChangeText={setVisitDate} placeholder="YYYY-MM-DD" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setAdding(false)} style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderSubtle, alignItems: 'center' }}>
                <Text style={{ color: Colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <GradientButton label={saving ? 'Saving…' : 'Save'} onPress={save} loading={saving} />
              </View>
            </View>
          </View>
        ) : (
          <GradientButton label="Add Guest Artist" onPress={() => setAdding(true)} style={{ marginBottom: 16 }} />
        )}

        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Guest Artists</Text>
        {guests.length === 0 && <Text style={{ color: Colors.textMuted }}>No guest artists added yet</Text>}
        {guests.map(g => (
          <View key={g.id} style={{
            backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, marginBottom: 10,
            borderWidth: 1, borderColor: Colors.borderSubtle,
            flexDirection: 'row', alignItems: 'center', gap: 12,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 14 }}>{g.name}</Text>
              {g.instagram && <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{g.instagram}</Text>}
              {g.style && <Text style={{ color: Colors.textDim, fontSize: 12 }}>{g.style}</Text>}
              {g.visit_date && <Text style={{ color: Colors.gold, fontSize: 12 }}>{new Date(g.visit_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>}
            </View>
            <Switch value={g.is_active} onValueChange={() => toggleActive(g)} thumbColor={Colors.gold} trackColor={{ true: Colors.borderGold, false: Colors.bgChip }} />
            <TouchableOpacity onPress={() => deleteGuest(g)}>
              <Ionicons name="trash-outline" size={16} color={Colors.textDim} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </BrandBackground>
  )
}
