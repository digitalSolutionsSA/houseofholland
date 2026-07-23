import {
  Star,
  Shield,
  Percent,
  Award,
  Gift,
  Users,
  Archive,
} from 'lucide-react'
import { MembershipCard3D } from '../components/three/MembershipCard3D'
import { GradientButton } from '../components/shared/GradientButton'
const membershipBenefits = [
  { id: '1', label: 'Priority Booking (24-48h Early Access)', icon: 'star' as const },
  { id: '2', label: 'Early Access to Flash Events',           icon: 'shield' as const },
  { id: '3', label: '10% Off Merchandise',                   icon: 'percent' as const },
  { id: '4', label: 'Free Annual Touch-Up',                  icon: 'ribbon' as const },
  { id: '5', label: 'Birthday Gift',                         icon: 'gift' as const },
  { id: '6', label: 'Exclusive Flash & Member Events',       icon: 'users' as const },
  { id: '7', label: 'Digital Tattoo Vault',                  icon: 'vault' as const },
]
import './MembershipPage.css'

const iconMap = {
  star: Star,
  shield: Shield,
  percent: Percent,
  ribbon: Award,
  gift: Gift,
  users: Users,
  vault: Archive,
}

export function MembershipPage() {
  return (
    <div className="page page--no-nav membership-page">
      <header className="membership-page__header">
        <span className="membership-page__num">09</span>
        <span>MEMBERSHIP (BLACK CARD)</span>
      </header>

      <div className="membership-page__frame">
        <p className="membership-page__brand">HOUSE OF HOLLAND</p>
        <h1>BLACK CARD</h1>
        <MembershipCard3D />

        <h2 className="membership-page__benefits-title">MEMBER BENEFITS</h2>
        <ul className="membership-page__benefits">
          {membershipBenefits.map((benefit) => {
            const Icon = iconMap[benefit.icon]
            return (
              <li key={benefit.id}>
                <Icon size={18} strokeWidth={1.5} />
                <span>{benefit.label}</span>
              </li>
            )
          })}
        </ul>

        <GradientButton>JOIN NOW — $4.99 / MONTH</GradientButton>
      </div>
    </div>
  )
}
