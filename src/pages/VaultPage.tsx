import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { PageHeader } from '../components/shared/PageHeader'
import { VaultCard, type VaultEntry } from '../components/vault/VaultCard'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './VaultPage.css'

export function VaultPage() {
  const { profile } = useAuth()
  if (profile?.role === 'artist' || profile?.role === 'manager') return <Navigate to="/home" replace />
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<VaultEntry | null>(null)

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('tattoo_completions')
      .select('id, photo_url, style, notes, completed_at, price, artists(name)')
      .eq('profile_id', profile.id)
      .order('completed_at', { ascending: false })
      .then(({ data }) => {
        setEntries(
          (data ?? []).map((d: any) => ({
            id: d.id,
            title: d.style ?? d.notes ?? 'Tattoo',
            artist: d.artists?.name ?? 'Unknown Artist',
            date: new Date(d.completed_at + 'T12:00:00').toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            }),
            image: d.photo_url,
            price: d.price ?? null,
          }))
        )
        setLoading(false)
      })
  }, [profile?.id])

  return (
    <div className="page vault-page">
      <PageHeader title="My Tattoo Vault" />
      {loading && (
        <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>Loading…</p>
      )}
      {!loading && entries.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Your vault is empty. After a session your artist will add your tattoo here.
          </p>
        </div>
      )}
      <div className="vault-page__list">
        {entries.map((entry) => (
          <VaultCard key={entry.id} entry={entry} onClick={() => setSelected(entry)} />
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div className="vault-lightbox" onClick={() => setSelected(null)}>
          <div className="vault-lightbox__card" onClick={e => e.stopPropagation()}>
            <button className="vault-lightbox__close" onClick={() => setSelected(null)} aria-label="Close">
              <X size={20} strokeWidth={1.5} />
            </button>
            <img src={selected.image} alt={selected.title} className="vault-lightbox__img" />
            <div className="vault-lightbox__meta">
              <h2 className="vault-lightbox__title">{selected.title}</h2>
              <p className="vault-lightbox__artist">By {selected.artist}</p>
              <p className="vault-lightbox__date">{selected.date}</p>
              {selected.price != null && (
                <p className="vault-lightbox__price">R{selected.price.toFixed(2)}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
