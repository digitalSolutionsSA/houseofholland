import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { AppointmentCard } from '../components/home/AppointmentCard'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './BookingsPage.css'

type Appointment = {
  id: string
  dateLabel: string
  artist: string
  service: string
  avatar: string | null
}

export function BookingsPage() {
  const { profile } = useAuth()
  const [upcoming, setUpcoming] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('bookings')
      .select('id, appointment_at, service, artists(name, avatar_url)')
      .eq('profile_id', profile.id)
      .in('status', ['pending', 'confirmed'])
      .gte('appointment_at', new Date().toISOString())
      .order('appointment_at')
      .then(({ data }) => {
        setUpcoming(
          (data ?? []).map((d: any) => ({
            id: d.id,
            dateLabel: new Date(d.appointment_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: 'numeric', minute: '2-digit',
            }),
            artist: d.artists?.name ?? 'Artist',
            service: d.service,
            avatar: d.artists?.avatar_url ?? null,
          }))
        )
        setLoading(false)
      })
  }, [profile?.id])

  return (
    <div className="page bookings-page">
      <PageHeader title="Bookings" />
      <div className="bookings-page__content">
        <Link to="/bookings/select-time" className="bookings-page__cta">
          Book new appointment
          <ChevronRight size={18} strokeWidth={1.5} />
        </Link>
        <h2>Upcoming</h2>
        {loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading…</p>}
        {!loading && upcoming.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No upcoming bookings.</p>
        )}
        {upcoming.map(appt => (
          <AppointmentCard key={appt.id} appointment={appt} />
        ))}
      </div>
    </div>
  )
}
