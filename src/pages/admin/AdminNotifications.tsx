import { useEffect, useState } from 'react'
import { Send, ShieldOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

type Profile = { id: string; full_name: string | null; email: string | null; role: string }

export function AdminNotifications() {
  const { profile } = useAuth()
  const isSuper = !!profile?.is_super_admin

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [type, setType]         = useState('info')
  const [target, setTarget]     = useState<'all' | 'artists' | 'one'>('all')
  const [targetId, setTargetId] = useState('')
  const [sending, setSending]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, email, role').order('full_name')
      .then(({ data }) => { setProfiles(data ?? []); setLoading(false) })
  }, [])

  async function send() {
    if (!title.trim()) { setError('Title is required.'); return }
    setSending(true); setError(null); setSuccess(false)

    let recipients: string[] = []
    if (target === 'all') {
      recipients = profiles.map(p => p.id)
    } else if (target === 'artists') {
      recipients = profiles.filter(p => p.role === 'artist').map(p => p.id)
    } else {
      if (!targetId) { setError('Select a recipient.'); setSending(false); return }
      recipients = [targetId]
    }

    if (recipients.length === 0) { setError('No matching recipients found.'); setSending(false); return }

    const rows = recipients.map(profile_id => ({
      profile_id,
      title: title.trim(),
      body: body.trim() || null,
      type,
    }))

    const { error: err } = await supabase.from('notifications').insert(rows)
    if (err) { setError(err.message); setSending(false); return }

    setTitle(''); setBody(''); setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    setSending(false)
  }

  if (!isSuper) return (
    <div className="admin-page__access-denied">
      <ShieldOff size={40} strokeWidth={1.2} />
      <p>Access restricted.</p>
    </div>
  )

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Send Notification</h1>
      </div>

      <div style={{ maxWidth: 560 }}>
        <div className="admin-modal__field">
          <label className="admin-modal__label">Type</label>
          <select className="admin-modal__select" value={type} onChange={e => setType(e.target.value)}>
            <option value="info">Info</option>
            <option value="flash">Flash Day</option>
            <option value="booking">Booking</option>
            <option value="alert">Alert</option>
          </select>
        </div>

        <div className="admin-modal__field">
          <label className="admin-modal__label">Title *</label>
          <input className="admin-modal__input" value={title} placeholder="Notification title…"
            onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="admin-modal__field">
          <label className="admin-modal__label">Body (optional)</label>
          <textarea className="admin-modal__textarea" value={body} placeholder="Additional details…"
            onChange={e => setBody(e.target.value)} />
        </div>

        <div className="admin-modal__field">
          <label className="admin-modal__label">Send To</label>
          <select className="admin-modal__select" value={target} onChange={e => setTarget(e.target.value as any)}>
            <option value="all">All users</option>
            <option value="artists">Artists only</option>
            <option value="one">Specific person</option>
          </select>
        </div>

        {target === 'one' && (
          <div className="admin-modal__field">
            <label className="admin-modal__label">Recipient</label>
            <select className="admin-modal__select" value={targetId} onChange={e => setTargetId(e.target.value)}>
              <option value="">— select —</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email ?? p.id}
                </option>
              ))}
            </select>
          </div>
        )}

        {error   && <p className="admin-modal__error">{error}</p>}
        {success && (
          <p style={{ color: '#4ade80', fontSize: '0.85rem', marginBottom: 12 }}>
            Notification sent successfully.
          </p>
        )}

        <button className="admin-btn admin-btn--primary" onClick={send} disabled={sending || loading}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px' }}>
          <Send size={14} />
          {sending ? 'Sending…' : 'Send Notification'}
        </button>

        {/* ── Recent log ── */}
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 16 }}>
            NOTIFICATION HISTORY
          </h2>
          <RecentNotifications />
        </div>
      </div>
    </div>
  )
}

function RecentNotifications() {
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('notifications')
      .select('id, title, type, created_at, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setRows(data ?? []))
  }, [])

  if (!rows.length) return <p className="admin-empty" style={{ padding: 0 }}>No notifications sent yet.</p>

  return (
    <table className="admin-table">
      <thead><tr><th>Title</th><th>Type</th><th>To</th><th>Sent</th></tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td>{r.title}</td>
            <td><span className="admin-badge" style={{ textTransform: 'capitalize' }}>{r.type}</span></td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {(r as any).profiles?.full_name ?? '—'}
            </td>
            <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
