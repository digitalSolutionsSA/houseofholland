import { useEffect, useMemo, useState } from 'react'
import { Info, Search, X, Mail, MessageCircle, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/shared/PageHeader'
import { CategoryChips } from '../components/shared/CategoryChips'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { openSupportChat, SUPPORT_EMAIL } from '../lib/support'
import { TATTOO_STYLES, isPredefined } from '../lib/tattooStyles'
import './ArtistsPage.css'

type Artist = {
  id: string
  name: string
  slug: string
  specialties: string[]
  avatar_url: string | null
  rating: number
  review_count: number
  bio: string | null
}

const ALL_FILTER = 'All'
const OTHER_FILTER = 'Other'
const STYLE_FILTERS = [ALL_FILTER, ...TATTOO_STYLES, OTHER_FILTER]

type FaqItem = { q: string; a: string }

const FAQ: FaqItem[] = [
  {
    q: 'How do I book an appointment?',
    a: 'Tap the Bookings tab in the navigation bar. Choose your preferred artist, select a date and time slot, and confirm your booking. You\'ll receive a confirmation and reminder.',
  },
  {
    q: 'Can I message an artist before booking?',
    a: 'Yes! Open any artist\'s profile and tap the Message button. You can ask about style, pricing, availability, or anything else before committing.',
  },
  {
    q: 'What tattoo styles are available?',
    a: 'Our artists cover a wide range — Black & Grey, Realism, American Traditional, Neo Traditional, Fine Line, Illustrative, Portraits, Lettering, Color Realism, and more. Use the filter chips above to browse by style.',
  },
  {
    q: 'How do I earn loyalty points?',
    a: 'Points are awarded for completed tattoo sessions, leaving reviews, referrals, and select activities. Check the Battle Pass page for your current progress and available rewards.',
  },
  {
    q: 'What is the Flash Queue?',
    a: 'Flash events are special walk-in sessions where artists offer pre-drawn designs at a set price — first come, first served. Join the queue on the Flash Queue page when an event is live.',
  },
  {
    q: 'What is the Vault?',
    a: 'The Vault is your personal collection of exclusive designs, reference images, and tattoo inspiration. Save designs you love for your next session.',
  },
  {
    q: 'How do I leave a review?',
    a: 'Visit the artist\'s profile page after your appointment. Scroll down and tap Leave a Review. Reviews help other clients find the right artist and earn you bonus loyalty points.',
  },
  {
    q: 'Can I view an artist\'s previous work?',
    a: 'Absolutely. Open any artist profile to browse their full portfolio. Tap any photo to view it full-size.',
  },
]

function ArtistCircle({ artist }: { artist: Artist }) {
  const navigate = useNavigate()
  const initial = (artist.name[0] ?? '?').toUpperCase()
  const styles = artist.specialties.slice(0, 3)

  return (
    <button
      type="button"
      className="artist-circle"
      onClick={() => navigate(`/artists/${artist.slug}`)}
      aria-label={`View ${artist.name}'s profile`}
    >
      <div className="artist-circle__avatar">
        {artist.avatar_url
          ? <img src={artist.avatar_url} alt={artist.name} />
          : <span>{initial}</span>
        }
      </div>
      <p className="artist-circle__name">{artist.name}</p>
      {artist.review_count > 0 && (
        <div className="artist-circle__rating">
          <Star size={11} fill="currentColor" strokeWidth={0} />
          <span>{artist.rating.toFixed(1)}</span>
          <span className="artist-circle__review-count">({artist.review_count})</span>
        </div>
      )}
      {styles.length > 0 && (
        <div className="artist-circle__styles">
          {styles.map(s => <span key={s} className="artist-circle__style">{s}</span>)}
        </div>
      )}
    </button>
  )
}

function FaqRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq-row${open ? ' faq-row--open' : ''}`}>
      <button type="button" className="faq-row__q" onClick={() => setOpen(v => !v)}>
        <span>{item.q}</span>
        {open ? <ChevronUp size={16} strokeWidth={1.5} /> : <ChevronDown size={16} strokeWidth={1.5} />}
      </button>
      {open && <p className="faq-row__a">{item.a}</p>}
    </div>
  )
}

export function ArtistsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(ALL_FILTER)
  const [showFaq, setShowFaq] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    const CACHE_KEY = 'hoh_artists_v1'
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      try { setArtists(JSON.parse(cached)); setLoading(false) } catch {}
    }
    supabase
      .from('artists')
      .select('id, name, slug, specialties, avatar_url, rating, review_count, bio')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (!data) return
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
        setArtists(data)
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    return artists.filter(a => {
      const matchesQuery = a.name.toLowerCase().includes(query.toLowerCase())
      let matchesFilter = false
      if (filter === ALL_FILTER) {
        matchesFilter = true
      } else if (filter === OTHER_FILTER) {
        matchesFilter = a.specialties.some(s => !isPredefined(s))
      } else {
        matchesFilter = a.specialties.includes(filter)
      }
      return matchesQuery && matchesFilter
    })
  }, [artists, query, filter])

  async function handleContactSupport() {
    if (!user) {
      window.location.href = `mailto:${SUPPORT_EMAIL}`
      return
    }
    setChatLoading(true)
    const result = await openSupportChat(user.id, navigate)
    setChatLoading(false)
    if (result === 'navigated' || result === 'self') {
      setShowFaq(false)
    } else if (result === 'email') {
      window.location.href = `mailto:${SUPPORT_EMAIL}`
    }
  }

  return (
    <div className="page artists-page">
      <PageHeader
        title="Artists"
        rightAction={
          <button
            type="button"
            className="artists-page__info"
            aria-label="FAQ & help"
            onClick={() => setShowFaq(true)}
          >
            <Info size={22} strokeWidth={1.5} />
          </button>
        }
      />

      <div className="artists-page__search">
        <Search size={18} strokeWidth={1.5} />
        <input
          type="search"
          placeholder="Search artists"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <CategoryChips items={STYLE_FILTERS} active={filter} onChange={setFilter} />

      <div className="artist-circles-grid">
        {loading && [1, 2, 3, 4].map(i => (
          <div key={i} className="artist-circle-skeleton">
            <div className="artist-circle-skeleton__avatar" />
            <div className="artist-circle-skeleton__name" />
            <div className="artist-circle-skeleton__sub" />
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center', gridColumn: '1/-1' }}>No artists found.</p>
        )}
        {filtered.map(artist => (
          <ArtistCircle key={artist.id} artist={artist} />
        ))}
      </div>

      {/* FAQ / Help overlay */}
      {showFaq && (
        <div className="faq-overlay" onClick={() => setShowFaq(false)}>
          <div className="faq-sheet" onClick={e => e.stopPropagation()}>
            <div className="faq-sheet__head">
              <h2 className="faq-sheet__title">Help &amp; FAQ</h2>
              <button type="button" className="faq-sheet__close" onClick={() => setShowFaq(false)} aria-label="Close">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="faq-sheet__body">
              {FAQ.map(item => (
                <FaqRow key={item.q} item={item} />
              ))}

              <div className="faq-support">
                <p className="faq-support__heading">Still need help?</p>
                <p className="faq-support__sub">Our team is happy to assist you.</p>
                <div className="faq-support__actions">
                  {user && (
                    <button
                      type="button"
                      className="faq-support__btn faq-support__btn--primary"
                      onClick={handleContactSupport}
                      disabled={chatLoading}
                    >
                      <MessageCircle size={16} strokeWidth={1.5} />
                      {chatLoading ? 'Opening…' : 'Message Support'}
                    </button>
                  )}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="faq-support__btn faq-support__btn--email"
                  >
                    <Mail size={16} strokeWidth={1.5} />
                    {SUPPORT_EMAIL}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
