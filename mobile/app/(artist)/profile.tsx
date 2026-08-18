import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { InputField } from '../../components/shared/InputField'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

const STYLES = ['Traditional', 'Realism', 'Watercolour', 'Neo-Traditional', 'Blackwork', 'Geometric', 'Japanese', 'Tribal', 'Script', 'Minimalist', 'Portrait', 'Fine Line']

type ArtistProfile = {
  id: string
  full_name: string
  bio: string | null
  specialties: string[] | null
  instagram_handle: string | null
  profile_photo_url: string | null
  years_of_experience: number | null
}

export default function ArtistProfileScreen() {
  const { profile, signOut } = useAuth()
  const [artist, setArtist] = useState<ArtistProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function load() {
    if (!profile) return
    const { data } = await supabase
      .from('artists')
      .select('id, full_name, bio, specialties, instagram_handle, profile_photo_url, years_of_experience')
      .eq('id', profile.artist_id ?? profile.id)
      .single()
    if (data) setArtist(data)
  }

  useEffect(() => { load() }, [profile])

  function update(field: keyof ArtistProfile, value: any) {
    setArtist(prev => prev ? { ...prev, [field]: value } : prev)
  }

  function toggleSpecialty(s: string) {
    setArtist(prev => {
      if (!prev) return prev
      const current = prev.specialties ?? []
      const next = current.includes(s) ? current.filter(x => x !== s) : [...current, s]
      return { ...prev, specialties: next }
    })
  }

  async function save() {
    if (!artist) return
    setSaving(true)
    await supabase.from('artists').update({
      full_name: artist.full_name,
      bio: artist.bio,
      specialties: artist.specialties,
      instagram_handle: artist.instagram_handle,
      years_of_experience: artist.years_of_experience,
    }).eq('id', artist.id)
    // Also update profiles table
    await supabase.from('profiles').update({ full_name: artist.full_name }).eq('id', profile?.id)
    setSaving(false)
    Alert.alert('Saved', 'Profile updated successfully.')
  }

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, mediaTypes: ImagePicker.MediaTypeOptions.Images })
    if (result.canceled || !artist) return
    setUploading(true)
    const uri = result.assets[0].uri
    const ext = uri.split('.').pop() ?? 'jpg'
    const path = `artists/${artist.id}/profile.${ext}`
    const res = await fetch(uri)
    const blob = await res.blob()
    await supabase.storage.from('avatars').upload(path, blob, { contentType: `image/${ext}`, upsert: true })
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('artists').update({ profile_photo_url: data.publicUrl }).eq('id', artist.id)
    update('profile_photo_url', data.publicUrl)
    setUploading(false)
  }

  function confirmSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ])
  }

  if (!artist) return (
    <BrandBackground>
      <PageHeader title="Profile" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    </BrandBackground>
  )

  return (
    <BrandBackground>
      <PageHeader title="Profile" />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={pickAvatar} style={{ position: 'relative' }}>
            <View style={{
              width: 96, height: 96, borderRadius: 48, overflow: 'hidden',
              backgroundColor: Colors.bgChip, borderWidth: 2, borderColor: Colors.gold,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {uploading
                ? <ActivityIndicator color={Colors.gold} />
                : artist.profile_photo_url
                ? <Image source={{ uri: artist.profile_photo_url }} style={{ width: 96, height: 96 }} />
                : <Ionicons name="person" size={40} color={Colors.textDim} />
              }
            </View>
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              backgroundColor: Colors.gold, borderRadius: 999, padding: 5,
            }}>
              <Ionicons name="camera" size={14} color={Colors.textOnGold} />
            </View>
          </TouchableOpacity>
          <Text style={{ color: Colors.text, fontWeight: '800', fontSize: 18, marginTop: 10 }}>{artist.full_name}</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Artist</Text>
        </View>

        <InputField label="Display Name" value={artist.full_name} onChangeText={v => update('full_name', v)} autoCapitalize="words" />
        <InputField label="Instagram Handle" value={artist.instagram_handle ?? ''} onChangeText={v => update('instagram_handle', v)} placeholder="@yourtag" autoCapitalize="none" />
        <InputField label="Years of Experience" value={artist.years_of_experience?.toString() ?? ''} onChangeText={v => update('years_of_experience', parseInt(v) || null)} keyboardType="number-pad" />

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Bio</Text>
          <TextInput
            value={artist.bio ?? ''}
            onChangeText={v => update('bio', v)}
            placeholder="Tell customers about yourself…"
            placeholderTextColor={Colors.textDim}
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: Colors.bgCard, color: Colors.text, borderRadius: 12,
              padding: 12, borderWidth: 1, borderColor: Colors.borderSubtle,
              textAlignVertical: 'top', minHeight: 90, fontSize: 14,
            }}
          />
        </View>

        <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 10 }}>Specialties</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {STYLES.map(s => {
            const selected = artist.specialties?.includes(s) ?? false
            return (
              <TouchableOpacity
                key={s}
                onPress={() => toggleSpecialty(s)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                  backgroundColor: selected ? Colors.gold : Colors.bgChip,
                  borderWidth: 1, borderColor: selected ? Colors.gold : Colors.borderSubtle,
                }}
              >
                <Text style={{ color: selected ? Colors.textOnGold : Colors.textMuted, fontSize: 13 }}>{s}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <GradientButton label={saving ? 'Saving…' : 'Save Profile'} onPress={save} loading={saving} style={{ marginBottom: 16 }} />

        <TouchableOpacity
          onPress={confirmSignOut}
          style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#f87171', alignItems: 'center' }}
        >
          <Text style={{ color: '#f87171', fontWeight: '700', fontSize: 15 }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </BrandBackground>
  )
}
