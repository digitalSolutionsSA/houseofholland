import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, AlertTriangle, CheckCircle2, ChevronRight, CreditCard, ClipboardList, Users, Bell, TrendingUp } from 'lucide-react'
import { NotificationPanel } from '../components/shared/NotificationPanel'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './ArtistHomePage.css'

type ApptRow = {
  id: string
  appointment_at: string
  service: string
  client: string
  status: string
  checked_in_at: string | null
  deposit_link: string | null
}

function isToday(iso: string) {
  const d = new Date(iso), t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

function isTomorrow(iso: string) {
  const d = new Date(iso), t = new Date()
  t.setDate(t.getDate() + 1)
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function ArtistHomePage() {
  const { profile } = useAuth()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const [, setArtistId] = useState<string | null>(null)
  const [upcoming, setUpcoming] = useState<ApptRow[]>([])
  const [monthCount, setMonthCount] = useState(0)
  const [boothRate, setBoothRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    async function load() {
      // Find artist record
      const { data: artist } = await supabase
        .from('artists')
        .select('id')
        .eq('profile_id', profile!.id)
        .maybeSingle()

      const aid = artist?.id ?? null
      setArtistId(aid)
      if (!aid) { setLoading(false); return }

      const now = new Date()
      const in30 = new Date(now.getTime() + 30 * 86400000)

      const [bookingsRes, monthRes, rentRes] = await Promise.all([
        // Upcoming bookings next 30 days
        supabase
          .from('bookings')
          .select('id, appointment_at, service, status, checked_in_at, deposit_link, profiles(full_name)')
          .eq('artist_id', aid)
          .in('status', ['pending', 'accepted', 'confirmed'])
          .gte('appointment_at', now.toISOString())
          .lte('appointment_at', in30.toISOString())
          .order('appointment_at')
          .limit(30),

        // Completed this month
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('artist_id', aid)
          .eq('status', 'completed')
          .gte('appointment_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString()),

        // Booth rent
        supabase.from('booth_rent').select('weekly_rate').eq('artist_id', aid).maybeSingle(),
      ])

      const rows: ApptRow[] = (bookingsRes.data ?? []).map((b: any) => ({
        id: b.id,
        appointment_at: b.appointment_at,
        service: b.service,
        client: b.profiles?.full_name ?? 'Client',
        status: b.status,
        checked_in_at: b.checked_in_at ?? null,
        deposit_link: b.deposit_link ?? null,
      }))

      setUpcoming(rows)
      setMonthCount(monthRes.count ?? 0)
      setBoothRate(rentRes.data?.weekly_rate ?? null)
      setLoading(false)
    }
    load()
  }, [profile?.id])

  const todayAppts = upcoming.filter(b => isToday(b.appointment_at))
  const tomorrowAppts = upcoming.filter(b => isTomorrow(b.appointment_at))
  const restAppts = upcoming.filter(b => !isToday(b.appointment_at) && !isTomorrow(b.appointment_at))

  const pendingCount = upcoming.filter(b => b.status === 'pending').length
  const awaitingDeposit = upcoming.filter(b => b.status === 'accepted')
  const todayNotCheckedIn = todayAppts.filter(b => b.status === 'confirmed' && !b.checked_in_at)
  const confirmedCount = upcoming.filter(b => b.status === 'confirmed').length

  return (
    <div className="page artist-home">
      {/* Header */}
      <header className="artist-home__header">
        <Link to="/profile" className="artist-home__avatar-link" aria-label="Your profile">
          {profile?.avatar_url ? (
            <img src={`${profile.avatar_url}?t=${profile.id}`} alt="Profile" className="artist-home__avatar" />
          ) : (
            <div className="artist-home__avatar artist-home__avatar--empty" />
          )}
        </Link>
        <div className="artist-home__greeting">
          <p className="artist-home__greeting-sub">{greeting()},</p>
          <h1 className="artist-home__greeting-name">{firstName}</h1>
        </div>
        <NotificationPanel />
      </header>

      <div className="artist-home__body">

        {/* Stats strip */}
        <div className="artist-home__stats">
          <div className="artist-home__stat">
            <span className="artist-home__stat-val">{pendingCount}</span>
            <span className="artist-home__stat-label">Pending</span>
          </div>
          <div className="artist-home__stat-div" />
          <div className="artist-home__stat">
            <span className="artist-home__stat-val">{confirmedCount}</span>
            <span className="artist-home__stat-label">Confirmed</span>
          </div>
          <div className="artist-home__stat-div" />
          <div className="artist-home__stat">
            <span className="artist-home__stat-val">{monthCount}</span>
            <span className="artist-home__stat-label">Done this month</span>
          </div>
        </div>

        {/* Reminders */}
        {(pendingCount > 0 || awaitingDeposit.length > 0 || todayNotCheckedIn.length > 0 || boothRate !== null) && (
          <section className="artist-home__section">
            <h2 className="artist-home__section-title">
              <Bell size={14} strokeWidth={2} /> Reminders
            </h2>
            <div className="artist-home__reminders">
              {pendingCount > 0 && (
                <Link to="/admin/bookings" className="artist-home__reminder artist-home__reminder--urgent">
                  <AlertTriangle size={15} strokeWidth={2} className="artist-home__rem-icon" />
                  <div>
                    <p className="artist-home__rem-title">{pendingCount} booking {pendingCount === 1 ? 'request' : 'requests'} awaiting your response</p>
                    <p className="artist-home__rem-sub">Accept or decline in Appointments →</p>
                  </div>
                </Link>
              )}
              {awaitingDeposit.map(b => (
                <div key={b.id} className="artist-home__reminder artist-home__reminder--warn">
                  <CreditCard size={15} strokeWidth={2} className="artist-home__rem-icon" />
                  <div>
                    <p className="artist-home__rem-title">Chase deposit — {b.client}</p>
                    <p className="artist-home__rem-sub">{b.service} · {dateLabel(b.appointment_at)} at {timeLabel(b.appointment_at)}</p>
                  </div>
                </div>
              ))}
              {todayNotCheckedIn.map(b => (
                <div key={b.id} className="artist-home__reminder artist-home__reminder--info">
                  <ClipboardList size={15} strokeWidth={2} className="artist-home__rem-icon" />
                  <div>
                    <p className="artist-home__rem-title">{b.client} hasn't checked in yet</p>
                    <p className="artist-home__rem-sub">{b.service} · {timeLabel(b.appointment_at)} today</p>
                  </div>
                </div>
              ))}
              {boothRate !== null && (
                <div className="artist-home__reminder artist-home__reminder--info">
                  <TrendingUp size={15} strokeWidth={2} className="artist-home__rem-icon" />
                  <div>
                    <p className="artist-home__rem-title">Booth rent — R{boothRate}/week</p>
                    <p className="artist-home__rem-sub">Check your booth rent balance →</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Today's Schedule */}
        <section className="artist-home__section">
          <div className="artist-home__section-head">
            <h2 className="artist-home__section-title">
              <CalendarDays size={14} strokeWidth={2} /> Today
            </h2>
            <Link to="/admin/bookings" className="artist-home__see-all">All bookings <ChevronRight size={13} /></Link>
          </div>
          {loading ? (
            <p className="artist-home__empty">Loading…</p>
          ) : todayAppts.length === 0 ? (
            <p className="artist-home__empty">Nothing scheduled today.</p>
          ) : (
            <div className="artist-home__appt-list">
              {todayAppts.map(b => (
                <ApptCard key={b.id} appt={b} />
              ))}
            </div>
          )}
        </section>

        {/* Tomorrow */}
        {tomorrowAppts.length > 0 && (
          <section className="artist-home__section">
            <h2 className="artist-home__section-title">
              <Clock size={14} strokeWidth={2} /> Tomorrow
            </h2>
            <div className="artist-home__appt-list">
              {tomorrowAppts.map(b => (
                <ApptCard key={b.id} appt={b} compact />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming this week / month */}
        {restAppts.length > 0 && (
          <section className="artist-home__section">
            <h2 className="artist-home__section-title">
              <Users size={14} strokeWidth={2} /> Upcoming
            </h2>
            <div className="artist-home__appt-list">
              {restAppts.slice(0, 8).map(b => (
                <ApptCard key={b.id} appt={b} compact />
              ))}
            </div>
          </section>
        )}

        {/* Quick links */}
        <section className="artist-home__section">
          <h2 className="artist-home__section-title">Quick Access</h2>
          <div className="artist-home__quick">
            <Link to="/admin/bookings" className="artist-home__quick-item">
              <CalendarDays size={20} strokeWidth={1.5} />
              <span>Appointments</span>
            </Link>
            <Link to="/admin/schedule" className="artist-home__quick-item">
              <Clock size={20} strokeWidth={1.5} />
              <span>Schedule</span>
            </Link>
            <Link to="/admin/portfolio" className="artist-home__quick-item">
              <TrendingUp size={20} strokeWidth={1.5} />
              <span>Portfolio</span>
            </Link>
            <Link to="/admin" className="artist-home__quick-item">
              <Users size={20} strokeWidth={1.5} />
              <span>Admin Panel</span>
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}

function ApptCard({ appt, compact }: { appt: ApptRow; compact?: boolean }) {
  const statusColor = appt.status === 'pending' ? 'var(--gold)' : appt.status === 'accepted' ? '#f59e0b' : '#6bffb8'
  const checkedIn = !!appt.checked_in_at

  return (
    <div className={`artist-home__appt${compact ? ' artist-home__appt--compact' : ''}`}>
      <div className="artist-home__appt-time">
        {!compact && <span className="artist-home__appt-hour">{new Date(appt.appointment_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
        {compact && <span className="artist-home__appt-date">{dateLabel(appt.appointment_at)}</span>}
        {compact && <span className="artist-home__appt-hour">{new Date(appt.appointment_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
      </div>
      <div className="artist-home__appt-body">
        <p className="artist-home__appt-client">{appt.client}</p>
        <p className="artist-home__appt-service">{appt.service}</p>
      </div>
      <div className="artist-home__appt-right">
        <span className="artist-home__appt-status" style={{ color: statusColor }}>{appt.status}</span>
        {checkedIn && <CheckCircle2 size={13} strokeWidth={2} style={{ color: '#6bffb8', marginTop: 3 }} />}
      </div>
    </div>
  )
}
