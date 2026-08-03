import { useEffect, useState } from 'react'
import { PageHeader } from '../components/shared/PageHeader'
import { VaultCard } from '../components/vault/VaultCard'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './VaultPage.css'

type VaultEntry = {
  id: string
  title: string
  artist: string
  date: string
  image: string
  price: number | null
}

export function VaultPage() {
  const { profile } = useAuth()
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(true)

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
          <VaultCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
