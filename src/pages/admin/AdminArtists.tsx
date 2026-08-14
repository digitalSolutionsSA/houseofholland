import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Upload, KeyRound, UserX, UserCheck, X, Copy, RefreshCw, Mail, ChevronDown } from 'lucide-react'
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
  referral_code: string | null
  profiles: ArtistProfile | null
}

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const EMPTY_FORM = {
  name: '', slug: '', bio: '', specialties: [] as string[], avatar_url: null as string | null, is_active: true,
}

type AccountModalMode = 'assign' | 'change_password' | 'change_email'

function SpecialtyTagInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function normalize(s: string) {
    return s.trim().replace(/\b\w/g, c => c.toUpperCase())
  }

  function add(raw: string) {
    const tag = normalize(raw)
    if (!tag || value.some(t => t.toLowerCase() === tag.toLowerCase())) { setInput(''); return }
    onChange([...value, tag])
    setInput('')
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  function remove(tag: string) { onChange(value.filter(t => t !== tag)) }

  return (
    <div
      className="specialty-tag-input"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map(tag => (
        <span key={tag} className="specialty-tag">
          {tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); remove(tag) }} aria-label={`Remove ${tag}`}>
            <X size={11} strokeWidth={2.5} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="specialty-tag-input__field"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => add(input)}
        placeholder={value.length === 0 ? 'Type a style and press Enter…' : 'Add another…'}
      />
    </div>
  )
}

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
      .select('id, name, slug, bio, specialties, avatar_url, is_active, profile_id, referral_code')
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
      referral_code: a.referral_code ?? null,
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

  function openChangeEmail(a: Artist) {
    setAccountArtist(a)
    setAccountEmail(a.profiles?.email ?? '')
    setAccountError(null)
    setAccountModal('change_email')
  }

  async function changeEmail() {
    if (!accountEmail.trim()) { setAccountError('Email is required.'); return }
    if (!accountArtist?.profile_id) { setAccountError('No linked account found.'); return }

    setAccountSaving(true)
    setAccountError(null)

    const { data, error } = await supabase.functions.invoke('manage-artist-account', {
      body: {
        action: 'update_email',
        userId: accountArtist.profile_id,
        email: accountEmail.trim(),
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

  async function regenerateCode(a: Artist) {
    let code = generateReferralCode()
    // Keep generating until unique (very unlikely to collide but safe)
    let attempts = 0
    while (attempts < 10) {
      const { error } = await supabase.from('artists').update({ referral_code: code }).eq('id', a.id)
      if (!error) break
      code = generateReferralCode()
      attempts++
    }
    load()
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

  const [expandedId, setExpandedId] = useState<string | null>(null)

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
        <div className="artist-cards">
          {artists.map(a => {
            const isOpen = expandedId === a.id
            return (
              <div key={a.id} className={`artist-card${isOpen ? ' artist-card--open' : ''}`}>

                {/* ── Collapsed header (always visible) ── */}
                <button
                  className="artist-card__header"
                  onClick={() => setExpandedId(isOpen ? null : a.id)}
                >
                  {a.avatar_url
                    ? <img src={a.avatar_url} className="artist-card__avatar" alt="" />
                    : <div className="artist-card__avatar artist-card__avatar--empty" />}
                  <div className="artist-card__meta">
                    <span className="artist-card__name">{a.name}</span>
                    <span className={`admin-badge admin-badge--${a.is_active ? 'active' : 'inactive'}`}>
                      {a.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    strokeWidth={1.8}
                    className={`artist-card__chevron${isOpen ? ' artist-card__chevron--open' : ''}`}
                  />
                </button>

                {/* ── Expanded body ── */}
                {isOpen && (
                  <div className="artist-card__body">

                    {/* Specialties */}
                    {a.specialties.length > 0 && (
                      <div className="artist-card__row">
                        <span className="artist-card__label">Styles</span>
                        <div className="artist-card__tags">
                          {a.specialties.map(s => (
                            <span key={s} className="artist-card__tag">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Referral code */}
                    <div className="artist-card__row">
                      <span className="artist-card__label">Referral Code</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <code className="artist-card__code">{a.referral_code ?? '—'}</code>
                        {a.referral_code && (
                          <button className="admin-btn admin-btn--ghost" style={{ padding: '3px 8px' }}
                            title="Copy" onClick={() => navigator.clipboard.writeText(a.referral_code!)}>
                            <Copy size={12} />
                          </button>
                        )}
                        <button className="admin-btn admin-btn--ghost" style={{ padding: '3px 8px' }}
                          title="Regenerate" onClick={() => regenerateCode(a)}>
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Bio */}
                    {a.bio && (
                      <div className="artist-card__row">
                        <span className="artist-card__label">Bio</span>
                        <p className="artist-card__bio">{a.bio}</p>
                      </div>
                    )}

                    {/* Login */}
                    <div className="artist-card__row">
                      <span className="artist-card__label">Login</span>
                      {a.profile_id ? (
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                            <UserCheck size={13} />{a.profiles?.email ?? '—'}
                          </span>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="admin-btn admin-btn--ghost" style={{ fontSize: '0.78rem' }} onClick={() => openChangePassword(a)}>
                              <KeyRound size={12} style={{ marginRight: 4 }} />Change PW
                            </button>
                            <button className="admin-btn admin-btn--ghost" style={{ fontSize: '0.78rem' }} onClick={() => openChangeEmail(a)}>
                              <Mail size={12} style={{ marginRight: 4 }} />Change Email
                            </button>
                            <button className="admin-btn admin-btn--danger" style={{ fontSize: '0.78rem' }} onClick={() => unlinkAccount(a)}>
                              <UserX size={12} style={{ marginRight: 4 }} />Remove Login
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button className="admin-btn admin-btn--ghost" style={{ fontSize: '0.82rem' }} onClick={() => openAssign(a)}>
                          <KeyRound size={13} style={{ marginRight: 5 }} />Assign Login
                        </button>
                      )}
                    </div>

                    {/* Edit / Delete */}
                    <div className="artist-card__actions">
                      <button className="admin-btn admin-btn--ghost" onClick={() => openEdit(a)}>
                        <Pencil size={13} style={{ marginRight: 5 }} />Edit
                      </button>
                      <button className="admin-btn admin-btn--danger" onClick={() => remove(a.id, a.name)}>
                        <Trash2 size={13} style={{ marginRight: 5 }} />Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
              <label className="admin-modal__label">Styles</label>
              <SpecialtyTagInput
                value={form.specialties}
                onChange={(tags) => setForm(f => ({ ...f, specialties: tags }))}
              />
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

      {/* Change email modal */}
      {accountModal === 'change_email' && accountArtist && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setAccountModal(null)}>
          <div className="admin-modal">
            <h2 className="admin-modal__title">Change Email — {accountArtist.name}</h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Current: <strong style={{ color: 'var(--gold)' }}>{accountArtist.profiles?.email}</strong>
            </p>

            <div className="admin-modal__field">
              <label className="admin-modal__label">New Email *</label>
              <input className="admin-modal__input" type="email" value={accountEmail}
                autoComplete="off"
                onChange={(e) => setAccountEmail(e.target.value)} />
            </div>

            {accountError && <p className="admin-modal__error">{accountError}</p>}

            <div className="admin-modal__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setAccountModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn--primary" onClick={changeEmail} disabled={accountSaving}>
                {accountSaving ? 'Updating…' : 'Update Email'}
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
