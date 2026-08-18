import { useEffect, useState } from 'react'
import { View, Text, FlatList, Image, RefreshControl, Dimensions } from 'react-native'
import { useMembership } from '../../hooks/useMembership'
import { supabase } from '../../lib/supabase'
import { BrandBackground } from '../../components/shared/BrandBackground'
import { PageHeader } from '../../components/shared/PageHeader'
import { CategoryChips } from '../../components/shared/CategoryChips'
import { Colors } from '../../constants/colors'

type Product = {
  id: string
  name: string
  price: number
  category: string
  image_url: string | null
  stock: number
}

const { width } = Dimensions.get('window')
const CARD = (width - 48) / 2

const ALL = 'All'

export default function MerchScreen() {
  const { shopDiscount, tier } = useMembership()
  const [products, setProducts] = useState<Product[]>([])
  const [filtered, setFiltered] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([ALL])
  const [selected, setSelected] = useState(ALL)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('merch')
      .select('id, name, price, category, image_url, stock')
      .eq('is_active', true)
      .order('name')
    const prods = data ?? []
    setProducts(prods)
    const cats = [ALL, ...Array.from(new Set(prods.map((p: Product) => p.category).filter(Boolean)))]
    setCategories(cats)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    setFiltered(selected === ALL ? products : products.filter(p => p.category === selected))
  }, [products, selected])

  function discountedPrice(price: number) {
    return (price * (1 - shopDiscount)).toFixed(2)
  }

  const TIER_LABEL: Record<string, string | null> = {
    free: null,
    premium: '7.5% off',
    'black-card': '15% off',
  }

  return (
    <BrandBackground>
      <PageHeader title="Merch Shop" />

      {shopDiscount > 0 && (
        <View style={{
          marginHorizontal: 16, marginTop: 8, marginBottom: 4,
          backgroundColor: 'rgba(212,175,55,0.15)', borderRadius: 12, padding: 10,
          flexDirection: 'row', alignItems: 'center', gap: 8,
          borderWidth: 1, borderColor: Colors.borderGold,
        }}>
          <Text style={{ color: Colors.gold, fontWeight: '700', fontSize: 13 }}>
            🎉 {TIER_LABEL[tier]} discount applied to your cart
          </Text>
        </View>
      )}

      <View style={{ marginVertical: 10 }}>
        <CategoryChips options={categories} selected={selected} onSelect={setSelected} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} tintColor={Colors.gold} />}
        renderItem={({ item }) => (
          <View style={{
            width: CARD, backgroundColor: Colors.bgCard,
            borderRadius: 14, overflow: 'hidden',
            borderWidth: 1, borderColor: Colors.borderSubtle,
          }}>
            {item.image_url
              ? <Image source={{ uri: item.image_url }} style={{ width: CARD, height: CARD, resizeMode: 'cover' }} />
              : <View style={{ width: CARD, height: CARD, backgroundColor: Colors.bgChip, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: Colors.textDim, fontSize: 36 }}>👕</Text>
                </View>
            }
            <View style={{ padding: 10 }}>
              <Text numberOfLines={2} style={{ color: Colors.text, fontWeight: '600', fontSize: 13, marginBottom: 4 }}>
                {item.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: Colors.gold, fontWeight: '800', fontSize: 15 }}>
                  R{discountedPrice(item.price)}
                </Text>
                {shopDiscount > 0 && (
                  <Text style={{ color: Colors.textDim, fontSize: 11, textDecorationLine: 'line-through' }}>
                    R{item.price.toFixed(2)}
                  </Text>
                )}
              </View>
              {item.stock === 0 && (
                <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>Out of stock</Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ color: Colors.textMuted }}>No products available</Text>
          </View>
        )}
      />
    </BrandBackground>
  )
}
