import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { BrandBackground } from '../../../components/shared/BrandBackground'
import { PageHeader } from '../../../components/shared/PageHeader'
import { GradientButton } from '../../../components/shared/GradientButton'
import { Colors } from '../../../constants/colors'

type Artist = { id: string; full_name: string; avatar_url: string | null }
type TimeSlot = { label: string; value: string; taken: boolean }

const SERVICES = ['Traditional Tattoo', 'Neo-Traditional', 'Realism', 'Blackwork', 'Geometric', 'Watercolour', 'Japanese', 'Touch-up', 'Cover-up', 'Consultation']
const STEPS = ['Artist', 'Service', 'Date & Time', 'Confirm']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function pad(n: number) { return n.toString().padStart(2, '0') }

export default function SelectTimeScreen() {
  const { artist: preArtist, reschedule } = useLocalSearchParams<{ artist?: string; reschedule?: string }>()
  const { profile } = useAuth()
  const isReschedule = !!reschedule

  const [step, setStep] = useState(preArtist ? 1 : 0)
  const [artists, setArtists] = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)
  const [service, setService] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refs, setRefs] = useState<string[]>([])

  // Calendar state
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  useEffect(() => {
    supabase.from('artists').select('id, full_name, avatar_url').eq('is_active', true).then(({ data }) => {
      setArtists(data ?? [])
      if (preArtist && data) {
        const a = data.find((a: Artist) => a.id === preArtist)
        if (a) setSelectedArtist(a)
      }
    })
  }, [])

  async function loadSlots(artistId: string, date: string) {
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)

    const dow = new Date(date).getDay()
    const { data: schedule } = await supabase
      .from('artist_schedules')
      .select('start_time, end_time, slot_duration_mins')
      .eq('artist_id', artistId)
      .eq('day_of_week', dow)
      .maybeSingle()

    if (!schedule) { setLoadingSlots(false); return }

    const { data: overrides } = await supabase
      .from('schedule_date_overrides')
      .select('start_time, end_time, is_closed')
      .eq('artist_id', artistId)
      .eq('date', date)
      .maybeSingle()

    if (overrides?.is_closed) { setLoadingSlots(false); return }

    const start = overrides?.start_time ?? schedule.start_time
    const end = overrides?.end_time ?? schedule.end_time
    const dur = schedule.slot_duration_mins ?? 60

    const { data: taken } = await supabase
      .from('bookings')
      .select('start_time')
      .eq('artist_id', artistId)
      .eq('date', date)
      .in('status', ['pending', 'accepted', 'confirmed'])
      .neq('id', reschedule ?? '')

    const takenTimes = new Set((taken ?? []).map((b: any) => b.start_time))

    const generated: TimeSlot[] = []
    let [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const endMins = eh * 60 + em

    while (sh * 60 + sm < endMins) {
      const label = `${pad(sh)}:${pad(sm)}`
      generated.push({ label, value: label, taken: takenTimes.has(label) })
      sm += dur
      if (sm >= 60) { sh += Math.floor(sm / 60); sm = sm % 60 }
    }

    setSlots(generated)
    setLoadingSlots(false)
  }

  useEffect(() => {
    if (selectedArtist && selectedDate) loadSlots(selectedArtist.id, selectedDate)
  }, [selectedArtist, selectedDate])

  async function pickRef() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
    if (res.canceled || !profile) return
    const uri = res.assets[0].uri
    const ext = uri.split('.').pop() ?? 'jpg'
    const path = `refs/${profile.id}/${Date.now()}.${ext}`
    await supabase.storage.from('portfolio').upload(path, { uri, name: `ref.${ext}`, type: `image/${ext}` } as any, { upsert: true })
    const { data } = supabase.storage.from('portfolio').getPublicUrl(path)
    setRefs(prev => [...prev, data.publicUrl])
  }

  async function confirm() {
    if (!profile || !selectedArtist || !selectedDate || !selectedSlot) return
    setSubmitting(true)

    if (isReschedule) {
      await supabase.from('bookings').update({
        date: selectedDate,
        start_time: selectedSlot,
        artist_id: selectedArtist.id,
        status: 'pending',
      }).eq('id', reschedule)
    } else {
      await supabase.from('bookings').insert({
        profile_id: profile.id,
        artist_id: selectedArtist.id,
        date: selectedDate,
        start_time: selectedSlot,
        service_type: service,
        notes: notes || null,
        reference_images: refs.length ? refs : null,
        status: 'pending',
      })
    }

    // Notify artist
    await supabase.from('notifications').insert({
      profile_id: selectedArtist.id,
      title: isReschedule ? 'Appointment Rescheduled' : 'New Booking Request',
      body: `${profile.full_name} ${isReschedule ? 'rescheduled to' : 'booked'} ${selectedDate} at ${selectedSlot}`,
      type: 'booking',
    })

    setSubmitting(false)
    Alert.alert('Booked!', isReschedule ? 'Your appointment has been rescheduled.' : 'Your booking request has been sent.', [
      { text: 'OK', onPress: () => router.replace('/(customer)/bookings') },
    ])
  }

  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDow = new Date(calYear, calMonth, 1).getDay()
  const today = `${calYear}-${pad(calMonth + 1)}-${pad(now.getDate())}`

  return (
    <BrandBackground>
      <PageHeader title={isReschedule ? 'Reschedule' : 'Book Appointment'} showBack />

      {/* Step indicator */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 12, gap: 4 }}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: i <= step ? Colors.gold : Colors.bgChip,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {i < step
                ? <Ionicons name="checkmark" size={16} color={Colors.textOnGold} />
                : <Text style={{ color: i === step ? Colors.textOnGold : Colors.textDim, fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>}
            </View>
            <Text style={{ color: i === step ? Colors.gold : Colors.textDim, fontSize: 9, marginTop: 4, textAlign: 'center' }}>
              {s}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>

        {/* Step 0: Pick artist */}
        {step === 0 && (
          <View style={{ gap: 10 }}>
            <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>Select an Artist</Text>
            {artists.map(a => (
              <TouchableOpacity
                key={a.id}
                onPress={() => { setSelectedArtist(a); setStep(1) }}
                style={{
                  backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  borderWidth: 1, borderColor: selectedArtist?.id === a.id ? Colors.gold : Colors.borderSubtle,
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bgChip, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: Colors.gold, fontWeight: '700', fontSize: 18 }}>{a.full_name[0]}</Text>
                </View>
                <Text style={{ color: Colors.text, fontWeight: '600', fontSize: 15 }}>{a.full_name}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textDim} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 1: Pick service */}
        {step === 1 && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>Select Service</Text>
            {SERVICES.map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => { setService(s); setStep(2) }}
                style={{
                  backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14,
                  borderWidth: 1, borderColor: service === s ? Colors.gold : Colors.borderSubtle,
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <Text style={{ color: Colors.text, fontSize: 15 }}>{s}</Text>
                {service === s && <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 2: Pick date + time */}
        {step === 2 && (
          <View>
            {/* Month navigation */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <TouchableOpacity onPress={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
                else setCalMonth(m => m - 1)
                setSelectedDate(null)
              }}>
                <Ionicons name="chevron-back" size={22} color={Colors.gold} />
              </TouchableOpacity>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16 }}>
                {new Date(calYear, calMonth).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
                else setCalMonth(m => m + 1)
                setSelectedDate(null)
              }}>
                <Ionicons name="chevron-forward" size={22} color={Colors.gold} />
              </TouchableOpacity>
            </View>

            {/* Day grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <View key={d} style={{ width: '13%', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: Colors.textDim, fontSize: 11 }}>{d}</Text>
                </View>
              ))}
              {Array.from({ length: firstDow }).map((_, i) => (
                <View key={`e${i}`} style={{ width: '13%' }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = `${calYear}-${pad(calMonth + 1)}-${pad(day)}`
                const isPast = dateStr < today
                const isSelected = dateStr === selectedDate
                return (
                  <TouchableOpacity
                    key={day}
                    disabled={isPast}
                    onPress={() => setSelectedDate(dateStr)}
                    style={{
                      width: '13%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
                      borderRadius: 999,
                      backgroundColor: isSelected ? Colors.gold : 'transparent',
                    }}
                  >
                    <Text style={{
                      color: isPast ? Colors.textDim : isSelected ? Colors.textOnGold : Colors.text,
                      fontSize: 14, fontWeight: isSelected ? '700' : '400',
                    }}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Time slots */}
            {selectedDate && (
              <>
                <Text style={{ color: Colors.textMuted, fontSize: 13, marginBottom: 10 }}>
                  Available times for {new Date(selectedDate).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                {loadingSlots
                  ? <ActivityIndicator color={Colors.gold} />
                  : slots.length === 0
                  ? <Text style={{ color: Colors.textMuted }}>No availability on this day</Text>
                  : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {slots.map(s => (
                        <TouchableOpacity
                          key={s.value}
                          disabled={s.taken}
                          onPress={() => setSelectedSlot(s.value)}
                          style={{
                            paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
                            backgroundColor: s.taken ? Colors.bgMuted : selectedSlot === s.value ? Colors.gold : Colors.bgCard,
                            borderWidth: 1,
                            borderColor: s.taken ? 'transparent' : selectedSlot === s.value ? Colors.gold : Colors.borderSubtle,
                          }}
                        >
                          <Text style={{
                            color: s.taken ? Colors.textDim : selectedSlot === s.value ? Colors.textOnGold : Colors.text,
                            fontSize: 14, fontWeight: '600',
                          }}>
                            {s.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )
                }
              </>
            )}

            {selectedDate && selectedSlot && (
              <GradientButton
                label="Continue"
                onPress={() => setStep(3)}
                style={{ marginTop: 20 }}
              />
            )}
          </View>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <View style={{ gap: 14 }}>
            <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>Confirm Booking</Text>

            <View style={{ backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.borderGold }}>
              <Row label="Artist" value={selectedArtist?.full_name ?? ''} />
              <Row label="Service" value={service} />
              <Row label="Date" value={selectedDate ? new Date(selectedDate).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''} />
              <Row label="Time" value={selectedSlot ?? ''} />
            </View>

            <TouchableOpacity
              onPress={pickRef}
              style={{
                borderWidth: 1, borderColor: Colors.borderSubtle, borderStyle: 'dashed',
                borderRadius: 12, padding: 14, alignItems: 'center', gap: 6,
              }}
            >
              <Ionicons name="image-outline" size={24} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Add Reference Images ({refs.length}/4)</Text>
            </TouchableOpacity>

            <GradientButton
              label={submitting ? 'Booking…' : isReschedule ? 'Confirm Reschedule' : 'Confirm Booking'}
              onPress={confirm}
              loading={submitting}
            />
          </View>
        )}
      </ScrollView>
    </BrandBackground>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: Colors.textMuted, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: Colors.text, fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' }}>{value}</Text>
    </View>
  )
}
