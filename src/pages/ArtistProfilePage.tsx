import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Star, MessageCircle, CalendarDays, X, StarHalf } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './ArtistProfilePage.css'

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.73a4.85 4.85 0 0 1-1.01-.04z" />
    </svg>
  )
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}

type Artist = {
  id: string
  name: string
  slug: string
  specialties: string[]
  bio: string | null
  avatar_url: string | null
  hero_url: string | null
  rating: number
  review_count: number
  instagram_url: string | null
  tiktok_url: string | null
  review_url: string | null
  message_url: string | null
}

type Photo = { id: string; url: string; caption: string | null; style: string | null }

export function ArtistProfilePage() {
  const { artistId } = useParams()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [portfolio, setPortfolio] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<Photo | null>(null)

  useEffect(() => {
    if (!artistId) return
    async function load() {
      const { data: a } = await supabase
        .from('artists')
        .select('id, name, slug, specialties, bio, avatar_url, hero_url, rating, review_count, instagram_url, tiktok_url, review_url, message_url')
        .eq('slug', artistId!)
        .single()

      if (a) {
        setArtist(a)
        const { data: photos } = await supabase
          .from('portfolio_photos')
          .select('id, url, caption, style')
          .eq('artist_id', a.id)
          .order('created_at', { ascending: false })
        setPortfolio(photos ?? [])
      }
      setLoading(false)
    }
    load()
  }, [artistId])

  if (loading) return <div className="page" style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div>
  if (!artist) return <div className="page" style={{ padding: 24, color: 'var(--text-muted)' }}>Artist not found.</div>

  const heroSrc = artist.hero_url || artist.avatar_url || ''

  return (
    <div className="page page--flush artist-profile-page">
      <div className="artist-profile-page__hero">
        {heroSrc && <img src={heroSrc} alt="" className="artist-profile-page__hero-img" loading="eager" fetchPriority="high" decoding="async" />}
        <div className="artist-profile-page__hero-nav">
          <Link to="/artists" className="artist-profile-page__icon-btn" aria-label="Go back">
            <ChevronLeft size={24} strokeWidth={1.5} />
          </Link>
        </div>
        <div className="artist-profile-page__hero-info">
          <h1>{artist.name}</h1>
          <div className="artist-profile-page__specs">
            {artist.specialties.map(s => (
              <span key={s} className="artist-profile-page__spec-tag">{s}</span>
            ))}
          </div>
          {artist.rating > 0 && (
            <p className="artist-profile-page__rating">
              <Star size={14} fill="currentColor" />
              {Number(artist.rating).toFixed(1)} ({artist.review_count} reviews)
            </p>
          )}
        </div>
      </div>

      <div className="artist-profile-page__body">
        {artist.bio && <p className="artist-profile-page__bio">{artist.bio}</p>}

        <div className="artist-profile-page__actions">
          {artist.instagram_url ? (
            <a href={artist.instagram_url} target="_blank" rel="noopener noreferrer">
              <InstagramIcon size={18} />
              Instagram
            </a>
          ) : (
            <button type="button" disabled className="artist-profile-page__action--disabled">
              <InstagramIcon size={18} />
              Instagram
            </button>
          )}
          {artist.tiktok_url ? (
            <a href={artist.tiktok_url} target="_blank" rel="noopener noreferrer">
              <TikTokIcon size={17} />
              TikTok
            </a>
          ) : (
            <button type="button" disabled className="artist-profile-page__action--disabled">
              <TikTokIcon size={17} />
              TikTok
            </button>
          )}
          {artist.message_url ? (
            <a href={artist.message_url} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={18} strokeWidth={1.5} />
              Message
            </a>
          ) : (
            <button type="button" disabled className="artist-profile-page__action--disabled">
              <MessageCircle size={18} strokeWidth={1.5} />
              Message
            </button>
          )}
          {artist.review_url ? (
            <a href={artist.review_url} target="_blank" rel="noopener noreferrer">
              <StarHalf size={18} strokeWidth={1.5} />
              Review
            </a>
          ) : (
            <button type="button" disabled className="artist-profile-page__action--disabled">
              <StarHalf size={18} strokeWidth={1.5} />
              Review
            </button>
          )}
          <Link to={`/bookings/select-time?artist=${artist.id}`}>
            <CalendarDays size={18} strokeWidth={1.5} />
            Book Now
          </Link>
        </div>

        {portfolio.length > 0 && (
          <>
            <h2 className="artist-profile-page__portfolio-title">Portfolio</h2>
            <div className="artist-profile-page__grid">
              {portfolio.map((p) => (
                <img
                  key={p.id}
                  src={p.url}
                  alt={p.caption ?? ''}
                  className="artist-profile-page__grid-img"
                  loading="lazy"
                  decoding="async"
                  onClick={() => setLightbox(p)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {lightbox && (
        <div className="artist-profile-lightbox" onClick={() => setLightbox(null)}>
          <div className="artist-profile-lightbox__inner" onClick={e => e.stopPropagation()}>
            <button
              className="artist-profile-lightbox__close"
              onClick={() => setLightbox(null)}
              aria-label="Close"
            >
              <X size={22} strokeWidth={2} />
            </button>
            <img
              src={lightbox.url}
              alt={lightbox.caption ?? ''}
              className="artist-profile-lightbox__img"
            />
            {(lightbox.style || lightbox.caption) && (
              <div className="artist-profile-lightbox__info">
                {lightbox.style && (
                  <span className="artist-profile-lightbox__style">{lightbox.style}</span>
                )}
                {lightbox.caption && (
                  <p className="artist-profile-lightbox__caption">{lightbox.caption}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
