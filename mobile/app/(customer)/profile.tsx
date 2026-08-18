import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { InputField } from '../../components/shared/InputField'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'
import { router } from 'expo-router'

const TIER_LABELS: Record<string, string> = {
  free: 'Member',
  premium: 'Premium',
  'black-card': 'Black Card',
}
const TIER_COLORS: Record<string, string> = {
  free: Colors.textMuted,
  premium: '#dc2626',
  'black-card': Colors.gold,
}

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() }).eq('id', profile.id)
    await refreshProfile()
    setSaving(false)
    Alert.alert('Saved', 'Profile updated.')
  }

  async function pickAvatar() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    if (res.canceled || !profile) return
    const uri = res.assets[0].uri
    const ext = uri.split('.').pop() ?? 'jpg'
    const path = `avatars/${profile.id}.${ext}`
    const file = { uri, name: `avatar.${ext}`, type: `image/${ext}` }
    await supabase.storage.from('avatars').upload(path, file as any, { upsert: true })
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id)
    await refreshProfile()
  }

  const menuItems = [
    { label: 'My Bookings', icon: 'calendar', route: '/(customer)/bookings' },
    { label: 'Tattoo Passport', icon: 'id-card', route: '/(customer)/passport' },
    { label: 'Battle Pass', icon: 'trophy', route: '/(customer)/battle-pass' },
    { label: 'Membership', icon: 'card', route: '/(customer)/membership' },
    { label: 'Tattoo Vault', icon: 'images', route: '/(customer)/vault' },
    { label: 'Consent Forms', icon: 'document-text', route: '/(customer)/consent' },
    { label: 'Messages', icon: 'chatbubbles', route: '/(customer)/messages' },
  ]

  return (
    <BrandBackground>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', paddingTop: 56, paddingBottom: 24 }}>
          <TouchableOpacity onPress={pickAvatar} style={{ position: 'relative' }}>
            <View style={{
              width: 90, height: 90, borderRadius: 45,
              backgroundColor: Colors.bgChip,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: Colors.gold,
              overflow: 'hidden',
            }}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={{ width: 90, height: 90 }} />
              ) : (
                <Text style={{ color: Colors.gold, fontSize: 32, fontWeight: '700' }}>
                  {profile?.full_name?.[0] ?? '?'}
                </Text>
              )}
            </View>
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              backgroundColor: Colors.gold, borderRadius: 12, padding: 4,
            }}>
              <Ionicons name="camera" size={14} color={Colors.textOnGold} />
            </View>
          </TouchableOpacity>

          <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '700', marginTop: 12 }}>
            {profile?.full_name ?? 'User'}
          </Text>
          <View style={{
            marginTop: 6, paddingHorizontal: 12, paddingVertical: 4,
            backgroundColor: Colors.bgChip, borderRadius: 999,
          }}>
            <Text style={{ color: TIER_COLORS[profile?.membership_plan ?? 'free'], fontSize: 12, fontWeight: '700' }}>
              {TIER_LABELS[profile?.membership_plan ?? 'free']}
            </Text>
          </View>
        </View>

        {/* Edit fields */}
        <View style={{ paddingHorizontal: 18 }}>
          <InputField label="Full Name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
          <InputField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <GradientButton label="Save Changes" onPress={save} loading={saving} style={{ marginBottom: 24 }} />
        </View>

        {/* Menu */}
        <View style={{ paddingHorizontal: 18 }}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as any)}
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: Colors.bgCard,
                borderRadius: 12, padding: 14,
                marginBottom: 8, gap: 12,
                borderWidth: 1, borderColor: Colors.borderSubtle,
              }}
            >
              <Ionicons name={item.icon as any} size={20} color={Colors.gold} />
              <Text style={{ flex: 1, color: Colors.text, fontSize: 15 }}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ])}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              marginTop: 16, padding: 14, gap: 8,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '600' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BrandBackground>
  )
}
