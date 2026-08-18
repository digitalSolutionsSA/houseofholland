import { useEffect, useRef, useState } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { BrandBackground } from '../../../components/shared/BrandBackground'
import { PageHeader } from '../../../components/shared/PageHeader'
import { Colors } from '../../../constants/colors'

type Message = {
  id: string
  body: string
  sender_id: string
  created_at: string
}

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>()
  const { profile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [partnerName, setPartnerName] = useState('')
  const listRef = useRef<FlatList>(null)

  async function load() {
    const { data } = await supabase
      .from('messages')
      .select('id, body, sender_id, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)

    // Get partner name
    const { data: conv } = await supabase
      .from('conversations')
      .select('artist:artists(full_name), customer:profiles(full_name)')
      .eq('id', conversationId)
      .single()
    if (conv) {
      const artist = Array.isArray(conv.artist) ? conv.artist[0] : conv.artist
      const customer = Array.isArray(conv.customer) ? conv.customer[0] : conv.customer
      setPartnerName(profile?.role === 'public' ? artist?.full_name ?? '' : customer?.full_name ?? '')
    }
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100)
  }, [messages.length])

  async function send() {
    if (!text.trim() || !profile) return
    setSending(true)
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: profile.id,
      body: text.trim(),
    })
    setText('')
    setSending(false)
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <BrandBackground style={{ flex: 1 }}>
      <PageHeader title={partnerName || 'Chat'} showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => {
            const mine = item.sender_id === profile?.id
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <View style={{
                  maxWidth: '78%',
                  backgroundColor: mine ? Colors.gold : Colors.bgCard,
                  borderRadius: 16,
                  borderBottomRightRadius: mine ? 4 : 16,
                  borderBottomLeftRadius: mine ? 16 : 4,
                  padding: 12,
                }}>
                  <Text style={{ color: mine ? Colors.textOnGold : Colors.text, fontSize: 14 }}>
                    {item.body}
                  </Text>
                </View>
                <Text style={{ color: Colors.textDim, fontSize: 10, marginTop: 2 }}>
                  {formatTime(item.created_at)}
                </Text>
              </View>
            )
          }}
        />
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          gap: 8,
          borderTopWidth: 1,
          borderTopColor: Colors.borderSubtle,
          backgroundColor: Colors.bgElevated,
        }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={Colors.textDim}
            multiline
            style={{
              flex: 1,
              backgroundColor: Colors.bgCard,
              color: Colors.text,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 14,
              maxHeight: 100,
            }}
          />
          <TouchableOpacity
            onPress={send}
            disabled={!text.trim() || sending}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: text.trim() ? Colors.gold : Colors.bgChip,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="send" size={18} color={text.trim() ? Colors.textOnGold : Colors.textDim} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </BrandBackground>
  )
}
