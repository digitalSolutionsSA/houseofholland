import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { awardPoints } from '../../lib/awardPoints'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { InputField } from '../../components/shared/InputField'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

const STYLES = ['Traditional', 'Realism', 'Watercolour', 'Neo-Traditional', 'Blackwork', 'Geometric', 'Japanese', 'Tribal', 'Script', 'Minimalist', 'Other']

type Booking = { id: string; service: string; customer: { id: string; full_name: string } | null }

export default function ArtistCompletionsScreen() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [style, setStyle] = useState('')
  const [hours, setHours] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function loadBookings() {
    if (!profile) return
    const { data } = await supabase
      .from('bookings')
      .select('id, service, customer:profiles!bookings_profile_id_fkey(id, full_name)')
      .eq('artist_id', profile.artist_id ?? profile.id)
      .eq('status', 'completed')
      .not('id', 'in', `(SELECT booking_id FROM tattoo_completions WHERE booking_id IS NOT NULL)`)
    setBookings((data ?? []).map((b: any) => ({
      ...b,
      customer: Array.isArray(b.customer) ? b.customer[0] : b.customer,
    })))
  }

  useEffect(() => { loadBookings() }, [profile])

  async function pickPhoto() {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 })
    if (!result.canceled) setImageUri(result.assets[0].uri)
  }

  async function submit() {
    if (!profile || !selectedBooking?.customer) return
    if (!style) { Alert.alert('Style required', 'Please select a tattoo style.'); return }

    setUploading(true)
    let photoUrl: string | null = null

    if (imageUri) {
      const ext = imageUri.split('.').pop() ?? 'jpg'
      const path = `completions/${profile.id}/${Date.now()}.${ext}`
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
      profile_id: selectedBooking.customer.id,
      artist_id: profile.artist_id ?? profile.id,
      booking_id: selectedBooking.id,
      style,
      duration_hours: parseFloat(hours) || null,
      price: priceVal,
      photo_url: photoUrl,
      notes,
      completed_at: new Date().toISOString(),
    })

    if (priceVal > 0) {
      const pts = Math.floor(priceVal / 10)
      if (pts > 0) await awardPoints(selectedBooking.customer.id, pts, 'spend')
    }

    setUploading(false)
    setSelectedBooking(null)
    setStyle(''); setHours(''); setPrice(''); setNotes(''); setImageUri(null)
    loadBookings()
    Alert.alert('Recorded', 'Tattoo completion saved successfully.')
  }

  if (selectedBooking) return (
    <BrandBackground>
      <PageHeader title="Record Completion" showBack />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={{ backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.borderGold }}>
          <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Customer</Text>
          <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15 }}>{selectedBooking.customer?.full_name}</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{selectedBooking.service}</Text>
        </View>

        <Text style={{ color: Colors.text, fontWeight: '600', fontSize: 14, marginBottom: 8 }}>Style</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
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

        <InputField label="Duration (hours)" value={hours} onChangeText={setHours} keyboardType="decimal-pad" placeholder="e.g. 2.5" />
        <InputField label="Price charged (R)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="e.g. 1500" />
        <InputField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Add notes…" multiline />

        <TouchableOpacity
          onPress={pickPhoto}
          style={{
            height: 100, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed',
            borderColor: imageUri ? Colors.gold : Colors.borderSubtle,
            alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20,
          }}
        >
          <Ionicons name={imageUri ? 'checkmark-circle' : 'camera-outline'} size={28} color={imageUri ? Colors.gold : Colors.textDim} />
          <Text style={{ color: imageUri ? Colors.gold : Colors.textMuted, fontSize: 13 }}>
            {imageUri ? 'Photo selected' : 'Take photo (optional)'}
          </Text>
        </TouchableOpacity>

        <GradientButton label={uploading ? 'Saving…' : 'Save Completion'} onPress={submit} loading={uploading} />
      </ScrollView>
    </BrandBackground>
  )

  return (
    <BrandBackground>
      <PageHeader title="Record Completion" showBack />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ color: Colors.textMuted, fontSize: 14, marginBottom: 16 }}>
          Select a completed booking to record the tattoo:
        </Text>
        {bookings.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={Colors.textDim} />
            <Text style={{ color: Colors.textMuted, marginTop: 12 }}>No unrecorded completions</Text>
          </View>
        ) : (
          bookings.map(b => (
            <TouchableOpacity
              key={b.id}
              onPress={() => setSelectedBooking(b)}
              style={{
                backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, marginBottom: 10,
                borderWidth: 1, borderColor: Colors.borderSubtle,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}
            >
              <Ionicons name="checkmark-circle" size={22} color="#4ade80" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.text, fontWeight: '700' }}>{b.customer?.full_name}</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{b.service}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </BrandBackground>
  )
}
