import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import './VaultCard.css'

export type VaultEntry = {
  id: string
  title: string
  artist: string
  date: string
  image: string
}

export function VaultCard({ entry }: { entry: VaultEntry }) {
  return (
    <Link to={`/vault/${entry.id}`} className="vault-card">
      <img src={entry.image} alt="" className="vault-card__thumb" />
      <div className="vault-card__info">
        <h3 className="vault-card__title">{entry.title}</h3>
        <p className="vault-card__artist">By {entry.artist}</p>
        <p className="vault-card__date">{entry.date}</p>
      </div>
      <ChevronRight className="vault-card__chevron" size={18} strokeWidth={1.5} />
    </Link>
  )
}
