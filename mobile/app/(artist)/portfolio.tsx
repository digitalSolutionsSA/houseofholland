import { useEffect, useState } from 'react'
import { View, Text, FlatList, Image, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { Colors } from '../../constants/colors'

type Photo = { id: string; photo_url: string; style: string | null; created_at: string }

const { width } = Dimensions.get('window')
const IMG = (width - 36) / 2

export default function ArtistPortfolioScreen() {
  const { profile } = useAuth()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)

  async function load() {
    if (!profile) return
    const { data } = await supabase
      .from('portfolio_photos')
      .select('id, photo_url, style, created_at')
      .eq('artist_id', profile.artist_id ?? profile.id)
      .order('created_at', { ascending: false })
    setPhotos(data ?? [])
  }

  useEffect(() => { load() }, [profile])

  async function addPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    })
    if (result.canceled) return
    setUploading(true)
    const artistId = profile?.artist_id ?? profile?.id
    for (const asset of result.assets) {
      const ext = asset.uri.split('.').pop() ?? 'jpg'
      const path = `portfolio/${artistId}/${Date.now()}.${ext}`
      const res = await fetch(asset.uri)
      const blob = await res.blob()
      const { error } = await supabase.storage.from('portfolio').upload(path, blob, { contentType: `image/${ext}` })
      if (!error) {
        const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(path)
        await supabase.from('portfolio_photos').insert({
          artist_id: artistId,
          photo_url: urlData.publicUrl,
        })
      }
    }
    setUploading(false)
    load()
  }

  async function deletePhoto(photo: Photo) {
    Alert.alert('Delete Photo', 'Remove this photo from your portfolio?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('portfolio_photos').delete().eq('id', photo.id)
          load()
        },
      },
    ])
  }

  return (
    <BrandBackground>
      <PageHeader title="Portfolio" showBack right={
        <TouchableOpacity onPress={addPhoto} style={{ padding: 4 }}>
          {uploading
            ? <ActivityIndicator size="small" color={Colors.gold} />
            : <Ionicons name="add" size={26} color={Colors.gold} />
          }
        </TouchableOpacity>
      } />

      <FlatList
        data={photos}
        keyExtractor={p => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 4, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 4, paddingVertical: 12, paddingBottom: 24 }}
        ListHeaderComponent={() => (
          <TouchableOpacity
            onPress={addPhoto}
            style={{
              margin: 16, marginBottom: 4, height: 56, borderRadius: 14, borderWidth: 2,
              borderColor: Colors.borderGold, borderStyle: 'dashed',
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
            }}
          >
            <Ionicons name="add-circle-outline" size={22} color={Colors.gold} />
            <Text style={{ color: Colors.gold, fontWeight: '600', fontSize: 14 }}>Add Photos</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="images-outline" size={48} color={Colors.textDim} />
            <Text style={{ color: Colors.textMuted, marginTop: 12 }}>No portfolio photos yet</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity onLongPress={() => deletePhoto(item)} style={{ position: 'relative' }}>
            <Image source={{ uri: item.photo_url }} style={{ width: IMG, height: IMG, borderRadius: 10 }} />
            <TouchableOpacity
              onPress={() => deletePhoto(item)}
              style={{
                position: 'absolute', top: 6, right: 6,
                backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, padding: 4,
              }}
            >
              <Ionicons name="trash-outline" size={14} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </BrandBackground>
  )
}
