import { Link } from 'react-router-dom'
import { ChevronRight, Star } from 'lucide-react'
import './ArtistCard.css'

export type ArtistSummary = {
  id: string
  slug: string
  name: string
  specialties: string[]
  avatar_url: string | null
  rating: number
  review_count: number
}

const MAX_TAGS = 3

export function ArtistCard({ artist }: { artist: ArtistSummary }) {
  const tags = artist.specialties.slice(0, MAX_TAGS)
  const initials = artist.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const hasRating = artist.review_count > 0

  return (
    <Link to={`/artists/${artist.slug}`} className="artist-card">
      {artist.avatar_url ? (
        <img
          src={artist.avatar_url}
          alt={artist.name}
          className="artist-card__photo"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="artist-card__photo--empty" aria-hidden>
          <span className="artist-card__initials">{initials}</span>
        </div>
      )}

      <div className="artist-card__info">
        <h3 className="artist-card__name">{artist.name}</h3>

        {hasRating && (
          <div className="artist-card__rating">
            <Star size={11} fill="currentColor" strokeWidth={0} />
            <span className="artist-card__rating-score">{artist.rating.toFixed(1)}</span>
            <span className="artist-card__rating-count">({artist.review_count})</span>
          </div>
        )}

        {tags.length > 0 && (
          <div className="artist-card__tags">
            {tags.map(t => (
              <span key={t} className="artist-card__tag">{t}</span>
            ))}
          </div>
        )}
        <span className="artist-card__footer">
          View Work <ChevronRight size={13} strokeWidth={2} />
        </span>
      </div>
    </Link>
  )
}
