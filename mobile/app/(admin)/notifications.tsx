import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { InputField } from '../../components/shared/InputField'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

const ALLOWED_SENDERS = ['info@digitalsolutionssa.co.za', 'armand@hohtattoos.com']
const TYPES = ['info', 'promotion', 'flash', 'booking', 'system']
const AUDIENCES = [
  { id: 'all', label: 'All Customers' },
  { id: 'premium', label: 'Premium Members' },
  { id: 'black-card', label: 'Black Card Members' },
]

export default function AdminNotificationsScreen() {
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('info')
  const [audience, setAudience] = useState('all')
  const [sending, setSending] = useState(false)

  const isAllowed = ALLOWED_SENDERS.includes(profile?.email ?? '')

  async function send() {
    if (!title.trim() || !message.trim()) { Alert.alert('Required', 'Please enter title and message.'); return }
    Alert.alert('Send Notification', `Send "${title}" to ${AUDIENCES.find(a => a.id === audience)?.label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send', onPress: async () => {
          setSending(true)
          let profileIds: string[] = []
          if (audience === 'all') {
            const { data } = await supabase.from('profiles').select('id').eq('role', 'public')
            profileIds = (data ?? []).map((p: any) => p.id)
          } else {
            const { data } = await supabase.from('memberships').select('profile_id').eq('tier', audience).eq('is_active', true)
            profileIds = (data ?? []).map((p: any) => p.profile_id)
          }
          const rows = profileIds.map(id => ({ profile_id: id, title, message, type }))
          if (rows.length > 0) await supabase.from('notifications').insert(rows)
          setSending(false)
          setTitle(''); setMessage('')
          Alert.alert('Sent', `Notification sent to ${profileIds.length} users.`)
        },
      },
    ])
  }

  if (!isAllowed) return (
    <BrandBackground>
      <PageHeader title="Notifications" showBack />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>You do not have permission to send notifications.</Text>
      </View>
    </BrandBackground>
  )

  return (
    <BrandBackground>
      <PageHeader title="Send Notification" showBack />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 16 }}>Broadcast Notification</Text>

        <InputField label="Title" value={title} onChangeText={setTitle} placeholder="Notification title…" />

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Write your message…"
            placeholderTextColor={Colors.textDim}
            multiline numberOfLines={4}
            style={{
              backgroundColor: Colors.bgCard, color: Colors.text, borderRadius: 12,
              padding: 12, borderWidth: 1, borderColor: Colors.borderSubtle,
              textAlignVertical: 'top', minHeight: 100, fontSize: 14,
            }}
          />
        </View>

        <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Type</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {TYPES.map(t => (
            <TouchableOpacity key={t} onPress={() => setType(t)} style={{
              paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
              backgroundColor: type === t ? Colors.gold : Colors.bgChip,
              borderWidth: 1, borderColor: type === t ? Colors.gold : Colors.borderSubtle,
            }}>
              <Text style={{ color: type === t ? Colors.textOnGold : Colors.textMuted, fontSize: 13, textTransform: 'capitalize' }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Audience</Text>
        <View style={{ gap: 8, marginBottom: 24 }}>
          {AUDIENCES.map(a => (
            <TouchableOpacity key={a.id} onPress={() => setAudience(a.id)} style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12,
              borderWidth: 1, borderColor: audience === a.id ? Colors.gold : Colors.borderSubtle,
            }}>
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: audience === a.id ? Colors.gold : Colors.bgChip,
                borderWidth: 2, borderColor: audience === a.id ? Colors.gold : Colors.borderSubtle,
              }} />
              <Text style={{ color: Colors.text, fontSize: 14 }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <GradientButton label={sending ? 'Sending…' : 'Send Notification'} onPress={send} loading={sending} />
      </ScrollView>
    </BrandBackground>
  )
}
