import { Link } from 'react-router-dom'
import {
  CalendarCheck,
  Zap,
  FilePen,
  Shirt,
  Star,
  Crown,
} from 'lucide-react'
import { Logo } from '../components/shared/Logo'
import { GradientButton } from '../components/shared/GradientButton'
import { BrandBackground } from '../components/shared/BrandBackground'
const overviewFeatures = [
  { id: 'book',       title: 'BOOK',        description: 'Appointments made simple',     icon: 'calendar' as const },
  { id: 'flash',      title: 'FLASH QUEUE', description: 'Join the queue from anywhere', icon: 'zap' as const },
  { id: 'consent',    title: 'CONSENT',     description: 'Sign forms in seconds',        icon: 'file' as const },
  { id: 'merch',      title: 'MERCH',       description: 'Exclusive drops & apparel',    icon: 'shirt' as const },
  { id: 'loyalty',    title: 'LOYALTY',     description: 'Earn rewards & unlock perks',  icon: 'star' as const },
  { id: 'membership', title: 'MEMBERSHIP',  description: 'Join the Club. Unlock more.',  icon: 'crown' as const },
]
import './OverviewPage.css'

const iconMap = {
  calendar: CalendarCheck,
  zap: Zap,
  file: FilePen,
  shirt: Shirt,
  star: Star,
  crown: Crown,
}

export function OverviewPage() {
  return (
    <div className="page page--no-nav page--flush overview-page">
      <BrandBackground />
      <div className="overview-page__content">
        <header className="overview-page__brand">
          <Logo variant="full" height={168} forceSrc="/logo-gold.webp" />
        </header>

        <section className="overview-page__intro">
          <p className="overview-page__label">APP OVERVIEW</p>
          <p className="overview-page__copy">
            The House of Holland App connects artists and clients in a seamless, premium
            experience. Book tattoos, join flash events, shop merch, sign consent forms,
            earn rewards and so much more.
          </p>
        </section>

        <section className="overview-page__features">
          {overviewFeatures.map((feature) => {
            const Icon = iconMap[feature.icon]
            return (
              <div key={feature.id} className="overview-feature">
                <span className="overview-feature__icon">
                  <Icon size={20} strokeWidth={1.5} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            )
          })}
        </section>

        <footer className="overview-page__footer">
          <Link to="/login">
            <GradientButton>GET STARTED</GradientButton>
          </Link>
          <p className="overview-page__signin">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
