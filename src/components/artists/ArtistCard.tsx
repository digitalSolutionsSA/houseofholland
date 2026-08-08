import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import './ArtistCard.css'

export type ArtistSummary = {
  id: string
  slug: string
  name: string
  specialties: string[]
  avatar_url: string | null
}

export function ArtistCard({ artist }: { artist: ArtistSummary }) {
  const isEmpty = !artist.avatar_url

  return (
    <Link
      to={`/artists/${artist.slug}`}
      className={`artist-card${isEmpty ? ' artist-card--placeholder' : ''}`}
    >
      {isEmpty ? (
        <div className="artist-card__avatar artist-card__avatar--empty" aria-hidden />
      ) : (
        <img src={artist.avatar_url!} alt="" className="artist-card__avatar" loading="lazy" decoding="async" />
      )}
      <div className="artist-card__info">
        <h3 className="artist-card__name">{artist.name}</h3>
        <p className="artist-card__specs">{artist.specialties.join(' • ')}</p>
        <span className="artist-card__link">View Work</span>
      </div>
      <ChevronRight className="artist-card__chevron" size={18} strokeWidth={1.5} />
    </Link>
  )
}
