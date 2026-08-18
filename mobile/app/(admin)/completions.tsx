import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { awardPoints } from '../../lib/awardPoints'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { InputField } from '../../components/shared/InputField'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

const STYLES = ['Traditional', 'Realism', 'Watercolour', 'Neo-Traditional', 'Blackwork', 'Geometric', 'Japanese', 'Tribal', 'Script', 'Minimalist', 'Other']

type Profile = { id: string; full_name: string }
type Artist = { id: string; full_name: string }

export default function AdminCompletionsScreen() {
  const [customers, setCustomers] = useState<Profile[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [customerId, setCustomerId] = useState('')
  const [artistId, setArtistId] = useState('')
  const [style, setStyle] = useState('')
  const [hours, setHours] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').eq('role', 'public').order('full_name').then(({ data }) => setCustomers(data ?? []))
    supabase.from('artists').select('id, full_name').eq('is_active', true).order('full_name').then(({ data }) => setArtists(data ?? []))
  }, [])

  async function pickPhoto() {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 })
    if (!result.canceled) setImageUri(result.assets[0].uri)
  }

  async function submit() {
    if (!customerId || !artistId || !style) {
      Alert.alert('Required', 'Please select customer, artist, and style.'); return
    }
    setUploading(true)
    let photoUrl: string | null = null
    if (imageUri) {
      const ext = imageUri.split('.').pop() ?? 'jpg'
      const path = `completions/${artistId}/${Date.now()}.${ext}`
      const res = await fetch(imageUri)
      const blob = await res.blob()
      const { error } = await supabase.storage.from('portfolio').upload(path, blob, { contentType: `image/${ext}` })
      if (!error) {
        const { data } = supabase.storage.from('portfolio').getPublicUrl(path)
        photoUrl = data.publicUrl
      }
    }
    const priceVal = parseFloat(price) || 0
    await supabase.from('tattoo_completions').insert({
      profile_id: customerId, artist_id: artistId, style,
      duration_hours: parseFloat(hours) || null,
      price: priceVal, photo_url: photoUrl, notes,
      completed_at: new Date().toISOString(),
    })
    if (priceVal > 0) {
      const pts = Math.floor(priceVal / 10)
      if (pts > 0) await awardPoints(customerId, pts, 'spend')
    }
    setUploading(false)
    setCustomerId(''); setArtistId(''); setStyle(''); setHours(''); setPrice(''); setNotes(''); setImageUri(null)
    Alert.alert('Saved', 'Tattoo completion recorded.')
  }

  return (
    <BrandBackground>
      <PageHeader title="Record Completion" showBack />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 12 }}>
        <View>
          <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Customer</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {customers.map(c => (
                <TouchableOpacity key={c.id} onPress={() => setCustomerId(c.id)} style={{
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
                  backgroundColor: customerId === c.id ? Colors.gold : Colors.bgChip,
                  borderWidth: 1, borderColor: customerId === c.id ? Colors.gold : Colors.borderSubtle,
                }}>
                  <Text style={{ color: customerId === c.id ? Colors.textOnGold : Colors.textMuted, fontSize: 13 }}>{c.full_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View>
          <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Artist</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {artists.map(a => (
                <TouchableOpacity key={a.id} onPress={() => setArtistId(a.id)} style={{
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
                  backgroundColor: artistId === a.id ? Colors.gold : Colors.bgChip,
                  borderWidth: 1, borderColor: artistId === a.id ? Colors.gold : Colors.borderSubtle,
                }}>
                  <Text style={{ color: artistId === a.id ? Colors.textOnGold : Colors.textMuted, fontSize: 13 }}>{a.full_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View>
          <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Style</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STYLES.map(s => (
              <TouchableOpacity key={s} onPress={() => setStyle(s)} style={{
                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                backgroundColor: style === s ? Colors.gold : Colors.bgChip,
                borderWidth: 1, borderColor: style === s ? Colors.gold : Colors.borderSubtle,
              }}>
                <Text style={{ color: style === s ? Colors.textOnGold : Colors.textMuted, fontSize: 13 }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <InputField label="Duration (hours)" value={hours} onChangeText={setHours} keyboardType="decimal-pad" placeholder="e.g. 3" />
        <InputField label="Price charged (R)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="e.g. 2000" />
        <InputField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Notes…" multiline />

        <TouchableOpacity
          onPress={pickPhoto}
          style={{
            height: 80, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed',
            borderColor: imageUri ? Colors.gold : Colors.borderSubtle,
            alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
          }}
        >
          <Ionicons name={imageUri ? 'checkmark-circle' : 'camera-outline'} size={24} color={imageUri ? Colors.gold : Colors.textDim} />
          <Text style={{ color: imageUri ? Colors.gold : Colors.textMuted, fontSize: 13 }}>
            {imageUri ? 'Photo selected' : 'Take photo (optional)'}
          </Text>
        </TouchableOpacity>

        <GradientButton label={uploading ? 'Saving…' : 'Save Completion'} onPress={submit} loading={uploading} />
      </ScrollView>
    </BrandBackground>
  )
}
