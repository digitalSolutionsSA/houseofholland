import { useEffect, useState } from 'react'
import { View, Text, FlatList, Image, TouchableOpacity, Dimensions, Alert, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { CategoryChips } from '../../components/shared/CategoryChips'
import { Colors } from '../../constants/colors'

type Photo = {
  id: string; photo_url: string; style: string | null; created_at: string
  artist: { full_name: string } | null
}

const { width } = Dimensions.get('window')
const IMG = (width - 36) / 2

export default function AdminPortfolioScreen() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [artists, setArtists] = useState<{ id: string; full_name: string }[]>([])
  const [selectedArtist, setSelectedArtist] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  async function loadArtists() {
    const { data } = await supabase.from('artists').select('id, full_name').eq('is_active', true).order('full_name')
    setArtists(data ?? [])
  }

  async function load() {
    let q = supabase
      .from('portfolio_photos')
      .select('id, photo_url, style, created_at, artist:artists(full_name)')
      .order('created_at', { ascending: false })
    if (selectedArtist !== 'all') q = q.eq('artist_id', selectedArtist)
    const { data } = await q
    setPhotos((data ?? []).map((p: any) => ({
      ...p,
      artist: Array.isArray(p.artist) ? p.artist[0] : p.artist,
    })))
  }

  useEffect(() => { loadArtists() }, [])
  useEffect(() => { load() }, [selectedArtist])
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }

  async function deletePhoto(photo: Photo) {
    Alert.alert('Delete Photo', 'Remove this portfolio photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('portfolio_photos').delete().eq('id', photo.id); load() } },
    ])
  }

  const filterItems = ['all', ...artists.map(a => a.full_name)]
  const filterIds = ['all', ...artists.map(a => a.id)]

  return (
    <BrandBackground>
      <PageHeader title="Portfolio" showBack />
      <CategoryChips
        items={filterItems}
        selected={filterIds[filterItems.indexOf(filterIds.find((_, i) => filterIds[i] === selectedArtist) ?? 'all') ?? 0]}
        onSelect={v => setSelectedArtist(filterIds[filterItems.indexOf(v)] ?? 'all')}
        style={{ marginBottom: 8 }}
      />
      <FlatList
        data={photos}
        keyExtractor={p => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 4, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 4, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="images-outline" size={48} color={Colors.textDim} />
            <Text style={{ color: Colors.textMuted, marginTop: 12 }}>No portfolio photos</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{ position: 'relative' }}>
            <Image source={{ uri: item.photo_url }} style={{ width: IMG, height: IMG, borderRadius: 10 }} />
            <View style={{ position: 'absolute', bottom: 4, left: 4, right: 4 }}>
              {item.artist && (
                <Text style={{
                  color: '#fff', fontSize: 10, fontWeight: '600',
                  backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
                }}>
                  {item.artist.full_name}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => deletePhoto(item)}
              style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, padding: 4 }}
            >
              <Ionicons name="trash-outline" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      />
    </BrandBackground>
  )
}
