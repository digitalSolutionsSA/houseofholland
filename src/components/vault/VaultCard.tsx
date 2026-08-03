import './VaultCard.css'

export type VaultEntry = {
  id: string
  title: string
  artist: string
  date: string
  image: string
  price: number | null
}

export function VaultCard({ entry, onClick }: { entry: VaultEntry; onClick: () => void }) {
  return (
    <button type="button" className="vault-card" onClick={onClick}>
      <img src={entry.image} alt="" className="vault-card__thumb" />
      <div className="vault-card__info">
        <h3 className="vault-card__title">{entry.title}</h3>
        <p className="vault-card__artist">By {entry.artist}</p>
        <p className="vault-card__date">{entry.date}</p>
        {entry.price != null && (
          <p className="vault-card__price">R{entry.price.toFixed(2)}</p>
        )}
      </div>
      <span className="vault-card__chevron" aria-hidden>›</span>
    </button>
  )
}
