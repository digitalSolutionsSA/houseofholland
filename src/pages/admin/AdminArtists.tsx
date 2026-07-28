import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Upload, KeyRound, UserX, UserCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type ArtistProfile = {
  id: string
  email: string | null
  full_name: string | null
}

type Artist = {
  id: string
  name: string
  slug: string
  bio: string | null
  specialties: string[]
  avatar_url: string | null
  is_active: boolean
  profile_id: string | null
  profiles: ArtistProfile | null
}

const EMPTY_FORM = {
  name: '', slug: '', bio: '', specialties: [] as string[], avatar_url: null as string | null, is_active: true,
}

type AccountModalMode = 'assign' | 'change_password'

export function AdminArtists() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)

  // Artist edit/add modal
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  // Account management modal
  const [accountModal, setAccountModal] = useState<AccountModalMode | null>(null)
  const [accountArtist, setAccountArtist] = useState<Artist | null>(null)
  const [accountEmail, setAccountEmail] = useState('')
  const [accountFullName, setAccountFullName] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [accountConfirm, setAccountConfirm] = useState('')
  const [accountError, setAccountError] = useState<string | null>(null)
  const [accountSaving, setAccountSaving] = useState(false)

  async function load() {
    setLoading(true)

    const { data: artistData } = await supabase
      .from('artists')
      .select('id, name, slug, bio, specialties, avatar_url, is_active, profile_id')
      .order('name')

    const rows = artistData ?? []

    // Fetch profile email/name for each linked account in a separate query
    const linkedIds = rows.map(a => a.profile_id).filter(Boolean) as string[]
    let profileMap: Record<string, ArtistProfile> = {}

    if (linkedIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', linkedIds)
      for (const p of profileData ?? []) {
        profileMap[p.id] = p
      }
    }

    setArtists(rows.map(a => ({
      ...a,
      profiles: a.profile_id ? (profileMap[a.profile_id] ?? null) : null,
    })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Artist add/edit ─────────────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM)
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

  // ── Account management ───────────────────────────────────────────────────────

  function openAssign(a: Artist) {
    setAccountArtist(a)
    setAccountEmail('')
    setAccountFullName(a.name)
    setAccountPassword('')
    setAccountConfirm('')
    setAccountError(null)
    setAccountModal('assign')
  }

  function openChangePassword(a: Artist) {
    setAccountArtist(a)
    setAccountPassword('')
    setAccountConfirm('')
    setAccountError(null)
    setAccountModal('change_password')
  }

  async function assignAccount() {
    if (!accountEmail.trim()) { setAccountError('Email is required.'); return }
    if (accountPassword.length < 8) { setAccountError('Password must be at least 8 characters.'); return }
    if (accountPassword !== accountConfirm) { setAccountError('Passwords do not match.'); return }

    setAccountSaving(true)
    setAccountError(null)

    const { data, error } = await supabase.functions.invoke('manage-artist-account', {
      body: {
        action: 'create',
        artistId: accountArtist!.id,
        email: accountEmail.trim(),
        password: accountPassword,
        fullName: accountFullName.trim() || accountArtist!.name,
      },
    })

    setAccountSaving(false)

    if (error || data?.error) {
      setAccountError(data?.error ?? error?.message ?? 'Something went wrong.')
      return
    }

    setAccountModal(null)
    load()
  }

  async function changePassword() {
    if (accountPassword.length < 8) { setAccountError('Password must be at least 8 characters.'); return }
    if (accountPassword !== accountConfirm) { setAccountError('Passwords do not match.'); return }

    setAccountSaving(true)
    setAccountError(null)

    const { data, error } = await supabase.functions.invoke('manage-artist-account', {
      body: {
        action: 'update_password',
        userId: accountArtist!.profile_id,
        password: accountPassword,
      },
    })

    setAccountSaving(false)

    if (error || data?.error) {
      setAccountError(data?.error ?? error?.message ?? 'Something went wrong.')
      return
    }

    setAccountModal(null)
  }

  async function unlinkAccount(a: Artist) {
    const email = a.profiles?.email ?? a.profile_id
    if (!confirm(`Remove login access for ${a.name} (${email})? Their account will be demoted to a regular user.`)) return

    const { data, error } = await supabase.functions.invoke('manage-artist-account', {
      body: {
        action: 'unlink',
        artistId: a.id,
        userId: a.profile_id,
      },
    })

    if (error || data?.error) {
      alert(data?.error ?? error?.message ?? 'Something went wrong.')
      return
    }

    load()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

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
              <th>Login</th>
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
                  {a.profile_id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <UserCheck size={12} />
                        {a.profiles?.email ?? '—'}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="admin-btn admin-btn--ghost" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={() => openChangePassword(a)} title="Change password">
                          <KeyRound size={11} style={{ marginRight: 3 }} />
                          Change PW
                        </button>
                        <button className="admin-btn admin-btn--danger" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={() => unlinkAccount(a)} title="Remove login">
                          <UserX size={11} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="admin-btn admin-btn--ghost" style={{ fontSize: '0.78rem' }} onClick={() => openAssign(a)}>
                      <KeyRound size={12} style={{ marginRight: 5 }} />
                      Assign Login
                    </button>
                  )}
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

      {/* Artist add/edit modal */}
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

      {/* Assign login modal */}
      {accountModal === 'assign' && accountArtist && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setAccountModal(null)}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">Assign Login — {accountArtist.name}</h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Create an artist account. They'll be able to log in and manage their own profile, schedule, and bookings.
            </p>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Full Name</label>
              <input className="admin-modal__input" value={accountFullName}
                onChange={(e) => setAccountFullName(e.target.value)} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Email *</label>
              <input className="admin-modal__input" type="email" value={accountEmail}
                autoComplete="off"
                onChange={(e) => setAccountEmail(e.target.value)} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Password * (min 8 characters)</label>
              <input className="admin-modal__input" type="password" value={accountPassword}
                autoComplete="new-password"
                onChange={(e) => setAccountPassword(e.target.value)} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Confirm Password *</label>
              <input className="admin-modal__input" type="password" value={accountConfirm}
                autoComplete="new-password"
                onChange={(e) => setAccountConfirm(e.target.value)} />
            </div>

            {accountError && <p className="admin-modal__error">{accountError}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setAccountModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={assignAccount} disabled={accountSaving}>
                {accountSaving ? 'Creating…' : 'Create Login'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change password modal */}
      {accountModal === 'change_password' && accountArtist && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setAccountModal(null)}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">Change Password — {accountArtist.name}</h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Account: <strong style={{ color: 'var(--gold)' }}>{accountArtist.profiles?.email}</strong>
            </p>

            <div className="admin-modal__field">
              <label className="admin-modal__label">New Password * (min 8 characters)</label>
              <input className="admin-modal__input" type="password" value={accountPassword}
                autoComplete="new-password"
                onChange={(e) => setAccountPassword(e.target.value)} />
            </div>

            <div className="admin-modal__field">
              <label className="admin-modal__label">Confirm Password *</label>
              <input className="admin-modal__input" type="password" value={accountConfirm}
                autoComplete="new-password"
                onChange={(e) => setAccountConfirm(e.target.value)} />
            </div>

            {accountError && <p className="admin-modal__error">{accountError}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setAccountModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={changePassword} disabled={accountSaving}>
                {accountSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
