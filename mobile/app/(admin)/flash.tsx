import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch, Image, RefreshControl } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { InputField } from '../../components/shared/InputField'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

type FlashEvent = {
  id: string; title: string; description: string | null; event_date: string; spots_total: number
  spots_remaining: number; is_active: boolean; cover_image_url: string | null; status: string
}

export default function AdminFlashScreen() {
  const [events, setEvents] = useState<FlashEvent[]>([])
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [spots, setSpots] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase.from('flash_events').select('*').order('event_date', { ascending: false })
    setEvents(data ?? [])
  }

  useEffect(() => { load() }, [])
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images })
    if (!result.canceled) setImageUri(result.assets[0].uri)
  }

  async function save() {
    if (!title.trim() || !eventDate || !spots) { Alert.alert('Title, date, and spots are required'); return }
    setSaving(true)
    let coverUrl: string | null = null
    if (imageUri) {
      const ext = imageUri.split('.').pop() ?? 'jpg'
      const path = `flash/${Date.now()}.${ext}`
      const res = await fetch(imageUri)
      const blob = await res.blob()
      await supabase.storage.from('flash').upload(path, blob, { contentType: `image/${ext}` })
      const { data } = supabase.storage.from('flash').getPublicUrl(path)
      coverUrl = data.publicUrl
    }
    const spotsNum = parseInt(spots)
    await supabase.from('flash_events').insert({
      title, description: description || null, event_date: eventDate,
      spots_total: spotsNum, spots_remaining: spotsNum,
      cover_image_url: coverUrl, is_active: true, status: 'upcoming',
    })
    setSaving(false); setAdding(false); setTitle(''); setDescription(''); setEventDate(''); setSpots(''); setImageUri(null)
    load()
  }

  async function toggleActive(e: FlashEvent) {
    await supabase.from('flash_events').update({ is_active: !e.is_active }).eq('id', e.id)
    load()
  }

  async function deleteEvent(e: FlashEvent) {
    Alert.alert('Delete', `Remove "${e.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('flash_events').delete().eq('id', e.id); load() } },
    ])
  }

  const STATUS_COLOR: Record<string, string> = { upcoming: '#fbbf24', open: '#4ade80', full: '#f87171', completed: '#60a5fa' }

  return (
    <BrandBackground>
      <PageHeader title="Flash Events" showBack />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
      >
        {adding ? (
          <View style={{ backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.borderGold }}>
            <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>New Flash Event</Text>
            <InputField label="Title" value={title} onChangeText={setTitle} placeholder="Event title" />
            <InputField label="Description" value={description} onChangeText={setDescription} placeholder="Optional description" />
            <InputField label="Date (YYYY-MM-DD)" value={eventDate} onChangeText={setEventDate} placeholder="2025-01-15" />
            <InputField label="Total Spots" value={spots} onChangeText={setSpots} keyboardType="number-pad" placeholder="e.g. 12" />

            <TouchableOpacity onPress={pickImage} style={{
              height: 70, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed',
              borderColor: imageUri ? Colors.gold : Colors.borderSubtle,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 14,
            }}>
              <Ionicons name={imageUri ? 'checkmark-circle' : 'image-outline'} size={22} color={imageUri ? Colors.gold : Colors.textDim} />
              <Text style={{ color: imageUri ? Colors.gold : Colors.textMuted, fontSize: 13 }}>
                {imageUri ? 'Cover selected' : 'Pick cover image'}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setAdding(false)} style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderSubtle, alignItems: 'center' }}>
                <Text style={{ color: Colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <GradientButton label={saving ? 'Saving…' : 'Create Event'} onPress={save} loading={saving} />
              </View>
            </View>
          </View>
        ) : (
          <GradientButton label="Create Flash Event" onPress={() => setAdding(true)} style={{ marginBottom: 16 }} />
        )}

        {events.map(e => (
          <View key={e.id} style={{
            backgroundColor: Colors.bgCard, borderRadius: 14, overflow: 'hidden', marginBottom: 10,
            borderWidth: 1, borderColor: Colors.borderSubtle,
          }}>
            {e.cover_image_url && <Image source={{ uri: e.cover_image_url }} style={{ width: '100%', height: 100 }} resizeMode="cover" />}
            <View style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15, flex: 1 }}>{e.title}</Text>
                <View style={{ backgroundColor: (STATUS_COLOR[e.status] ?? Colors.textDim) + '30', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: STATUS_COLOR[e.status] ?? Colors.textDim, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>{e.status}</Text>
                </View>
              </View>
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                {new Date(e.event_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })} · {e.spots_remaining}/{e.spots_total} spots
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <Switch value={e.is_active} onValueChange={() => toggleActive(e)} thumbColor={Colors.gold} trackColor={{ true: Colors.borderGold, false: Colors.bgChip }} />
                <TouchableOpacity onPress={() => deleteEvent(e)}>
                  <Ionicons name="trash-outline" size={16} color={Colors.textDim} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </BrandBackground>
  )
}
