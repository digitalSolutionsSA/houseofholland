import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, Modal, TextInput, Alert, Linking, Dimensions,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { awardBonusPoints } from '../../../lib/awardPoints'
import { BrandBackground } from '../../../components/shared/BrandBackground'
import { PageHeader } from '../../../components/shared/PageHeader'
import { GradientButton } from '../../../components/shared/GradientButton'
import { Colors } from '../../../constants/colors'

const { width } = Dimensions.get('window')
const IMG_SIZE = (width - 48) / 3

type Artist = {
  id: string
  full_name: string
  bio: string | null
  avatar_url: string | null
  specialties: string[]
  rating: number | null
  review_count: number
  instagram: string | null
  tiktok: string | null
  profile_id: string
}

type Photo = { id: string; photo_url: string }
type Review = { id: string; rating: number; body: string | null; profile: { full_name: string | null } | null; created_at: string }

export default function ArtistProfileScreen() {
  const { artistId } = useLocalSearchParams<{ artistId: string }>()
  const { profile } = useAuth()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewModal, setReviewModal] = useState(false)
  const [rating, setRating] = useState(5)
  const [reviewBody, setReviewBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [myReview, setMyReview] = useState<Review | null>(null)

  async function load() {
    const [aRes, pRes, rRes] = await Promise.all([
      supabase.from('artists').select('*').eq('id', artistId).single(),
      supabase.from('portfolio_photos').select('id, photo_url').eq('artist_id', artistId).order('created_at', { ascending: false }),
      supabase.from('reviews').select('id, rating, body, created_at, profile:profiles(full_name)').eq('artist_id', artistId).order('created_at', { ascending: false }),
    ])
    setArtist(aRes.data)
    setPhotos(pRes.data ?? [])
    const revs = (rRes.data ?? []).map((r: any) => ({ ...r, profile: Array.isArray(r.profile) ? r.profile[0] : r.profile }))
    setReviews(revs)
    if (profile) setMyReview(revs.find((r: Review) => (r.profile as any)?.id === profile.id) ?? null)
  }

  useEffect(() => { if (artistId) load() }, [artistId])

  async function openChat() {
    if (!profile || !artist) return
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('customer_id', profile.id)
      .eq('artist_id', artist.id)
      .maybeSingle()

    let convId = existing?.id
    if (!convId) {
      const { data: created } = await supabase
        .from('conversations')
        .insert({ customer_id: profile.id, artist_id: artist.id })
        .select('id')
        .single()
      convId = created?.id
    }
    if (convId) router.push(`/(customer)/messages/${convId}`)
  }

  async function submitReview() {
    if (!profile || !artist) return
    setSubmitting(true)
    const { error } = await supabase.from('reviews').upsert({
      artist_id: artist.id,
      profile_id: profile.id,
      rating,
      body: reviewBody.trim() || null,
    }, { onConflict: 'artist_id,profile_id' })
    if (!error && !myReview) {
      await awardBonusPoints(profile.id, 15, 'review', artist.profile_id)
    }
    setSubmitting(false)
    setReviewModal(false)
    load()
  }

  if (!artist) return (
    <BrandBackground>
      <PageHeader title="Artist" showBack />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.textMuted }}>Loading…</Text>
      </View>
    </BrandBackground>
  )

  return (
    <BrandBackground>
      <ScrollView>
        {/* Hero */}
        <View style={{ position: 'relative' }}>
          {artist.avatar_url
            ? <Image source={{ uri: artist.avatar_url }} style={{ width, height: 280, resizeMode: 'cover' }} />
            : <View style={{ width, height: 280, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: Colors.gold, fontSize: 64, fontWeight: '700' }}>{artist.full_name[0]}</Text>
              </View>
          }
          <View style={{ position: 'absolute', top: 48, left: 16 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8 }}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ padding: 18 }}>
          {/* Name + rating */}
          <Text style={{ color: Colors.text, fontSize: 24, fontWeight: '800', marginBottom: 4 }}>
            {artist.full_name}
          </Text>
          {artist.rating != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              {[1,2,3,4,5].map(i => (
                <Ionicons key={i} name={i <= Math.round(artist.rating!) ? 'star' : 'star-outline'} size={16} color={Colors.gold} />
              ))}
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>({artist.review_count} reviews)</Text>
            </View>
          )}

          {/* Specialties */}
          {artist.specialties?.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {artist.specialties.map(s => (
                <View key={s} style={{
                  paddingHorizontal: 10, paddingVertical: 4,
                  backgroundColor: Colors.bgChip, borderRadius: 999,
                }}>
                  <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{s}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bio */}
          {artist.bio && (
            <Text style={{ color: Colors.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 18 }}>
              {artist.bio}
            </Text>
          )}

          {/* Social links */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            {artist.instagram && (
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://instagram.com/${artist.instagram}`)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: Colors.bgChip, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                }}
              >
                <Ionicons name="logo-instagram" size={16} color='#E1306C' />
                <Text style={{ color: Colors.text, fontSize: 13 }}>@{artist.instagram}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={openChat}
              style={{
                flex: 1, borderWidth: 1, borderColor: Colors.borderGold,
                borderRadius: 12, padding: 12, alignItems: 'center',
                flexDirection: 'row', justifyContent: 'center', gap: 6,
              }}
            >
              <Ionicons name="chatbubble-outline" size={18} color={Colors.gold} />
              <Text style={{ color: Colors.gold, fontWeight: '700' }}>Message</Text>
            </TouchableOpacity>
            <GradientButton
              label="Book Now"
              onPress={() => router.push(`/(customer)/bookings/select-time?artist=${artist.id}`)}
              style={{ flex: 1 }}
            />
          </View>

          {/* Portfolio grid */}
          {photos.length > 0 && (
            <>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 18, marginBottom: 12 }}>Portfolio</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 24 }}>
                {photos.map(p => (
                  <Image key={p.id} source={{ uri: p.photo_url }} style={{ width: IMG_SIZE, height: IMG_SIZE, borderRadius: 8 }} />
                ))}
              </View>
            </>
          )}

          {/* Reviews */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 18 }}>Reviews</Text>
            <TouchableOpacity onPress={() => setReviewModal(true)}>
              <Text style={{ color: Colors.gold, fontSize: 14, fontWeight: '600' }}>
                {myReview ? 'Edit Review' : '+ Review'}
              </Text>
            </TouchableOpacity>
          </View>
          {reviews.map(r => (
            <View key={r.id} style={{
              backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, marginBottom: 8,
              borderWidth: 1, borderColor: Colors.borderSubtle,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: Colors.text, fontWeight: '600' }}>{r.profile?.full_name ?? 'Anonymous'}</Text>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[1,2,3,4,5].map(i => (
                    <Ionicons key={i} name={i <= r.rating ? 'star' : 'star-outline'} size={12} color={Colors.gold} />
                  ))}
                </View>
              </View>
              {r.body && <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{r.body}</Text>}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Review modal */}
      <Modal visible={reviewModal} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ backgroundColor: Colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
              {myReview ? 'Edit Your Review' : 'Leave a Review'}
            </Text>
            <Text style={{ color: Colors.textMuted, marginBottom: 8 }}>Rating</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[1,2,3,4,5].map(i => (
                <TouchableOpacity key={i} onPress={() => setRating(i)}>
                  <Ionicons name={i <= rating ? 'star' : 'star-outline'} size={32} color={Colors.gold} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="Share your experience (optional)"
              placeholderTextColor={Colors.textDim}
              value={reviewBody}
              onChangeText={setReviewBody}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: Colors.bgCard, color: Colors.text, borderRadius: 12,
                padding: 14, fontSize: 14, textAlignVertical: 'top', marginBottom: 16,
                borderWidth: 1, borderColor: Colors.borderSubtle,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setReviewModal(false)}
                style={{ flex: 1, borderWidth: 1, borderColor: Colors.borderSubtle, borderRadius: 12, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: Colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <GradientButton label={submitting ? 'Submitting…' : 'Submit'} onPress={submitReview} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </BrandBackground>
  )
}
