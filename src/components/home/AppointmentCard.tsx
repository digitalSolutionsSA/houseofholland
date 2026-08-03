import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import './AppointmentCard.css'

type Appointment = {
  id: string
  dateLabel: string
  artist: string
  service: string
  avatar: string | null
}

export function AppointmentCard({ appointment }: { appointment: Appointment }) {
  return (
    <Link to="/bookings" className="appointment-card appointment-card--clickable">
      {appointment.avatar
        ? <img src={appointment.avatar} alt="" className="appointment-card__avatar" />
        : <div className="appointment-card__avatar appointment-card__avatar--empty" />}
      <div className="appointment-card__body">
        <p className="appointment-card__when">{appointment.dateLabel}</p>
        <p className="appointment-card__artist">with {appointment.artist}</p>
        <p className="appointment-card__service">{appointment.service}</p>
        <span className="appointment-card__link">
          View Details <ChevronRight size={14} />
        </span>
      </div>
    </Link>
  )
}
