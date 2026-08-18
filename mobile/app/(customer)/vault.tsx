import { useEffect, useState } from 'react'
import { View, Text, FlatList, Image, TouchableOpacity, Dimensions, Modal } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useMembership } from '../../hooks/useMembership'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

type Tattoo = {
  id: string
  photo_url: string
  style: string | null
  completed_at: string
  artist: { full_name: string } | null
}

const { width } = Dimensions.get('window')
const IMG = (width - 40) / 3

export default function VaultScreen() {
  const { profile } = useAuth()
  const { isPremium, vaultLimit, tier } = useMembership()
  const [tattoos, setTattoos] = useState<Tattoo[]>([])
  const [preview, setPreview] = useState<Tattoo | null>(null)

  useEffect(() => {
    if (!profile || !isPremium) return
    supabase
      .from('tattoo_completions')
      .select('id, photo_url, style, completed_at, artist:artists(full_name)')
      .eq('profile_id', profile.id)
      .order('completed_at', { ascending: false })
      .limit(vaultLimit === Infinity ? 1000 : vaultLimit)
      .then(({ data }) => {
        setTattoos((data ?? []).map((t: any) => ({ ...t, artist: Array.isArray(t.artist) ? t.artist[0] : t.artist })))
      })
  }, [profile, isPremium])

  if (!isPremium) return (
    <BrandBackground>
      <PageHeader title="Tattoo Vault" showBack />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="lock-closed" size={56} color={Colors.gold} />
        <Text style={{ color: Colors.text, fontSize: 22, fontWeight: '800', marginTop: 16, textAlign: 'center' }}>
          Vault is Premium+
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
          Upgrade to Premium or Black Card to unlock your personal tattoo gallery.
        </Text>
        <GradientButton
          label="View Membership Plans"
          onPress={() => router.push('/(customer)/membership')}
          style={{ marginTop: 24 }}
        />
      </View>
    </BrandBackground>
  )

  return (
    <BrandBackground>
      <PageHeader title="Tattoo Vault" showBack />
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
          {tier === 'black-card' ? `${tattoos.length} tattoos` : `${tattoos.length} / ${vaultLimit} tattoos`}
        </Text>
      </View>
      <FlatList
        data={tattoos}
        keyExtractor={t => t.id}
        numColumns={3}
        columnWrapperStyle={{ gap: 4, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 4, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setPreview(item)}>
            <Image source={{ uri: item.photo_url }} style={{ width: IMG, height: IMG, borderRadius: 8 }} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 60, gap: 12 }}>
            <Ionicons name="images-outline" size={48} color={Colors.textDim} />
            <Text style={{ color: Colors.textMuted }}>No tattoos recorded yet</Text>
          </View>
        )}
      />

      {/* Fullscreen preview */}
      <Modal visible={!!preview} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' }}>
          <TouchableOpacity
            onPress={() => setPreview(null)}
            style={{ position: 'absolute', top: 56, right: 20, zIndex: 10 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {preview && (
            <>
              <Image source={{ uri: preview.photo_url }} style={{ width, height: width, resizeMode: 'contain' }} />
              <View style={{ padding: 20 }}>
                {preview.artist && (
                  <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16 }}>
                    by {preview.artist.full_name}
                  </Text>
                )}
                <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>
                  {preview.style && `${preview.style} · `}
                  {new Date(preview.completed_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </BrandBackground>
  )
}
