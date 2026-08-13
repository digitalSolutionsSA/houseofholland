import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Clock, AlertTriangle, CheckCircle2, ChevronRight, CreditCard, ClipboardList, Users, Bell, TrendingUp, Eye } from 'lucide-react'
import { NotificationPanel } from '../components/shared/NotificationPanel'
import { ArtistReferralCard } from '../components/home/ArtistReferralCard'
import { MyCustomersSection } from '../components/home/MyCustomersSection'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { studioHour, isStudioToday, isStudioTomorrow, studioMidnightUTC, STUDIO_TZ } from '../lib/studioTime'
import './ArtistHomePage.css'

const CUSTOMER_VIEW_EMAIL = 'info@digitalsolutionssa.co.za'

type ApptRow = {
  id: string
  appointment_at: string
  service: string
  client: string
  status: string
  checked_in_at: string | null
  deposit_link: string | null
}

function isToday(iso: string) { return isStudioToday(iso) }
function isTomorrow(iso: string) { return isStudioTomorrow(iso) }

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: STUDIO_TZ })
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: STUDIO_TZ })
}

function greeting() {
  const h = studioHour()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function ArtistHomePage() {
  const { profile, realProfile, toggleCustomerView } = useAuth()
  const navigate = useNavigate()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const canToggleCustomerView = realProfile?.email?.toLowerCase() === CUSTOMER_VIEW_EMAIL

  function enterCustomerView() {
    toggleCustomerView()
    navigate('/home')
  }

  const [, setArtistId] = useState<string | null>(null)
  const [upcoming, setUpcoming] = useState<ApptRow[]>([])
  const [monthCount, setMonthCount] = useState(0)
  const [boothRate, setBoothRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [reminderSent, setReminderSent] = useState<Set<string>>(new Set())

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
      const startOfToday = studioMidnightUTC()
      const in30 = new Date(now.getTime() + 30 * 86400000)

      const [bookingsRes, monthRes, rentRes] = await Promise.all([
        // Upcoming bookings from start of today (include earlier-today appointments)
        supabase
          .from('bookings')
          .select('id, appointment_at, service, status, checked_in_at, deposit_link, profiles(full_name)')
          .eq('artist_id', aid)
          .in('status', ['pending', 'accepted', 'confirmed'])
          .gte('appointment_at', startOfToday)
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

  async function sendCheckinReminder(appt: ApptRow) {
    // We need the booking's profile_id — fetch it
    const { data } = await supabase
      .from('bookings')
      .select('profile_id')
      .eq('id', appt.id)
      .single()
    if (!data?.profile_id) return
    await supabase.from('notifications').insert({
      profile_id: data.profile_id,
      title: 'Check-In Reminder',
      body: `Your ${appt.service} appointment is today at ${timeLabel(appt.appointment_at)}. Please check in when you arrive at the studio.`,
      type: 'booking',
    })
    setReminderSent(prev => new Set(prev).add(appt.id))
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {canToggleCustomerView && (
            <button
              onClick={enterCustomerView}
              title="Switch to customer view"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: '50%',
                background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
                transition: 'color 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.color = '#f59e0b')}
              onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Eye size={22} strokeWidth={1.5} />
            </button>
          )}
          <NotificationPanel />
        </div>
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="artist-home__rem-title">{b.client} hasn't checked in yet</p>
                    <p className="artist-home__rem-sub">{b.service} · {timeLabel(b.appointment_at)} today</p>
                    <button
                      className={`artist-home__remind-btn${reminderSent.has(b.id) ? ' artist-home__remind-btn--sent' : ''}`}
                      disabled={reminderSent.has(b.id)}
                      onClick={() => sendCheckinReminder(b)}
                    >
                      {reminderSent.has(b.id) ? '✓ Reminder sent' : 'Send reminder'}
                    </button>
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

        {/* Referral earnings widget */}
        <ArtistReferralCard />

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

        {/* Customers section — referred customers for artists, all customers for admin */}
        <MyCustomersSection />

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
        {!compact && <span className="artist-home__appt-hour">{new Date(appt.appointment_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: STUDIO_TZ })}</span>}
        {compact && <span className="artist-home__appt-date">{dateLabel(appt.appointment_at)}</span>}
        {compact && <span className="artist-home__appt-hour">{new Date(appt.appointment_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: STUDIO_TZ })}</span>}
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
