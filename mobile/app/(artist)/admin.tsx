import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { Colors } from '../../constants/colors'

const ADMIN_LINKS = [
  { label: 'Bookings', icon: 'calendar-outline', route: '/(admin)/bookings', description: 'Approve & manage appointments' },
  { label: 'Record Tattoo', icon: 'checkmark-circle-outline', route: '/(admin)/completions', description: 'Log completed sessions' },
  { label: 'Artists', icon: 'people-outline', route: '/(admin)/artists', description: 'Manage artist accounts' },
  { label: 'Guest Artists', icon: 'person-add-outline', route: '/(admin)/guest-artists', description: 'Visiting artists roster' },
  { label: 'Merch', icon: 'shirt-outline', route: '/(admin)/merch', description: 'Products & stock' },
  { label: 'Flash Events', icon: 'flash-outline', route: '/(admin)/flash', description: 'Create & manage flash days' },
  { label: 'Portfolio', icon: 'images-outline', route: '/(admin)/portfolio', description: 'Artist portfolio photos' },
  { label: 'Schedule', icon: 'time-outline', route: '/(admin)/schedule', description: 'Artist availability' },
  { label: 'Waivers', icon: 'document-text-outline', route: '/(admin)/waivers', description: 'Signed consent forms' },
  { label: 'Booth Rent', icon: 'home-outline', route: '/(admin)/rent', description: 'Rent payments & config' },
  { label: 'Notifications', icon: 'notifications-outline', route: '/(admin)/notifications', description: 'Broadcast messages' },
  { label: 'Client Points', icon: 'trophy-outline', route: '/(admin)/points', description: 'Loyalty points admin' },
  { label: 'Referrals', icon: 'git-branch-outline', route: '/(admin)/referrals', description: 'Commission dashboard' },
]

export default function AdminMenuScreen() {
  const { realProfile } = useAuth()
  const isManager = realProfile?.role === 'manager'

  const links = ADMIN_LINKS.filter(l => {
    // Notifications and Referrals are super-admin only
    if (!realProfile?.is_super_admin && ['/(admin)/notifications', '/(admin)/referrals'].includes(l.route)) return false
    return true
  })

  return (
    <BrandBackground>
      <PageHeader title="Admin" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {links.map(item => (
          <TouchableOpacity
            key={item.label}
            onPress={() => router.push(item.route as any)}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: Colors.bgCard,
              borderRadius: 12, padding: 14,
              gap: 14, borderWidth: 1, borderColor: Colors.borderSubtle,
            }}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: Colors.bgMuted,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name={item.icon as any} size={20} color={Colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 14 }}>{item.label}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </BrandBackground>
  )
}
