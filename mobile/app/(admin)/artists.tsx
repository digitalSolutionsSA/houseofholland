import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch, Image, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { Colors } from '../../constants/colors'

type Artist = {
  id: string; full_name: string; specialties: string[] | null
  is_active: boolean; profile_photo_url: string | null; years_of_experience: number | null
}

export default function AdminArtistsScreen() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase.from('artists').select('id, full_name, specialties, is_active, profile_photo_url, years_of_experience').order('full_name')
    setArtists(data ?? [])
  }

  useEffect(() => { load() }, [])
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }

  async function toggleActive(artist: Artist) {
    await supabase.from('artists').update({ is_active: !artist.is_active }).eq('id', artist.id)
    load()
  }

  async function deleteArtist(artist: Artist) {
    Alert.alert('Delete Artist', `Remove ${artist.full_name} from the system? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('artists').delete().eq('id', artist.id); load() } },
    ])
  }

  return (
    <BrandBackground>
      <PageHeader title="Artists" showBack />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
      >
        {artists.map(a => (
          <View key={a.id} style={{
            backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
            borderWidth: 1, borderColor: a.is_active ? Colors.borderSubtle : '#f8712230',
            flexDirection: 'row', alignItems: 'center', gap: 12,
          }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: Colors.bgChip, alignItems: 'center', justifyContent: 'center' }}>
              {a.profile_photo_url
                ? <Image source={{ uri: a.profile_photo_url }} style={{ width: 48, height: 48 }} />
                : <Ionicons name="person" size={22} color={Colors.textDim} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 14 }}>{a.full_name}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                {a.years_of_experience ? `${a.years_of_experience} yrs · ` : ''}
                {a.specialties?.slice(0, 2).join(', ') ?? 'No specialties'}
              </Text>
            </View>
            <View style={{ gap: 8, alignItems: 'flex-end' }}>
              <Switch
                value={a.is_active}
                onValueChange={() => toggleActive(a)}
                thumbColor={Colors.gold}
                trackColor={{ true: Colors.borderGold, false: Colors.bgChip }}
              />
              <TouchableOpacity onPress={() => deleteArtist(a)}>
                <Ionicons name="trash-outline" size={16} color={Colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </BrandBackground>
  )
}
