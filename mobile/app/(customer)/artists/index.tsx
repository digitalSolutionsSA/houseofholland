import { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, Image, RefreshControl,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import { BrandBackground } from '../../../components/shared/BrandBackground'
import { PageHeader } from '../../../components/shared/PageHeader'
import { CategoryChips } from '../../../components/shared/CategoryChips'
import { TATTOO_STYLES } from '../../../lib/tattooStyles'
import { Colors } from '../../../constants/colors'

type Artist = {
  id: string
  full_name: string
  bio: string | null
  avatar_url: string | null
  specialties: string[]
  rating: number | null
  review_count: number
  instagram: string | null
}

const ALL = 'All'
const STYLES = [ALL, ...TATTOO_STYLES]

export default function ArtistsScreen() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [filtered, setFiltered] = useState<Artist[]>([])
  const [search, setSearch] = useState('')
  const [style, setStyle] = useState(ALL)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('artists')
      .select('id, full_name, bio, avatar_url, specialties, rating, review_count, instagram')
      .eq('is_active', true)
      .order('full_name')
    setArtists(data ?? [])
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let result = artists
    if (style !== ALL) {
      result = result.filter(a =>
        a.specialties?.some(s => s.toLowerCase().includes(style.toLowerCase()))
      )
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(a =>
        a.full_name.toLowerCase().includes(q) ||
        a.bio?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [artists, search, style])

  return (
    <BrandBackground>
      <PageHeader title="Artists" showBack />

      {/* Search */}
      <View style={{ paddingHorizontal: 18, paddingVertical: 10 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: Colors.bgElevated, borderRadius: 12,
          paddingHorizontal: 12, gap: 8,
          borderWidth: 1, borderColor: Colors.borderSubtle,
        }}>
          <Ionicons name="search" size={18} color={Colors.textDim} />
          <TextInput
            placeholder="Search artists..."
            placeholderTextColor={Colors.textDim}
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, color: Colors.text, paddingVertical: 12, fontSize: 14 }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Style filter */}
      <View style={{ marginBottom: 12 }}>
        <CategoryChips options={STYLES} selected={style} onSelect={setStyle} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={a => a.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} tintColor={Colors.gold} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(customer)/artists/${item.id}`)}
            style={{
              backgroundColor: Colors.bgCard,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: Colors.borderSubtle,
              flexDirection: 'row',
              gap: 14,
              padding: 14,
              alignItems: 'center',
            }}
          >
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: Colors.bgChip, overflow: 'hidden',
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: Colors.borderGold,
            }}>
              {item.avatar_url
                ? <Image source={{ uri: item.avatar_url }} style={{ width: 64, height: 64 }} />
                : <Text style={{ color: Colors.gold, fontSize: 24, fontWeight: '700' }}>{item.full_name[0]}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16 }}>{item.full_name}</Text>
              {item.rating != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="star" size={12} color={Colors.gold} />
                  <Text style={{ color: Colors.gold, fontSize: 12, fontWeight: '700' }}>
                    {item.rating.toFixed(1)}
                  </Text>
                  <Text style={{ color: Colors.textDim, fontSize: 12 }}>({item.review_count})</Text>
                </View>
              )}
              {item.specialties?.length > 0 && (
                <Text numberOfLines={1} style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }}>
                  {item.specialties.join(' · ')}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ color: Colors.textMuted }}>No artists found</Text>
          </View>
        )}
      />
    </BrandBackground>
  )
}
