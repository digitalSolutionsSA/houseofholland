import './ProductCard.css'

export type ProductItem = {
  id: string
  name: string
  price: number
  image_url: string | null
}

export function ProductCard({ product }: { product: ProductItem }) {
  return (
    <article className="product-card">
      <div className="product-card__media">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} loading="lazy" decoding="async" />
          : <div className="product-card__media-empty" />}
        <span className="product-card__crest" aria-hidden>HH</span>
      </div>
      <div className="product-card__meta">
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__price">${Number(product.price).toFixed(2)}</p>
      </div>
    </article>
  )
}
