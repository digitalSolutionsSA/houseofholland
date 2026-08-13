import { useEffect, useMemo, useState } from 'react'
import { Info, Search } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { CategoryChips } from '../components/shared/CategoryChips'
import { ArtistCard } from '../components/artists/ArtistCard'
import { supabase } from '../lib/supabase'
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

export function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(ALL_FILTER)

  useEffect(() => {
    supabase
      .from('artists')
      .select('id, name, slug, specialties, avatar_url, rating, review_count, bio')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => { setArtists(data ?? []); setLoading(false) })
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

  return (
    <div className="page artists-page">
      <PageHeader
        title="Artists"
        rightAction={
          <button type="button" className="artists-page__info" aria-label="About artists">
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

      <div className="artists-page__list">
        {loading && <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>No artists found.</p>
        )}
        {filtered.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
    </div>
  )
}
