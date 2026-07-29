import { Check, Star, Zap, Crown } from 'lucide-react'
import './MembershipPage.css'

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
  return (
    <div className="page page--no-nav membership-page">
      <header className="membership-page__header">
        <span className="membership-page__num">09</span>
        <span>MEMBERSHIP</span>
      </header>

      <div className="membership-page__intro">
        <p className="membership-page__brand">HOUSE OF HOLLAND</p>
        <h1 className="membership-page__title">Choose Your Tier</h1>
        <p className="membership-page__sub">Upgrade anytime. Cancel anytime.</p>
      </div>

      <div className="membership-page__tiers">
        {TIERS.map(({ id, name, Icon, priceLabel, tagline, badge, benefits, cta, ctaDisabled, featured }) => (
          <div
            key={id}
            className={[
              'membership-tier',
              featured ? 'membership-tier--featured' : '',
              id === 'elite' ? 'membership-tier--elite' : '',
            ].filter(Boolean).join(' ')}
          >
            {badge && <span className="membership-tier__badge">{badge}</span>}

            <div className="membership-tier__top">
              <div className="membership-tier__icon-wrap">
                <Icon size={20} strokeWidth={1.5} />
              </div>
              <div>
                <div className="membership-tier__name">{name}</div>
                <div className="membership-tier__tagline">{tagline}</div>
              </div>
              <div className="membership-tier__price">{priceLabel}</div>
            </div>

            <ul className="membership-tier__benefits">
              {benefits.map((b, i) => (
                <li key={i}>
                  <Check size={14} strokeWidth={2.5} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <button
              className={[
                'membership-tier__cta',
                ctaDisabled ? 'membership-tier__cta--disabled' : '',
                featured ? 'membership-tier__cta--featured' : '',
              ].filter(Boolean).join(' ')}
              disabled={ctaDisabled}
            >
              {cta}
            </button>
          </div>
        ))}
      </div>

      <p className="membership-page__legal">
        Paid plans billed monthly. Cancel at any time from your profile.
      </p>
    </div>
  )
}
