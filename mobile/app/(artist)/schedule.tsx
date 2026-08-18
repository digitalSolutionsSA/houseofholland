import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_IDS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

type Schedule = { day_of_week: string; is_available: boolean; start_time: string; end_time: string }
type Override = { id: string; date: string; is_available: boolean; note: string | null }

export default function ArtistScheduleScreen() {
  const { profile } = useAuth()
  const [schedules, setSchedules] = useState<Record<string, Schedule>>({})
  const [overrides, setOverrides] = useState<Override[]>([])
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'weekly' | 'overrides'>('weekly')

  async function load() {
    if (!profile) return
    const artistId = profile.artist_id ?? profile.id
    const [schRes, ovRes] = await Promise.all([
      supabase.from('artist_schedules').select('*').eq('artist_id', artistId),
      supabase.from('schedule_date_overrides').select('*').eq('artist_id', artistId).order('date'),
    ])
    const map: Record<string, Schedule> = {}
    DAY_IDS.forEach(d => {
      const found = (schRes.data ?? []).find((s: any) => s.day_of_week === d)
      map[d] = found ?? { day_of_week: d, is_available: false, start_time: '09:00', end_time: '17:00' }
    })
    setSchedules(map)
    setOverrides(ovRes.data ?? [])
  }

  useEffect(() => { load() }, [profile])

  async function saveSchedules() {
    if (!profile) return
    setSaving(true)
    const artistId = profile.artist_id ?? profile.id
    for (const day of DAY_IDS) {
      await supabase.from('artist_schedules').upsert({
        artist_id: artistId,
        ...schedules[day],
      }, { onConflict: 'artist_id,day_of_week' })
    }
    setSaving(false)
    Alert.alert('Saved', 'Schedule updated successfully.')
  }

  async function addOverride() {
    if (!profile) return
    const today = new Date().toISOString().split('T')[0]
    const artistId = profile.artist_id ?? profile.id
    await supabase.from('schedule_date_overrides').insert({
      artist_id: artistId,
      date: today,
      is_available: false,
      note: 'Day off',
    })
    load()
  }

  async function deleteOverride(id: string) {
    await supabase.from('schedule_date_overrides').delete().eq('id', id)
    load()
  }

  function updateDay(day: string, field: keyof Schedule, value: any) {
    setSchedules(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  return (
    <BrandBackground>
      <PageHeader title="Schedule" showBack />
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle }}>
        {(['weekly', 'overrides'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1, paddingVertical: 12, alignItems: 'center',
              borderBottomWidth: 2, borderBottomColor: tab === t ? Colors.gold : 'transparent',
            }}
          >
            <Text style={{ color: tab === t ? Colors.gold : Colors.textMuted, fontWeight: '600', fontSize: 14, textTransform: 'capitalize' }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'weekly' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}>
          {DAY_IDS.map((day, i) => {
            const s = schedules[day]
            if (!s) return null
            return (
              <View key={day} style={{
                backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
                borderWidth: 1, borderColor: s.is_available ? Colors.borderGold : Colors.borderSubtle,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.is_available ? 10 : 0 }}>
                  <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 15 }}>{DAYS[i]}</Text>
                  <Switch value={s.is_available} onValueChange={v => updateDay(day, 'is_available', v)} thumbColor={Colors.gold} trackColor={{ true: Colors.borderGold, false: Colors.bgChip }} />
                </View>
                {s.is_available && (
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 4 }}>Start</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {TIME_SLOTS.slice(0, 8).map(t => (
                            <TouchableOpacity key={t} onPress={() => updateDay(day, 'start_time', t)} style={{
                              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                              backgroundColor: s.start_time === t ? Colors.gold : Colors.bgChip,
                            }}>
                              <Text style={{ color: s.start_time === t ? Colors.textOnGold : Colors.textMuted, fontSize: 12 }}>{t}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}
                {s.is_available && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 4 }}>End</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {TIME_SLOTS.slice(2).map(t => (
                          <TouchableOpacity key={t} onPress={() => updateDay(day, 'end_time', t)} style={{
                            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                            backgroundColor: s.end_time === t ? Colors.gold : Colors.bgChip,
                          }}>
                            <Text style={{ color: s.end_time === t ? Colors.textOnGold : Colors.textMuted, fontSize: 12 }}>{t}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            )
          })}
          <GradientButton label={saving ? 'Saving…' : 'Save Schedule'} onPress={saveSchedules} loading={saving} style={{ marginTop: 8 }} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <GradientButton label="Add Day Off / Override" onPress={addOverride} style={{ marginBottom: 16 }} />
          <Text style={{ color: Colors.textMuted, fontSize: 13, marginBottom: 12 }}>
            Date overrides allow you to mark specific dates as unavailable or add exceptions to your weekly schedule.
          </Text>
          {overrides.length === 0 && <Text style={{ color: Colors.textDim }}>No overrides set</Text>}
          {overrides.map(o => (
            <View key={o.id} style={{
              backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14, marginBottom: 8,
              flexDirection: 'row', alignItems: 'center', gap: 10,
              borderWidth: 1, borderColor: Colors.borderSubtle,
            }}>
              <Ionicons name={o.is_available ? 'checkmark-circle' : 'close-circle'} size={22} color={o.is_available ? '#4ade80' : '#f87171'} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.text, fontWeight: '600' }}>
                  {new Date(o.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                {o.note && <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{o.note}</Text>}
              </View>
              <TouchableOpacity onPress={() => deleteOverride(o.id)}>
                <Ionicons name="trash-outline" size={18} color={Colors.textDim} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </BrandBackground>
  )
}
