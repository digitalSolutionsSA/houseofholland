import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronRight, User } from 'lucide-react'
import { Logo } from '../components/shared/Logo'
import { FlashDayCard } from '../components/home/FlashDayCard'
import { AppointmentCard } from '../components/home/AppointmentCard'
import { QuickActions } from '../components/home/QuickActions'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import './HomePage.css'

type Appointment = {
  id: string
  dateLabel: string
  artist: string
  service: string
  avatar: string | null
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function HomePage() {
  const { profile } = useAuth()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const [appointment, setAppointment] = useState<Appointment | null>(null)

  useEffect(() => {
    supabase
      .from('bookings')
      .select('id, appointment_at, service, artists(name, avatar_url)')
      .eq('profile_id', profile?.id ?? '')
      .in('status', ['pending', 'confirmed'])
      .gte('appointment_at', new Date().toISOString())
      .order('appointment_at')
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!data) return
        const d = data as any
        setAppointment({
          id: d.id,
          dateLabel: new Date(d.appointment_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit',
          }),
          artist: d.artists?.name ?? 'Artist',
          service: d.service,
          avatar: d.artists?.avatar_url ?? null,
        })
      })
  }, [profile?.id])

  return (
    <div className="page home-page">
      <header className="home-page__header">
        <Link to="/profile" className="home-page__avatar-link" aria-label="Your profile">
          {profile?.avatar_url ? (
            <img
              src={`${profile.avatar_url}?t=${profile.id}`}
              alt="Profile"
              className="home-page__avatar"
            />
          ) : (
            <div className="home-page__avatar home-page__avatar--empty">
              <User size={24} strokeWidth={1.5} color="var(--gold)" />
            </div>
          )}
        </Link>
        <div className="home-page__welcome home-page__welcome--inline">
          <p>{greeting()},</p>
          <h1>{firstName}</h1>
        </div>
        <button type="button" className="home-page__bell" aria-label="Notifications">
          <Bell size={22} strokeWidth={1.5} />
          <span className="home-page__bell-dot" />
        </button>
      </header>

      <section className="home-page__welcome home-page__welcome--mobile">
        <p>{greeting()},</p>
        <h1>{firstName}</h1>
      </section>

      <div className="home-page__desktop-grid">
        <section className="home-page__section">
          <FlashDayCard />
        </section>

        {appointment && (
          <section className="home-page__section home-page__section--side">
            <div className="home-page__section-head">
              <h2>Upcoming Appointment</h2>
              <Link to="/bookings">
                View all <ChevronRight size={14} />
              </Link>
            </div>
            <AppointmentCard appointment={appointment} />
          </section>
        )}
      </div>

      <section className="home-page__section">
        <h2 className="home-page__section-title">Quick Actions</h2>
        <QuickActions />
      </section>
    </div>
  )
}
