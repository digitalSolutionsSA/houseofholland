import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Star, MessageCircle, CalendarDays, X, StarHalf } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { awardBonusPoints } from '../lib/awardPoints'
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

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="review-star-row" role="radiogroup" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`review-star-btn${(hovered || value) >= n ? ' review-star-btn--active' : ''}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star size={32} fill={(hovered || value) >= n ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </button>
      ))}
    </div>
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
  profile_id: string | null
}

type Photo = { id: string; url: string; caption: string | null; style: string | null }

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  profiles: { full_name: string | null } | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="review-display-stars">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={13} fill={rating >= n ? 'currentColor' : 'none'} strokeWidth={1.5} />
      ))}
    </span>
  )
}

export function ArtistProfilePage() {
  const { artistId } = useParams()
  const { user, profile: authProfile } = useAuth()
  const navigate = useNavigate()

  const [artist, setArtist] = useState<Artist | null>(null)
  const [portfolio, setPortfolio] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<Photo | null>(null)

  // Review state
  const [reviews, setReviews] = useState<Review[]>([])
  const [myReview, setMyReview] = useState<Review | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)

  useEffect(() => {
    if (!artistId) return
    async function load() {
      const { data: a } = await supabase
        .from('artists')
        .select('id, name, slug, specialties, bio, avatar_url, hero_url, rating, review_count, instagram_url, tiktok_url, review_url, message_url, profile_id')
        .eq('slug', artistId!)
        .single()

      if (a) {
        setArtist(a)
        const [{ data: photos }, { data: reviewData }] = await Promise.all([
          supabase
            .from('portfolio_photos')
            .select('id, url, caption, style')
            .eq('artist_id', a.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('reviews')
            .select('id, rating, comment, created_at, profiles(full_name)')
            .eq('artist_id', a.id)
            .order('created_at', { ascending: false }),
        ])
        setPortfolio(photos ?? [])
        const allReviews = (reviewData ?? []) as Review[]
        setReviews(allReviews)
        if (user) {
          const { data: myR } = await supabase
            .from('reviews')
            .select('id, rating, comment, created_at, profiles(full_name)')
            .eq('artist_id', a.id)
            .eq('profile_id', user.id)
            .maybeSingle()
          if (myR) {
            setMyReview(myR as Review)
            setReviewRating((myR as Review).rating)
            setReviewComment((myR as Review).comment ?? '')
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [artistId, user])

  async function handleReviewSubmit() {
    if (!artist || !user) return
    if (reviewRating === 0) { setReviewError('Please select a star rating.'); return }
    setReviewSubmitting(true)
    setReviewError('')

    const payload = {
      artist_id: artist.id,
      profile_id: user.id,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    }

    const isEdit = !!myReview
    let error: { message: string } | null = null

    if (isEdit) {
      const res = await supabase
        .from('reviews')
        .update({ rating: payload.rating, comment: payload.comment })
        .eq('id', myReview!.id)
      error = res.error
    } else {
      const res = await supabase.from('reviews').insert(payload)
      error = res.error
      // Award 15 points for first-time review
      if (!res.error && authProfile) {
        await awardBonusPoints({
          profileId: user.id,
          points: 15,
          reason: 'review',
          note: `Review for ${artist.name}`,
          awardedBy: user.id,
        })
      }
    }

    if (error) {
      setReviewError(error.message)
      setReviewSubmitting(false)
      return
    }

    // Reload artist + reviews
    const [{ data: updatedArtist }, { data: updatedReviews }] = await Promise.all([
      supabase
        .from('artists')
        .select('id, name, slug, specialties, bio, avatar_url, hero_url, rating, review_count, instagram_url, tiktok_url, review_url, message_url, profile_id')
        .eq('id', artist.id)
        .single(),
      supabase
        .from('reviews')
        .select('id, rating, comment, created_at, profiles(full_name)')
        .eq('artist_id', artist.id)
        .order('created_at', { ascending: false }),
    ])
    if (updatedArtist) setArtist(updatedArtist)
    const allReviews = (updatedReviews ?? []) as Review[]
    setReviews(allReviews)

    const { data: myR } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, profiles(full_name)')
      .eq('artist_id', artist.id)
      .eq('profile_id', user.id)
      .maybeSingle()
    if (myR) setMyReview(myR as Review)

    setReviewSuccess(true)
    setReviewSubmitting(false)
    setTimeout(() => {
      setShowReviewModal(false)
      setReviewSuccess(false)
    }, 1600)
  }

  async function openChat() {
    if (!user || !artist) return
    // Don't let the artist message themselves
    if (artist.profile_id === user.id) return

    // Find or create conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('customer_id', user.id)
      .eq('artist_id', artist.id)
      .maybeSingle()

    if (existing) {
      navigate(`/messages/${existing.id}`)
      return
    }

    const { data: created } = await supabase
      .from('conversations')
      .insert({ customer_id: user.id, artist_id: artist.id })
      .select('id')
      .single()

    if (created) navigate(`/messages/${created.id}`)
  }

  function openReviewModal() {
    setReviewError('')
    setReviewSuccess(false)
    setShowReviewModal(true)
  }

  if (loading) return <div className="page" style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div>
  if (!artist) return <div className="page" style={{ padding: 24, color: 'var(--text-muted)' }}>Artist not found.</div>

  const heroSrc = artist.hero_url || artist.avatar_url || ''
  const previewReviews = reviews.slice(0, 2)

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
              {Number(artist.rating).toFixed(1)} ({artist.review_count} {artist.review_count === 1 ? 'review' : 'reviews'})
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
          {artist.profile_id !== user?.id ? (
            <button type="button" onClick={openChat}>
              <MessageCircle size={18} strokeWidth={1.5} />
              Message
            </button>
          ) : (
            <button type="button" disabled className="artist-profile-page__action--disabled">
              <MessageCircle size={18} strokeWidth={1.5} />
              Message
            </button>
          )}
          <button type="button" onClick={openReviewModal}>
            <StarHalf size={18} strokeWidth={1.5} />
            {myReview ? 'Edit Review' : 'Review'}
          </button>
          <Link to={`/bookings/select-time?artist=${artist.id}`}>
            <CalendarDays size={18} strokeWidth={1.5} />
            Book Now
          </Link>
        </div>

        {/* ── Reviews section ── */}
        {reviews.length > 0 && (
          <div className="artist-reviews-section">
            <div className="artist-reviews-section__header">
              <h2 className="artist-reviews-section__title">
                <Star size={16} fill="currentColor" />
                Reviews
              </h2>
              <button
                type="button"
                className="artist-reviews-section__read-btn"
                onClick={() => setShowReviewsModal(true)}
              >
                Read all {reviews.length}
              </button>
            </div>
            <div className="artist-reviews-section__preview">
              {previewReviews.map(r => (
                <div key={r.id} className="artist-review-card">
                  <div className="artist-review-card__top">
                    <ReviewStars rating={r.rating} />
                    <span className="artist-review-card__date">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="artist-review-card__author">
                    {r.profiles?.full_name ?? 'Anonymous'}
                  </p>
                  {r.comment && (
                    <p className="artist-review-card__comment">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
            {reviews.length > 2 && (
              <button
                type="button"
                className="artist-reviews-section__more-btn"
                onClick={() => setShowReviewsModal(true)}
              >
                Read all {reviews.length} reviews
              </button>
            )}
          </div>
        )}

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

      {/* ── Lightbox ── */}
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

      {/* ── Review submission modal ── */}
      {showReviewModal && (
        <div className="review-modal-backdrop" onClick={() => setShowReviewModal(false)}>
          <div className="review-modal" onClick={e => e.stopPropagation()}>
            <button className="review-modal__close" onClick={() => setShowReviewModal(false)} aria-label="Close">
              <X size={20} strokeWidth={2} />
            </button>
            <h2 className="review-modal__title">{myReview ? 'Edit your review' : `Review ${artist.name}`}</h2>
            <p className="review-modal__subtitle">How was your experience?</p>

            {reviewSuccess ? (
              <div className="review-modal__success">
                <Star size={36} fill="currentColor" />
                <p>Thank you for your review!</p>
                {!myReview && <p className="review-modal__points">+15 loyalty points awarded</p>}
              </div>
            ) : (
              <>
                <StarRating value={reviewRating} onChange={setReviewRating} />
                <textarea
                  className="review-modal__textarea"
                  placeholder="Share your experience (optional)…"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <p className="review-modal__char-count">{reviewComment.length}/500</p>
                {reviewError && <p className="review-modal__error">{reviewError}</p>}
                <button
                  className="review-modal__submit"
                  onClick={handleReviewSubmit}
                  disabled={reviewSubmitting || reviewRating === 0}
                >
                  {reviewSubmitting ? 'Submitting…' : myReview ? 'Update review' : 'Submit review'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── All reviews modal ── */}
      {showReviewsModal && (
        <div className="review-modal-backdrop" onClick={() => setShowReviewsModal(false)}>
          <div className="review-modal review-modal--list" onClick={e => e.stopPropagation()}>
            <button className="review-modal__close" onClick={() => setShowReviewsModal(false)} aria-label="Close">
              <X size={20} strokeWidth={2} />
            </button>
            <h2 className="review-modal__title">
              <Star size={18} fill="currentColor" style={{ color: 'var(--gold)' }} />
              {Number(artist.rating).toFixed(1)} · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </h2>
            <div className="review-modal__list">
              {reviews.map(r => (
                <div key={r.id} className="artist-review-card artist-review-card--full">
                  <div className="artist-review-card__top">
                    <ReviewStars rating={r.rating} />
                    <span className="artist-review-card__date">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="artist-review-card__author">{r.profiles?.full_name ?? 'Anonymous'}</p>
                  {r.comment && <p className="artist-review-card__comment">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
