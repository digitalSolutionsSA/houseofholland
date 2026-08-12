import './ProductCard.css'

export type ProductItem = {
  id: string
  name: string
  price: number
  image_url: string | null
}

export function ProductCard({ product, discount = 0 }: { product: ProductItem; discount?: number }) {
  const hasDiscount = discount > 0
  const discountedPrice = hasDiscount ? product.price * (1 - discount) : product.price

  return (
    <article className="product-card">
      <div className="product-card__media">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} loading="lazy" decoding="async" />
          : <div className="product-card__media-empty" />}
        <span className="product-card__crest" aria-hidden>HH</span>
        {hasDiscount && (
          <span className="product-card__discount-badge">
            -{Math.round(discount * 100)}%
          </span>
        )}
      </div>
      <div className="product-card__meta">
        <h3 className="product-card__name">{product.name}</h3>
        <div className="product-card__price-row">
          {hasDiscount && (
            <span className="product-card__price-original">${Number(product.price).toFixed(2)}</span>
          )}
          <span className={`product-card__price${hasDiscount ? ' product-card__price--discounted' : ''}`}>
            ${Number(discountedPrice).toFixed(2)}
          </span>
        </div>
      </div>
    </article>
  )
}
