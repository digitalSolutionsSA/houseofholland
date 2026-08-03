import { useEffect, useRef, useState, type ReactElement } from 'react'
import { Bell, X, Check, CheckCheck, Zap, CalendarCheck, Info, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import './NotificationPanel.css'

type Notification = {
  id: string
  title: string
  body: string | null
  type: string
  read_at: string | null
  created_at: string
}

const TYPE_ICON: Record<string, ReactElement> = {
  flash:   <Zap size={14} strokeWidth={2} />,
  booking: <CalendarCheck size={14} strokeWidth={1.5} />,
  alert:   <AlertCircle size={14} strokeWidth={1.5} />,
  info:    <Info size={14} strokeWidth={1.5} />,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NotificationPanel() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = items.filter(n => !n.read_at).length

  async function load() {
    if (!profile?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (!profile?.id) return
    load()

    // Realtime subscription — no server-side filter, client-side check for reliability
    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new as Notification & { profile_id: string }
          if (n.profile_id !== profile.id) return
          setItems(prev => [n, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
  }

  async function markAllRead() {
    if (!profile?.id) return
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('profile_id', profile.id)
      .is('read_at', null)
    setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
  }

  return (
    <div className="notif-wrap" ref={panelRef}>
      {/* ── Bell trigger ── */}
      <button
        type="button"
        className="notif-bell"
        aria-label="Notifications"
        onClick={() => { setOpen(o => !o); if (!open) load() }}
      >
        <Bell size={22} strokeWidth={1.5} />
        {unread > 0 && (
          <span className="notif-bell__badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* ── Drawer ── */}
      <div className={`notif-panel${open ? ' notif-panel--open' : ''}`} role="dialog" aria-label="Notifications">
        <div className="notif-panel__head">
          <span className="notif-panel__title">Notifications</span>
          <div className="notif-panel__head-actions">
            {unread > 0 && (
              <button className="notif-panel__mark-all" onClick={markAllRead} title="Mark all as read">
                <CheckCheck size={15} />
              </button>
            )}
            <button className="notif-panel__close" onClick={() => setOpen(false)}>
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="notif-panel__body">
          {loading && <p className="notif-empty">Loading…</p>}
          {!loading && items.length === 0 && (
            <div className="notif-empty">
              <Bell size={28} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>You're all caught up</p>
            </div>
          )}
          {items.map(n => (
            <div
              key={n.id}
              className={`notif-item notif-item--${n.type ?? 'info'}${n.read_at ? ' notif-item--read' : ''}`}
            >
              <span className="notif-item__icon">
                {TYPE_ICON[n.type] ?? TYPE_ICON.info}
              </span>
              <div className="notif-item__body">
                <p className="notif-item__title">{n.title}</p>
                {n.body && <p className="notif-item__desc">{n.body}</p>}
                <p className="notif-item__time">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read_at && (
                <button className="notif-item__read-btn" onClick={() => markRead(n.id)} title="Mark as read">
                  <Check size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {open && <div className="notif-backdrop" onClick={() => setOpen(false)} />}
    </div>
  )
}
