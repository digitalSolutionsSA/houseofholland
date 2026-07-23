import { useRef, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronRight, CreditCard, Award, Shirt, FilePen,
  LogOut, Camera, User, Mail, Phone, Save, X, Loader2,
  IdCard, Upload, CheckCircle2,
} from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './ProfilePage.css'

const links = [
  { to: '/passport',   label: 'Tattoo Passport',      icon: Award      },
  { to: '/membership', label: 'Black Card Membership', icon: CreditCard },
  { to: '/merch',      label: 'Shop Merch',            icon: Shirt      },
  { to: '/consent',    label: 'Consent Forms',         icon: FilePen    },
]

export function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const idFileRef = useRef<HTMLInputElement>(null)
  const [idUrl, setIdUrl]               = useState<string | null>(null)
  const [idUploading, setIdUploading]   = useState(false)

  useEffect(() => {
    setIdUrl((profile as any)?.id_document_url ?? null)
  }, [profile?.id])

  const [editing, setEditing]           = useState(false)
  const [fullName, setFullName]         = useState(profile?.full_name ?? '')
  const [phone, setPhone]               = useState(profile?.phone ?? '')
  const [saving, setSaving]             = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState<string | null>(null)
  // Local avatar URL — updated immediately after upload so UI reflects the change
  const [localAvatar, setLocalAvatar]   = useState<string | null>(profile?.avatar_url ?? null)

  function startEdit() {
    setFullName(profile?.full_name ?? '')
    setPhone(profile?.phone ?? '')
    setError(null)
    setSuccess(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setError(null)
    setSuccess(null)
  }

  // Avatar change — fires immediately on file pick, no "save" required
  async function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    // Show instant local preview
    const preview = URL.createObjectURL(file)
    setLocalAvatar(preview)
    setAvatarUploading(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (upErr) {
      setError('Photo upload failed: ' + upErr.message)
      setLocalAvatar(profile.avatar_url ?? null)
      setAvatarUploading(false)
      return
    }

    // Add cache-busting timestamp so the browser fetches the new image
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`

    await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', profile.id)

    setLocalAvatar(publicUrl)
    setAvatarUploading(false)
    await refreshProfile()

    // Clear the input so the same file can be re-picked if needed
    e.target.value = ''
  }

  async function save() {
    if (!profile) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const { error: dbErr } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      })
      .eq('id', profile.id)

    if (dbErr) { setError(dbErr.message); setSaving(false); return }

    await refreshProfile()
    setSaving(false)
    setEditing(false)
    setSuccess('Profile updated.')
    setTimeout(() => setSuccess(null), 3000)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  async function onIdPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setIdUploading(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `${profile.id}/id.${ext}`

    const { error: upErr } = await supabase.storage
      .from('id-documents')
      .upload(path, file, { upsert: true })

    if (upErr) { setError('ID upload failed: ' + upErr.message); setIdUploading(false); return }

    const { data } = supabase.storage.from('id-documents').getPublicUrl(path)
    await supabase.from('profiles').update({ id_document_url: data.publicUrl }).eq('id', profile.id)
    setIdUrl(data.publicUrl)
    setIdUploading(false)
    await refreshProfile()
    e.target.value = ''
  }

  const displayName = profile?.full_name?.trim() || 'Your Profile'
  const firstName   = displayName.split(' ')[0]
  const avatarSrc   = localAvatar ?? profile?.avatar_url ?? null

  const roleBadge =
    profile?.role === 'manager' ? 'Store Manager'
    : profile?.role === 'artist' ? 'Artist'
    : 'Member'

  return (
    <div className="page profile-page">
      <PageHeader
        title="Profile"
        rightAction={
          !editing ? (
            <button type="button" className="profile-page__edit-btn" onClick={startEdit}>
              Edit
            </button>
          ) : null
        }
      />

      <div className="profile-page__layout">

        {/* ── Avatar ── */}
        <div className="profile-page__hero">
          <div className="profile-page__avatar-wrap">
            <button
              type="button"
              className="profile-page__avatar-btn-outer"
              onClick={() => fileRef.current?.click()}
              aria-label="Change profile photo"
              disabled={avatarUploading}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className={`profile-page__avatar ${avatarUploading ? 'profile-page__avatar--uploading' : ''}`}
                />
              ) : (
                <div className={`profile-page__avatar profile-page__avatar--empty ${avatarUploading ? 'profile-page__avatar--uploading' : ''}`}>
                  <User size={36} strokeWidth={1} color="var(--gold)" />
                </div>
              )}
              <div className="profile-page__avatar-overlay">
                {avatarUploading
                  ? <Loader2 size={18} className="profile-page__avatar-spinner" />
                  : <Camera size={18} strokeWidth={1.5} />}
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif"
              style={{ display: 'none' }}
              onChange={onAvatarPick}
            />
          </div>

          <div className="profile-page__hero-text">
            <h2>{firstName}</h2>
            <span className="profile-page__role">{roleBadge}</span>
            <span className="profile-page__avatar-hint">Tap photo to change</span>
          </div>
        </div>

        {/* ── Success / Error banners ── */}
        {success && <p className="profile-page__success">{success}</p>}
        {error && !editing && <p className="profile-page__error">{error}</p>}

        {/* ── Edit form ── */}
        {editing ? (
          <div className="profile-page__form">
            <div className="profile-page__field">
              <label className="profile-page__label">
                <User size={14} strokeWidth={1.5} /> Full Name
              </label>
              <input
                className="profile-page__input"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>

            <div className="profile-page__field">
              <label className="profile-page__label">
                <Mail size={14} strokeWidth={1.5} /> Email
              </label>
              <input
                className="profile-page__input profile-page__input--disabled"
                value={profile?.email ?? ''}
                disabled
              />
              <span className="profile-page__hint">Email cannot be changed here.</span>
            </div>

            <div className="profile-page__field">
              <label className="profile-page__label">
                <Phone size={14} strokeWidth={1.5} /> Phone
              </label>
              <input
                className="profile-page__input"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                type="tel"
                autoComplete="tel"
              />
            </div>

            {error && <p className="profile-page__error">{error}</p>}

            <div className="profile-page__form-actions">
              <button type="button" className="profile-page__cancel-btn" onClick={cancelEdit}>
                <X size={14} /> Cancel
              </button>
              <button type="button" className="profile-page__save-btn" onClick={save} disabled={saving}>
                {saving ? <Loader2 size={14} className="profile-page__avatar-spinner" /> : <Save size={14} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Info display ── */
          <div className="profile-page__info-grid">
            {profile?.full_name && (
              <div className="profile-page__info-row">
                <User size={15} strokeWidth={1.5} />
                <span>{profile.full_name}</span>
              </div>
            )}
            {profile?.email && (
              <div className="profile-page__info-row">
                <Mail size={15} strokeWidth={1.5} />
                <span>{profile.email}</span>
              </div>
            )}
            {profile?.phone && (
              <div className="profile-page__info-row">
                <Phone size={15} strokeWidth={1.5} />
                <span>{profile.phone}</span>
              </div>
            )}
            {!profile?.full_name && !profile?.phone && (
              <p className="profile-page__hint" style={{ padding: '4px 0' }}>
                Tap <strong>Edit</strong> to add your name and phone number.
              </p>
            )}
          </div>
        )}

        {/* ── ID Document ── */}
        {!editing && (
          <div className="profile-page__id-section">
            <div className="profile-page__id-header">
              <IdCard size={16} strokeWidth={1.5} />
              <span>ID Document</span>
              {idUrl && <CheckCircle2 size={14} strokeWidth={2} className="profile-page__id-check" />}
            </div>
            {idUrl ? (
              <div className="profile-page__id-preview-wrap">
                <img src={idUrl} alt="ID document" className="profile-page__id-preview" />
                <button
                  type="button"
                  className="profile-page__id-replace"
                  onClick={() => idFileRef.current?.click()}
                  disabled={idUploading}
                >
                  {idUploading ? <Loader2 size={13} className="profile-page__avatar-spinner" /> : <Upload size={13} />}
                  {idUploading ? 'Uploading…' : 'Replace'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="profile-page__id-upload-btn"
                onClick={() => idFileRef.current?.click()}
                disabled={idUploading}
              >
                {idUploading
                  ? <><Loader2 size={16} className="profile-page__avatar-spinner" /> Uploading…</>
                  : <><Upload size={16} strokeWidth={1.5} /> Upload Driver's License or ID Card</>}
              </button>
            )}
            <input
              ref={idFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              style={{ display: 'none' }}
              onChange={onIdPick}
            />
            <p className="profile-page__id-note">
              Your ID is stored securely and only visible to studio staff.
            </p>
          </div>
        )}

        {/* ── Nav links ── */}
        {!editing && (
          <nav className="profile-page__nav">
            {links.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="profile-page__link">
                <Icon size={20} strokeWidth={1.5} />
                <span>{label}</span>
                <ChevronRight size={18} strokeWidth={1.5} />
              </Link>
            ))}
            <button
              type="button"
              className="profile-page__link profile-page__link--danger"
              onClick={handleSignOut}
            >
              <LogOut size={20} strokeWidth={1.5} />
              <span>Sign Out</span>
              <ChevronRight size={18} strokeWidth={1.5} />
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
