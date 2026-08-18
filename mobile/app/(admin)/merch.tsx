import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch, Image, RefreshControl } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { InputField } from '../../components/shared/InputField'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

type MerchItem = { id: string; name: string; price: number; category: string; is_available: boolean; image_url: string | null; description: string | null }

export default function AdminMerchScreen() {
  const [items, setItems] = useState<MerchItem[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('clothing')
  const [description, setDescription] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase.from('merch_items').select('*').order('created_at', { ascending: false })
    setItems(data ?? [])
  }

  useEffect(() => { load() }, [])
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false) }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images })
    if (!result.canceled) setImageUri(result.assets[0].uri)
  }

  async function save() {
    if (!name.trim() || !price) { Alert.alert('Name and price required'); return }
    setSaving(true)
    let imageUrl: string | null = null
    if (imageUri) {
      const ext = imageUri.split('.').pop() ?? 'jpg'
      const path = `merch/${Date.now()}.${ext}`
      const res = await fetch(imageUri)
      const blob = await res.blob()
      await supabase.storage.from('merch').upload(path, blob, { contentType: `image/${ext}` })
      const { data } = supabase.storage.from('merch').getPublicUrl(path)
      imageUrl = data.publicUrl
    }
    await supabase.from('merch_items').insert({
      name, price: parseFloat(price), category, description: description || null, image_url: imageUrl, is_available: true,
    })
    setSaving(false); setAdding(false); setName(''); setPrice(''); setDescription(''); setImageUri(null)
    load()
  }

  async function toggleAvailable(item: MerchItem) {
    await supabase.from('merch_items').update({ is_available: !item.is_available }).eq('id', item.id)
    load()
  }

  async function deleteItem(item: MerchItem) {
    Alert.alert('Delete', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('merch_items').delete().eq('id', item.id); load() } },
    ])
  }

  const CATEGORIES = ['clothing', 'accessories', 'prints', 'aftercare', 'other']

  return (
    <BrandBackground>
      <PageHeader title="Merch" showBack />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
      >
        {adding ? (
          <View style={{ backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.borderGold }}>
            <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>New Product</Text>
            <InputField label="Name" value={name} onChangeText={setName} placeholder="Product name" />
            <InputField label="Price (R)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="e.g. 299" />
            <InputField label="Description" value={description} onChangeText={setDescription} placeholder="Optional description" />

            <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} onPress={() => setCategory(c)} style={{
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                  backgroundColor: category === c ? Colors.gold : Colors.bgChip,
                  borderWidth: 1, borderColor: category === c ? Colors.gold : Colors.borderSubtle,
                }}>
                  <Text style={{ color: category === c ? Colors.textOnGold : Colors.textMuted, fontSize: 13, textTransform: 'capitalize' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={pickImage}
              style={{
                height: 70, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed',
                borderColor: imageUri ? Colors.gold : Colors.borderSubtle,
                alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 14,
              }}
            >
              <Ionicons name={imageUri ? 'checkmark-circle' : 'image-outline'} size={22} color={imageUri ? Colors.gold : Colors.textDim} />
              <Text style={{ color: imageUri ? Colors.gold : Colors.textMuted, fontSize: 13 }}>
                {imageUri ? 'Image selected' : 'Pick image'}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setAdding(false)} style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderSubtle, alignItems: 'center' }}>
                <Text style={{ color: Colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <GradientButton label={saving ? 'Saving…' : 'Add Product'} onPress={save} loading={saving} />
              </View>
            </View>
          </View>
        ) : (
          <GradientButton label="Add Product" onPress={() => setAdding(true)} style={{ marginBottom: 16 }} />
        )}

        <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Products ({items.length})</Text>
        {items.map(item => (
          <View key={item.id} style={{
            backgroundColor: Colors.bgCard, borderRadius: 14, padding: 12, marginBottom: 10,
            borderWidth: 1, borderColor: Colors.borderSubtle,
            flexDirection: 'row', alignItems: 'center', gap: 12,
          }}>
            {item.image_url
              ? <Image source={{ uri: item.image_url }} style={{ width: 52, height: 52, borderRadius: 8 }} />
              : <View style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: Colors.bgChip, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="shirt-outline" size={22} color={Colors.textDim} />
                </View>
            }
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 13 }}>{item.name}</Text>
              <Text style={{ color: Colors.gold, fontWeight: '700', fontSize: 13 }}>R{item.price.toFixed(2)}</Text>
              <Text style={{ color: Colors.textDim, fontSize: 11, textTransform: 'capitalize' }}>{item.category}</Text>
            </View>
            <View style={{ gap: 8, alignItems: 'flex-end' }}>
              <Switch value={item.is_available} onValueChange={() => toggleAvailable(item)} thumbColor={Colors.gold} trackColor={{ true: Colors.borderGold, false: Colors.bgChip }} />
              <TouchableOpacity onPress={() => deleteItem(item)}>
                <Ionicons name="trash-outline" size={16} color={Colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </BrandBackground>
  )
}
