import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Artist = {
  id: string
  name: string
  slug: string
  bio: string | null
  specialties: string[]
  avatar_url: string | null
  is_active: boolean
}

const EMPTY: Omit<Artist, 'id'> = {
  name: '', slug: '', bio: '', specialties: [], avatar_url: null, is_active: true,
}

export function AdminArtists() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState<Omit<Artist, 'id'>>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('artists').select('*').order('name')
    setArtists(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setForm(EMPTY)
    setAvatarFile(null)
    setError(null)
    setEditId(null)
    setModal('add')
  }

  function openEdit(a: Artist) {
    setForm({ name: a.name, slug: a.slug, bio: a.bio ?? '', specialties: a.specialties, avatar_url: a.avatar_url, is_active: a.is_active })
    setAvatarFile(null)
    setError(null)
    setEditId(a.id)
    setModal('edit')
  }

  async function save() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError(null)

    let avatar_url = form.avatar_url

    // upload avatar if a new file was chosen
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `artists/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      if (upErr) { setError(upErr.message); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = urlData.publicUrl
    }

    const slug = form.slug.trim() || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const payload = { ...form, slug, avatar_url, hero_url: avatar_url }

    if (modal === 'add') {
      const { error: err } = await supabase.from('artists').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('artists').update(payload).eq('id', editId!)
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSaving(false)
    setModal(null)
    load()
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return
    await supabase.from('artists').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Artists</h1>
        <button className="admin-btn admin-btn--primary" onClick={openAdd}>
          <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />
          Add Artist
        </button>
      </div>

      {loading ? (
        <p className="admin-empty">Loading…</p>
      ) : artists.length === 0 ? (
        <p className="admin-empty">No artists yet. Add one above.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Specialties</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {artists.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.avatar_url
                    ? <img src={a.avatar_url} className="admin-table__avatar" alt="" />
                    : <div className="admin-table__avatar--empty" />}
                </td>
                <td>{a.name}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {a.specialties.join(', ') || '—'}
                </td>
                <td>
                  <span className={`admin-badge admin-badge--${a.is_active ? 'active' : 'inactive'}`}>
                    {a.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td>
                  <div className="admin-actions">
                    <button className="admin-btn admin-btn--ghost" onClick={() => openEdit(a)}>
                      <Pencil size={13} />
                    </button>
                    <button className="admin-btn admin-btn--danger" onClick={() => remove(a.id, a.name)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">{modal === 'add' ? 'Add Artist' : 'Edit Artist'}</h2>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Name *</label>
              <input className="admin-modal__input" value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Slug (auto-generated if blank)</label>
              <input className="admin-modal__input" value={form.slug}
                placeholder="e.g. kevin-upton"
                onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Specialties (comma separated)</label>
              <input className="admin-modal__input"
                value={form.specialties.join(', ')}
                placeholder="e.g. Realism, Black & Grey"
                onChange={(e) => setForm(f => ({ ...f, specialties: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Bio</label>
              <textarea className="admin-modal__textarea" value={form.bio ?? ''}
                onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Profile Photo</label>
              {form.avatar_url && !avatarFile && (
                <img src={form.avatar_url} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginBottom: 8, border: '1px solid var(--border-gold)' }} />
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--gold)', fontSize: '0.85rem' }}>
                <Upload size={15} />
                {avatarFile ? avatarFile.name : 'Choose photo…'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Visibility</label>
              <select className="admin-modal__select" value={form.is_active ? 'true' : 'false'}
                onChange={(e) => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                <option value="true">Active (visible to public)</option>
                <option value="false">Hidden</option>
              </select>
            </div>

            {error && <p className="admin-modal__error">{error}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save Artist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
