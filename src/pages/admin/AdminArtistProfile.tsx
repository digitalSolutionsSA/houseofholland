import { useEffect, useState } from 'react'
import { Upload, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { StylePicker } from '../../components/shared/StylePicker'

type Artist = {
  id: string
  name: string
  bio: string | null
  specialties: string[]
  avatar_url: string | null
  profile_id: string | null
}

type ArtistList = { id: string; name: string; profile_id: string | null }

export function AdminArtistProfile() {
  const { profile } = useAuth()
  const isSuper = profile?.email?.toLowerCase() === 'info@digitalsolutionssa.co.za'

  const [artistList, setArtistList] = useState<ArtistList[]>([])
  const [artistId, setArtistId]     = useState('')
  const [artist, setArtist]         = useState<Artist | null>(null)

  const [bio, setBio]               = useState('')
  const [specialties, setSpecialties] = useState<string[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [success, setSuccess]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Load artist list and set initial selection
  useEffect(() => {
    async function init() {
      const { data: list } = await supabase
        .from('artists')
        .select('id, name, profile_id')
        .eq('is_active', true)
        .order('name')
      setArtistList(list ?? [])
      const mine = (list ?? []).find(a => a.profile_id === profile?.id)
      const id = mine?.id ?? (isSuper ? list?.[0]?.id ?? '' : '')
      setArtistId(id)
    }
    init()
  }, [profile?.id])

  // Load full artist record when artistId changes
  useEffect(() => {
    if (!artistId) { setLoading(false); return }
    loadArtist(artistId)
  }, [artistId])

  async function loadArtist(id: string) {
    setLoading(true)
    setAvatarFile(null)
    setAvatarPreview(null)
    const { data } = await supabase
      .from('artists')
      .select('id, name, bio, specialties, avatar_url, profile_id')
      .eq('id', id)
      .single()
    if (data) {
      setArtist(data)
      setBio(data.bio ?? '')
      setSpecialties(data.specialties)
    }
    setLoading(false)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setAvatarFile(file)
    if (file) setAvatarPreview(URL.createObjectURL(file))
  }

  async function save() {
    if (!artistId || !artist) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    let avatar_url = artist.avatar_url

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `artists/${artistId}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })
      if (upErr) { setError(upErr.message); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = urlData.publicUrl
    }

    const { error: err } = await supabase
      .from('artists')
      .update({ bio: bio.trim() || null, specialties, avatar_url, hero_url: avatar_url })
      .eq('id', artistId)

    if (err) { setError(err.message); setSaving(false); return }

    setSaving(false)
    setSuccess(true)
    setAvatarFile(null)
    setAvatarPreview(null)
    loadArtist(artistId)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (!artistId && !loading) {
    return (
      <div>
        <div className="admin-page__header">
          <h1 className="admin-page__title">My Artist Profile</h1>
        </div>
        <p className="admin-empty">Your account is not linked to an artist record. Ask your manager to assign your login on the Artists page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">My Artist Profile</h1>
        <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving || loading}>
          <Save size={13} style={{ display: 'inline', marginRight: 6 }} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {isSuper && artistList.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <select
            className="admin-modal__select"
            style={{ maxWidth: 240 }}
            value={artistId}
            onChange={e => setArtistId(e.target.value)}
          >
            {artistList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {success && (
        <p style={{ color: '#6bffb8', fontSize: '0.85rem', marginBottom: 16, padding: '8px 12px', background: 'rgba(107,255,184,0.08)', border: '1px solid rgba(107,255,184,0.2)', borderRadius: 6 }}>
          Profile updated successfully.
        </p>
      )}
      {error && <p className="admin-modal__error" style={{ marginBottom: 16 }}>{error}</p>}

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : artist ? (
        <div style={{ maxWidth: 560 }}>
          {/* Avatar */}
          <div className="admin-modal__field">
            <label className="admin-modal__label">Profile Photo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              {(avatarPreview ?? artist.avatar_url) ? (
                <img
                  src={avatarPreview ?? artist.avatar_url!}
                  alt={artist.name}
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-gold)' }}
                />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface-2)', border: '2px solid var(--border-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={24} color="var(--text-dim)" />
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--gold)', fontSize: '0.85rem' }}>
                <Upload size={15} />
                {avatarFile ? avatarFile.name : 'Choose new photo…'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
              </label>
            </div>
          </div>

          {/* Name (read-only) */}
          <div className="admin-modal__field">
            <label className="admin-modal__label">Name (managed by studio)</label>
            <input
              className="admin-modal__input"
              value={artist.name}
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>

          {/* Specialties */}
          <div className="admin-modal__field">
            <label className="admin-modal__label">Styles I specialise in</label>
            <StylePicker value={specialties} onChange={setSpecialties} />
          </div>

          {/* Bio */}
          <div className="admin-modal__field">
            <label className="admin-modal__label">Bio</label>
            <textarea
              className="admin-modal__textarea"
              value={bio}
              rows={5}
              placeholder="Tell clients about your style, experience, and what you love to tattoo…"
              onChange={e => setBio(e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
