import { useEffect, useMemo, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { CategoryChips } from '../components/shared/CategoryChips'
import { ProductCard } from '../components/merch/ProductCard'
import { supabase } from '../lib/supabase'
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
      {loading && <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>No items available yet.</p>
      )}
      <div className="merch-page__grid">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
