import { Check, Star, Zap, Crown, Smartphone, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './MembershipPage.css'

// Update these when the app is published to the stores
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.houseofhollandtattoos'
const IOS_URL = 'https://apps.apple.com/app/house-of-holland-tattoos/id000000000'

function qr(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=8`
}

const TIERS = [
  {
    id: 'free',
    name: 'Member',
    Icon: Star,
    price: null,
    priceLabel: 'Free',
    tagline: 'Get started with the basics',
    benefits: [
      'Book appointments',
      'Digital Tattoo Vault',
      'View Flash Events',
      'Basic app access',
    ],
    cta: 'Current Plan',
    ctaDisabled: true,
    featured: false,
  },
  {
    id: 'black-card',
    name: 'Black Card',
    Icon: Zap,
    price: 6.99,
    priceLabel: '$6.99 / mo',
    tagline: 'Priority access & studio perks',
    badge: 'Most Popular',
    benefits: [
      'Everything in Member',
      'Priority Booking (24–48h early access)',
      'Early Access to Flash Events',
      '10% Off Merchandise',
      'Exclusive Member Events',
    ],
    cta: 'Upgrade to Black Card',
    ctaDisabled: false,
    featured: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    Icon: Crown,
    price: 9.99,
    priceLabel: '$9.99 / mo',
    tagline: 'Full VIP treatment',
    benefits: [
      'Everything in Black Card',
      'Free Annual Touch-Up',
      'Birthday Gift',
      'Dedicated Artist Consultation',
      'Full VIP Access to All Perks',
    ],
    cta: 'Upgrade to Elite',
    ctaDisabled: false,
    featured: false,
  },
]

export function MembershipPage() {
  const { profile } = useAuth()
  const isArtist = profile?.role === 'artist' || profile?.role === 'manager'

  if (isArtist) return (
    <div className="page page--no-nav membership-page">
      <header className="membership-page__header">
        <span className="membership-page__num">09</span>
        <span>MEMBERSHIP</span>
      </header>

      <div className="membership-page__intro">
        <p className="membership-page__brand">HOUSE OF HOLLAND</p>
        <h1 className="membership-page__title">Client Membership Tiers</h1>
        <p className="membership-page__sub">Share these tiers with your clients to grow their loyalty.</p>
      </div>

      <div className="membership-page__tiers">
        {TIERS.map(({ id, name, Icon, priceLabel, tagline, badge, benefits, featured }) => (
          <div key={id} className={['membership-tier', featured ? 'membership-tier--featured' : '', id === 'elite' ? 'membership-tier--elite' : ''].filter(Boolean).join(' ')}>
            {badge && <span className="membership-tier__badge">{badge}</span>}
            <div className="membership-tier__top">
              <div className="membership-tier__icon-wrap"><Icon size={20} strokeWidth={1.5} /></div>
              <div>
                <div className="membership-tier__name">{name}</div>
                <div className="membership-tier__tagline">{tagline}</div>
              </div>
              <div className="membership-tier__price">{priceLabel}</div>
            </div>
            <ul className="membership-tier__benefits">
              {benefits.map((b, i) => (
                <li key={i}><Check size={14} strokeWidth={2.5} /><span>{b}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* App Download QR Codes */}
      <div className="membership-page__download">
        <div className="membership-page__download-head">
          <Smartphone size={18} strokeWidth={1.5} />
          <h2>Download the App</h2>
        </div>
        <p className="membership-page__download-sub">Share these QR codes with clients so they can download the House of Holland app.</p>
        <div className="membership-page__qr-row">
          <div className="membership-page__qr-card">
            <img src={qr(ANDROID_URL)} alt="Android QR code" className="membership-page__qr-img" />
            <p className="membership-page__qr-label">Google Play</p>
            <p className="membership-page__qr-platform">Android</p>
          </div>
          <div className="membership-page__qr-card">
            <img src={qr(IOS_URL)} alt="iOS QR code" className="membership-page__qr-img" />
            <p className="membership-page__qr-label">App Store</p>
            <p className="membership-page__qr-platform">iPhone / iPad</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page page--no-nav membership-page">
      <header className="membership-page__header">
        <span className="membership-page__num">09</span>
        <span>MEMBERSHIP</span>
      </header>

      <div className="membership-page__intro">
        <p className="membership-page__brand">HOUSE OF HOLLAND</p>
        <h1 className="membership-page__title">Membership</h1>
      </div>

      <div className="membership-page__coming-soon">
        <div className="membership-page__cs-icon">
          <Clock size={36} strokeWidth={1.2} />
        </div>
        <h2 className="membership-page__cs-title">Coming Soon</h2>
        <p className="membership-page__cs-body">
          Exclusive membership tiers are on their way. Black Card and Elite members will unlock
          priority booking, flash event early access, merchandise discounts, and full VIP perks.
        </p>
        <div className="membership-page__cs-tiers">
          <div className="membership-page__cs-tier">
            <Star size={16} strokeWidth={1.5} />
            <span>Member</span>
            <span className="membership-page__cs-price">Free</span>
          </div>
          <div className="membership-page__cs-tier membership-page__cs-tier--gold">
            <Zap size={16} strokeWidth={1.5} />
            <span>Black Card</span>
            <span className="membership-page__cs-price">$6.99 / mo</span>
          </div>
          <div className="membership-page__cs-tier membership-page__cs-tier--elite">
            <Crown size={16} strokeWidth={1.5} />
            <span>Elite</span>
            <span className="membership-page__cs-price">$9.99 / mo</span>
          </div>
        </div>
      </div>
    </div>
  )
}
