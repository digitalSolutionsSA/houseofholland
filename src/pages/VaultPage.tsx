import { useEffect, useState } from 'react'
import { X, Lock } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { PageHeader } from '../components/shared/PageHeader'
import { VaultCard, type VaultEntry } from '../components/vault/VaultCard'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useMembership } from '../hooks/useMembership'
import './VaultPage.css'

export function VaultPage() {
  // ── All hooks unconditionally at the top ──
  const { profile } = useAuth()
  const { isPremium, isBlackCard, vaultLimit } = useMembership()
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<VaultEntry | null>(null)

  useEffect(() => {
    if (!profile?.id || !isPremium) { setLoading(false); return }
    const CACHE_KEY = `hoh_vault_${profile.id}_v1`
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      try { setEntries(JSON.parse(cached)); setLoading(false) } catch {}
    }
    supabase
      .from('tattoo_completions')
      .select('id, photo_url, style, notes, completed_at, price, artists(name)')
      .eq('profile_id', profile.id)
      .order('completed_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []).map((d: any) => ({
          id: d.id,
          title: d.style ?? d.notes ?? 'Tattoo',
          artist: d.artists?.name ?? 'Unknown Artist',
          date: new Date(d.completed_at + 'T12:00:00').toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
          }),
          image: d.photo_url,
          price: d.price ?? null,
        }))
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(rows))
        setEntries(rows)
        setLoading(false)
      })
  }, [profile?.id, isPremium])

  // ── Conditional returns after all hooks ──
  if (profile?.role === 'artist' || profile?.role === 'manager') return <Navigate to="/home" replace />

  // Profile still loading — show neutral skeleton so paid users don't see a flash of the locked screen
  if (!profile) {
    return (
      <div className="page vault-page">
        <PageHeader title="My Tattoo Vault" />
        <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>Loading…</p>
      </div>
    )
  }

  // Free tier: vault is locked
  if (!isPremium) {
    return (
      <div className="page vault-page">
        <PageHeader title="My Tattoo Vault" />
        <div className="vault-page__locked">
          <div className="vault-page__locked-icon">
            <Lock size={36} strokeWidth={1.2} />
          </div>
          <h2 className="vault-page__locked-title">Premium Feature</h2>
          <p className="vault-page__locked-body">
            The Tattoo Vault stores a digital record of every piece you've had done at House of Holland.
            Upgrade to <strong>Premium</strong> to store up to 10 tattoos, or go <strong>Black Card</strong> for unlimited storage.
          </p>
          <Link to="/membership" className="vault-page__locked-cta">
            View Membership Plans
          </Link>
        </div>
      </div>
    )
  }

  // Entries visible to this tier (premium = 3 max, black-card = all)
  const visibleEntries = isBlackCard ? entries : entries.slice(0, vaultLimit)
  const atLimit = isPremium && !isBlackCard && entries.length >= vaultLimit

  return (
    <div className="page vault-page">
      <PageHeader title="My Tattoo Vault" />

      {isPremium && !isBlackCard && (
        <div className="vault-page__limit-bar">
          <span className="vault-page__limit-count">{Math.min(entries.length, vaultLimit)} / {vaultLimit} tattoos stored</span>
          {atLimit && (
            <Link to="/membership" className="vault-page__limit-upgrade">
              Upgrade for unlimited
            </Link>
          )}
        </div>
      )}

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
        {visibleEntries.map((entry) => (
          <VaultCard key={entry.id} entry={entry} onClick={() => setSelected(entry)} />
        ))}
      </div>

      {atLimit && entries.length > vaultLimit && (
        <div className="vault-page__overflow-note">
          <Lock size={14} strokeWidth={1.5} />
          <span>{entries.length - vaultLimit} more tattoo{entries.length - vaultLimit === 1 ? '' : 's'} hidden — upgrade to Black Card to unlock unlimited vault storage.</span>
          <Link to="/membership">Upgrade</Link>
        </div>
      )}

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
                <p className="vault-lightbox__price">${selected.price.toFixed(2)}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
