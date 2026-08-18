import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { useMembership } from '../../../hooks/useMembership'
import { awardBonusPoints } from '../../../lib/awardPoints'
import { BrandBackground } from '../../../components/shared/BrandBackground'
import { PageHeader } from '../../../components/shared/PageHeader'
import { GradientButton } from '../../../components/shared/GradientButton'
import { Colors } from '../../../constants/colors'

type FlashEvent = {
  id: string
  title: string
  event_date: string
  status: string
  max_spots: number
  cover_image_url: string | null
  description: string | null
}

export default function FlashEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>()
  const { profile } = useAuth()
  const { flashNoticeDays, tier } = useMembership()
  const [event, setEvent] = useState<FlashEvent | null>(null)
  const [spotsLeft, setSpotsLeft] = useState(0)
  const [myReservation, setMyReservation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [artists, setArtists] = useState<{ full_name: string }[]>([])

  async function load() {
    if (!profile) return
    const [evRes, countRes, myRes, artRes] = await Promise.all([
      supabase.from('flash_events').select('*').eq('id', eventId).single(),
      supabase.from('flash_reservations').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
      supabase.from('flash_reservations').select('id').eq('event_id', eventId).eq('profile_id', profile.id).maybeSingle(),
      supabase.from('flash_event_artists').select('artist:artists(full_name)').eq('event_id', eventId),
    ])
    setEvent(evRes.data)
    const taken = countRes.count ?? 0
    setSpotsLeft(Math.max(0, (evRes.data?.max_spots ?? 0) - taken))
    setMyReservation(myRes.data?.id ?? null)
    setArtists(artRes.data?.map((r: any) => Array.isArray(r.artist) ? r.artist[0] : r.artist).filter(Boolean) ?? [])
  }

  useEffect(() => { load() }, [eventId, profile])

  function canJoin(): { ok: boolean; reason?: string } {
    if (!event) return { ok: false }
    const daysUntil = Math.ceil((new Date(event.event_date).getTime() - Date.now()) / 86400000)
    if (tier === 'free' && daysUntil > 0) return { ok: false, reason: 'Free members can only join on the day of the event. Upgrade for early access.' }
    if (tier === 'premium' && daysUntil > 2) return { ok: false, reason: 'Premium members get 2-day early access. Upgrade to Black Card for 7-day early access.' }
    if (spotsLeft === 0 && !myReservation) return { ok: false, reason: 'This event is full.' }
    return { ok: true }
  }

  async function joinQueue() {
    if (!profile || !event) return
    const { ok, reason } = canJoin()
    if (!ok) { Alert.alert('Access Restricted', reason); return }
    setLoading(true)
    const { error } = await supabase.from('flash_reservations').insert({
      event_id: event.id,
      profile_id: profile.id,
    })
    if (!error) {
      // Award points for premium+ members
      if (tier !== 'free') {
        const { data: existing } = await supabase
          .from('loyalty_points')
          .select('id')
          .eq('profile_id', profile.id)
          .eq('reason', 'flash_day')
          .eq('season', 'S1-2025')
          .maybeSingle()
        if (!existing) await awardBonusPoints(profile.id, 25, 'flash_day', event.id)
      }
      await load()
    }
    setLoading(false)
  }

  async function leaveQueue() {
    if (!myReservation) return
    Alert.alert('Leave Queue', 'Are you sure?', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          setLoading(true)
          await supabase.from('flash_reservations').delete().eq('id', myReservation)
          await load()
          setLoading(false)
        },
      },
    ])
  }

  if (!event) return (
    <BrandBackground>
      <PageHeader title="Flash Event" showBack />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.textMuted }}>Loading…</Text>
      </View>
    </BrandBackground>
  )

  const { ok: joinable, reason: joinReason } = canJoin()
  const spotsPercent = event.max_spots ? (spotsLeft / event.max_spots) : 1

  return (
    <BrandBackground>
      <PageHeader title="Flash Event" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {event.cover_image_url && (
          <Image source={{ uri: event.cover_image_url }} style={{ width: '100%', height: 220, resizeMode: 'cover' }} />
        )}
        <View style={{ padding: 18 }}>
          <Text style={{ color: Colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
            ⚡ FLASH EVENT
          </Text>
          <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '800', marginTop: 4, marginBottom: 8 }}>
            {event.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
            <Text style={{ color: Colors.textMuted, fontSize: 14 }}>
              {new Date(event.event_date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          {/* Spots bar */}
          {event.max_spots > 0 && (
            <View style={{ marginVertical: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Spots remaining</Text>
                <Text style={{ color: spotsLeft === 0 ? '#ef4444' : Colors.gold, fontWeight: '700', fontSize: 13 }}>
                  {spotsLeft} / {event.max_spots}
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: Colors.bgChip, borderRadius: 3 }}>
                <View style={{
                  height: 6, borderRadius: 3,
                  backgroundColor: spotsLeft === 0 ? '#ef4444' : Colors.gold,
                  width: `${spotsPercent * 100}%`,
                }} />
              </View>
            </View>
          )}

          {event.description && (
            <Text style={{ color: Colors.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 18 }}>
              {event.description}
            </Text>
          )}

          {/* Artists */}
          {artists.length > 0 && (
            <View style={{ marginBottom: 18 }}>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Participating Artists</Text>
              {artists.map((a, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold }} />
                  <Text style={{ color: Colors.text, fontSize: 14 }}>{a.full_name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Access tier info */}
          {!joinable && joinReason && (
            <View style={{
              backgroundColor: 'rgba(212,175,55,0.1)', borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: Colors.borderGold, marginBottom: 16,
              flexDirection: 'row', gap: 10,
            }}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.gold} />
              <Text style={{ color: Colors.gold, fontSize: 13, flex: 1 }}>{joinReason}</Text>
            </View>
          )}

          {/* Join / Leave */}
          {myReservation ? (
            <View style={{ gap: 10 }}>
              <View style={{
                backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: 'rgba(74,222,128,0.4)',
                flexDirection: 'row', alignItems: 'center', gap: 8,
              }}>
                <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
                <Text style={{ color: '#4ade80', fontWeight: '700', fontSize: 14 }}>You're in the queue!</Text>
              </View>
              <TouchableOpacity
                onPress={leaveQueue}
                disabled={loading}
                style={{
                  borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
                  borderRadius: 12, padding: 14, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#ef4444', fontWeight: '600' }}>Leave Queue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <GradientButton
              label={loading ? 'Joining…' : 'Join Queue'}
              onPress={joinQueue}
              disabled={!joinable || loading}
              loading={loading}
            />
          )}
        </View>
      </ScrollView>
    </BrandBackground>
  )
}
