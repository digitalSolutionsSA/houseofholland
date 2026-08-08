import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Star, Camera, MessageCircle, CalendarDays, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './ArtistProfilePage.css'

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
        .select('*')
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
        {heroSrc && <img src={heroSrc} alt="" className="artist-profile-page__hero-img" />}
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
          <button type="button">
            <Camera size={18} strokeWidth={1.5} />
            Instagram
          </button>
          <button type="button">
            <MessageCircle size={18} strokeWidth={1.5} />
            Message
          </button>
          <Link to={artist ? `/bookings/select-time?artist=${artist.id}` : '/bookings/select-time'}>
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
