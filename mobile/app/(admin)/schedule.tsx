import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { Colors } from '../../constants/colors'

type ArtistSchedule = {
  artist_id: string
  full_name: string
  avatar_url: string | null
  schedules: { day_of_week: string; is_available: boolean; start_time: string; end_time: string }[]
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function AdminScheduleScreen() {
  const [artistSchedules, setArtistSchedules] = useState<ArtistSchedule[]>([])
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data: artists } = await supabase.from('artists').select('id, full_name, profile_photo_url').eq('is_active', true).order('full_name')
    const { data: schedules } = await supabase.from('artist_schedules').select('*')

    const mapped: ArtistSchedule[] = (artists ?? []).map((a: any) => ({
      artist_id: a.id,
      full_name: a.full_name,
      avatar_url: a.profile_photo_url,
      schedules: DAYS.map(day => {
        const found = (schedules ?? []).find((s: any) => s.artist_id === a.id && s.day_of_week === day)
        return found ?? { day_of_week: day, is_available: false, start_time: '09:00', end_time: '17:00' }
      }),
    }))
    setArtistSchedules(mapped)
  }

  useEffect(() => { load() }, [])
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }

  return (
    <BrandBackground>
      <PageHeader title="All Schedules" showBack />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
      >
        {artistSchedules.map(a => (
          <View key={a.artist_id} style={{
            backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
            borderWidth: 1, borderColor: Colors.borderSubtle,
          }}>
            <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15, marginBottom: 12 }}>{a.full_name}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {a.schedules.map((s, i) => (
                <View key={s.day_of_week} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: Colors.textDim, fontSize: 11, marginBottom: 4 }}>{DAY_SHORT[i]}</Text>
                  <View style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: s.is_available ? Colors.gold : Colors.bgChip,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {s.is_available
                      ? <Ionicons name="checkmark" size={14} color={Colors.textOnGold} />
                      : <Ionicons name="close" size={12} color={Colors.textDim} />
                    }
                  </View>
                  {s.is_available && (
                    <Text style={{ color: Colors.textDim, fontSize: 9, marginTop: 3 }}>
                      {s.start_time.slice(0, 5)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
        {artistSchedules.length === 0 && <Text style={{ color: Colors.textMuted }}>No artists found</Text>}
      </ScrollView>
    </BrandBackground>
  )
}
