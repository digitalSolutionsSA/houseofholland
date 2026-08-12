import { useEffect, useMemo, useState } from 'react'
import { ShoppingCart, Tag } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { CategoryChips } from '../components/shared/CategoryChips'
import { ProductCard } from '../components/merch/ProductCard'
import { supabase } from '../lib/supabase'
import { useMembership } from '../hooks/useMembership'
import './MerchPage.css'

type Product = {
  id: string
  name: string
  price: number
  category: string
  image_url: string | null
  stock: number
}

const ALL = 'All'

export function MerchPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState(ALL)
  const { shopDiscount, tier } = useMembership()

  useEffect(() => {
    supabase
      .from('merch')
      .select('id, name, price, category, image_url, stock')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => { setProducts(data ?? []); setLoading(false) })
  }, [])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category))).sort()
    return [ALL, ...cats]
  }, [products])

  const filtered = useMemo(() =>
    category === ALL ? products : products.filter(p => p.category === category),
    [products, category]
  )

  const discountLabel =
    tier === 'black-card' ? '15% member discount applied'
    : tier === 'premium'  ? '7.5% member discount applied'
    : null

  return (
    <div className="page merch-page">
      <PageHeader
        title="Merch"
        rightAction={
          <button type="button" className="merch-page__cart" aria-label="Cart">
            <ShoppingCart size={22} strokeWidth={1.5} />
          </button>
        }
      />
      <CategoryChips items={categories} active={category} onChange={setCategory} />

      {discountLabel && (
        <div className="merch-page__discount-banner">
          <Tag size={13} strokeWidth={2} />
          <span>{discountLabel}</span>
        </div>
      )}

      {loading && <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>No items available yet.</p>
      )}
      <div className="merch-page__grid">
        {filtered.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            discount={shopDiscount}
          />
        ))}
      </div>
    </div>
  )
}
