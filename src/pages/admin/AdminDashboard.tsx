import { useEffect, useState } from 'react'
import { MessageCircle, Mail, LifeBuoy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { openSupportChat, SUPPORT_EMAIL } from '../../lib/support'
import './AdminDashboard.css'

export function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ artists: 0, merch: 0, flash: 0, bookings: 0 })
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')

  useEffect(() => {
    async function load() {
      const [a, m, f, b] = await Promise.all([
        supabase.from('artists').select('id', { count: 'exact', head: true }),
        supabase.from('merch').select('id', { count: 'exact', head: true }),
        supabase.from('flash_events').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        artists: a.count ?? 0,
        merch: m.count ?? 0,
        flash: f.count ?? 0,
        bookings: b.count ?? 0,
      })
    }
    load()
  }, [])

  async function handleMessageSupport() {
    if (!user) return
    setChatLoading(true)
    setChatError('')
    const result = await openSupportChat(user.id, navigate)
    setChatLoading(false)
    if (result === 'email') {
      setChatError('In-app chat is temporarily unavailable. Please use the email link below.')
    }
    if (result === 'self') {
      setChatError('You are the support contact — no need to message yourself!')
    }
  }

  return (
    <div>
      <div className="admin-page__header">
        <h1 className="admin-page__title">Dashboard</h1>
      </div>
      <div className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat__value">{stats.artists}</div>
          <div className="admin-stat__label">Artists</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{stats.merch}</div>
          <div className="admin-stat__label">Merch Items</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{stats.flash}</div>
          <div className="admin-stat__label">Flash Events</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{stats.bookings}</div>
          <div className="admin-stat__label">Bookings</div>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 32 }}>
        Use the sidebar to manage artists, merch, and flash events.
      </p>

      {/* Contact Support card */}
      <div className="dash-support">
        <div className="dash-support__icon">
          <LifeBuoy size={26} strokeWidth={1.5} />
        </div>
        <div className="dash-support__body">
          <p className="dash-support__title">Need help or have a question?</p>
          <p className="dash-support__sub">
            Message the studio directly inside the app, or send us an email.
          </p>
          {chatError && <p className="dash-support__error">{chatError}</p>}
          <div className="dash-support__actions">
            <button
              type="button"
              className="dash-support__btn dash-support__btn--primary"
              onClick={handleMessageSupport}
              disabled={chatLoading}
            >
              <MessageCircle size={15} strokeWidth={1.5} />
              {chatLoading ? 'Opening chat…' : 'Message Support'}
            </button>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="dash-support__btn dash-support__btn--email"
            >
              <Mail size={15} strokeWidth={1.5} />
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
