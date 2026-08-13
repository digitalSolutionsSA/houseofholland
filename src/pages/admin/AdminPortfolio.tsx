import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Upload, ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { StyleSelect } from '../../components/shared/StyleSelect'

type Artist = { id: string; name: string; profile_id: string | null }
type Photo  = { id: string; url: string; caption: string | null; style: string | null; created_at: string }

export function AdminPortfolio() {
  const { profile } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [artists, setArtists]             = useState<Artist[]>([])
  const [selectedArtistId, setSelected]   = useState<string>('')
  const [photos, setPhotos]               = useState<Photo[]>([])
  const [loading, setLoading]             = useState(true)
  const [uploading, setUploading]         = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  // upload form
  const [caption, setCaption]   = useState('')
  const [style, setStyle]       = useState('')
  const [preview, setPreview]   = useState<string | null>(null)
  const [file, setFile]         = useState<File | null>(null)
  const [showForm, setShowForm] = useState(false)

  const isManager = profile?.role === 'manager'

  async function loadPhotos(artistId: string) {
    setLoading(true)
    const { data } = await supabase
      .from('portfolio_photos')
      .select('id, url, caption, style, created_at')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })
    setPhotos(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: list } = await supabase
        .from('artists')
        .select('id, name, profile_id')
        .eq('is_active', true)
        .order('name')
      setArtists(list ?? [])

      // lock artists to their own record
      const mine = (list ?? []).find(a => a.profile_id === profile?.id)
      if (mine) {
        setSelected(mine.id)
        loadPhotos(mine.id)
      } else if (isManager && list && list.length > 0) {
        setSelected(list[0].id)
        loadPhotos(list[0].id)
      } else {
        setLoading(false)
      }
    }
    init()
  }, [profile?.id])

  useEffect(() => {
    if (selectedArtistId) loadPhotos(selectedArtistId)
  }, [selectedArtistId])

  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setShowForm(true)
    e.target.value = ''
  }

  function cancelUpload() {
    setFile(null)
    setPreview(null)
    setCaption('')
    setStyle('')
    setShowForm(false)
    setError(null)
    setUploading(false)
  }

  async function upload() {
    if (!file || !selectedArtistId) return
    setUploading(true)
    setError(null)

    const ext  = file.name.split('.').pop()
    const path = `artist-portfolio/${selectedArtistId}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('portfolio')
      .upload(path, file, { upsert: true })

    if (upErr) { setError(upErr.message); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(path)

    const { error: dbErr } = await supabase.from('portfolio_photos').insert({
      artist_id: selectedArtistId,
      url:       urlData.publicUrl,
      caption:   caption.trim() || null,
      style:     style.trim() || null,
    })

    if (dbErr) { setError(dbErr.message); setUploading(false); return }

    cancelUpload()
    loadPhotos(selectedArtistId)
  }

  async function remove(photo: Photo) {
    if (!confirm('Delete this photo?')) return
    await supabase.from('portfolio_photos').delete().eq('id', photo.id)
    setPhotos(p => p.filter(x => x.id !== photo.id))
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">My Portfolio</h1>
        <button
          className="admin-btn admin-btn--primary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />
          Upload Photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onFilePick}
        />
      </div>

      {/* Manager can switch between artists */}
      {isManager && artists.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <select
            className="admin-modal__select"
            value={selectedArtistId}
            onChange={e => setSelected(e.target.value)}
            style={{ maxWidth: 240 }}
          >
            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {/* Upload form — shown after a file is picked */}
      {showForm && preview && (
        <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && cancelUpload()}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">Add Portfolio Photo</h2>

            <img
              src={preview}
              alt=""
              style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 8, marginBottom: 16, border: '1px solid var(--border-gold)' }}
            />

            <div className="admin-modal__field">
              <label className="admin-modal__label">Style / Category</label>
              <StyleSelect value={style} onChange={setStyle} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Caption (optional)</label>
              <input
                className="admin-modal__input"
                value={caption}
                placeholder="Brief description of the piece…"
                onChange={e => setCaption(e.target.value)}
              />
            </div>

            {error && <p className="admin-modal__error">{error}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={cancelUpload}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={upload} disabled={uploading}>
                {uploading ? 'Uploading…' : (
                  <><Upload size={13} style={{ display: 'inline', marginRight: 6 }} />Save to Portfolio</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : photos.length === 0 ? (
        <div className="admin-portfolio__empty">
          <ImageIcon size={40} strokeWidth={1} color="var(--gold-muted)" />
          <p>No portfolio photos yet.</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
            Click <strong>Upload Photo</strong> to add your first piece.
          </p>
        </div>
      ) : (
        <div className="admin-portfolio__grid">
          {photos.map(p => (
            <div key={p.id} className="admin-portfolio__card">
              <img src={p.url} alt={p.caption ?? ''} className="admin-portfolio__img" />
              <div className="admin-portfolio__meta">
                {p.style && <span className="admin-portfolio__style">{p.style}</span>}
                {p.caption && <span className="admin-portfolio__caption">{p.caption}</span>}
              </div>
              <button
                type="button"
                className="admin-portfolio__delete"
                onClick={() => remove(p)}
                aria-label="Delete photo"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
