import { useEffect, useState } from 'react'
import { Send, ShieldOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getAdminProfileId } from '../../lib/support'

type Profile = { id: string; full_name: string | null; email: string | null; role: string }

// Only these two accounts may send broadcast notifications
const ALLOWED_SENDERS = ['info@digitalsolutionssa.co.za', 'armand@hohtatoos.com']

const TYPES = [
  { value: 'general', label: 'General Information' },
  { value: 'flash',   label: 'Flash Days' },
  { value: 'alert',   label: 'Alert' },
  { value: 'update',  label: 'Updates' },
  { value: 'sale',    label: 'Sale' },
]

export function AdminNotifications() {
  const { profile } = useAuth()
  const isSuper = !!profile?.is_super_admin
  const canSend = isSuper && !!profile?.email && ALLOWED_SENDERS.includes(profile.email.toLowerCase())

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [type, setType]         = useState('general')
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

    // Determine sender identity:
    // Armand sends from his own artist profile (conversations owned by him).
    // info@ sends from the HoH Support profile.
    const isArmand = profile!.email?.toLowerCase() === 'armand@hohtatoos.com'
    const adminProfileId = await getAdminProfileId()
    const senderProfileId = isArmand ? profile!.id : adminProfileId
    const effectiveSenderId = senderProfileId  // must equal auth.uid() for RLS to pass

    // Exclude the sender themselves from the recipient list
    let recipients: string[] = []
    if (target === 'all') {
      recipients = profiles.map(p => p.id).filter(id => id !== senderProfileId && id !== adminProfileId)
    } else if (target === 'artists') {
      recipients = profiles
        .filter(p => p.role === 'artist' || p.role === 'manager')
        .map(p => p.id)
        .filter(id => id !== senderProfileId && id !== adminProfileId)
    } else {
      if (!targetId) { setError('Select a recipient.'); setSending(false); return }
      recipients = [targetId]
    }

    if (recipients.length === 0) { setError('No matching recipients found.'); setSending(false); return }

    // ── Find/create conversations under the sender's artist record ──────────
    // Conversations must have artist_id = senderProfileId's artist so that
    // sender_id = auth.uid() satisfies the messages RLS participant check.
    const { data: senderArtist } = senderProfileId
      ? await supabase.from('artists').select('id').eq('profile_id', senderProfileId).maybeSingle()
      : { data: null }

    let convoMap = new Map<string, string>() // profile_id → conversationId

    if (senderArtist) {
      // Batch-fetch existing conversations for all recipients
      const { data: existing } = await supabase
        .from('conversations')
        .select('id, customer_id')
        .eq('artist_id', senderArtist.id)
        .in('customer_id', recipients)

      existing?.forEach(c => convoMap.set(c.customer_id, c.id))

      // Create conversations that don't exist yet
      const missing = recipients.filter(id => !convoMap.has(id))
      if (missing.length > 0) {
        const { data: created } = await supabase
          .from('conversations')
          .insert(missing.map(customer_id => ({ customer_id, artist_id: senderArtist.id })))
          .select('id, customer_id')
        created?.forEach(c => convoMap.set(c.customer_id, c.id))
      }
    }

    // ── Send message into each conversation ───────────────────────────────
    const messageBody = body.trim()
      ? `${title.trim()}\n\n${body.trim()}`
      : title.trim()

    const messageRows = [...convoMap.entries()].map(([, convoId]) => ({
      conversation_id: convoId,
      sender_id: effectiveSenderId,
      body: messageBody,
    }))

    if (messageRows.length > 0) {
      const { error: msgErr } = await supabase.from('messages').insert(messageRows)
      if (msgErr) { setError(msgErr.message); setSending(false); return }
    }

    // ── Build and insert notification rows ────────────────────────────────
    const rows = recipients.map(profile_id => ({
      profile_id,
      title: title.trim(),
      body: body.trim() || null,
      type,
      link: convoMap.has(profile_id) ? `/messages/${convoMap.get(profile_id)}` : null,
    }))

    const { error: err } = await supabase.from('notifications').insert(rows)
    if (err) { setError(err.message); setSending(false); return }

    setTitle(''); setBody(''); setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    setSending(false)
  }

  if (!canSend) return (
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
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
            Notification sent — recipients will see it in HoH Support chat.
          </p>
        )}

        <button className="admin-btn admin-btn--primary" onClick={send} disabled={sending || loading}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px' }}>
          <Send size={14} />
          {sending ? 'Sending…' : 'Send Notification'}
        </button>

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

  const typeLabel = (v: string) => TYPES.find(t => t.value === v)?.label ?? v

  if (!rows.length) return <p className="admin-empty" style={{ padding: 0 }}>No notifications sent yet.</p>

  return (
    <table className="admin-table">
      <thead><tr><th>Title</th><th>Type</th><th>To</th><th>Sent</th></tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td>{r.title}</td>
            <td><span className="admin-badge" style={{ textTransform: 'capitalize' }}>{typeLabel(r.type)}</span></td>
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
