import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Star, Zap, Crown, Smartphone, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useMembership } from '../hooks/useMembership'
import { supabase } from '../lib/supabase'
import './MembershipPage.css'

const ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.houseofhollandtattoos'
const IOS_URL     = 'https://apps.apple.com/app/house-of-holland-tattoos/id000000000'

function qr(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=8`
}

const TIERS = [
  {
    id: 'free' as const,
    name: 'Free',
    Icon: Star,
    priceLabel: 'Free',
    zarLabel: null,
    tagline: 'Essential studio access',
    badge: undefined as string | undefined,
    benefits: [
      'Artist appointments',
      'Appointment reminders — 1 day & 2 hours before',
      'In-app deposits',
      'Digital consent form',
      'Merch & aftercare shop access',
      'Basic flash queue (on-the-day notifications)',
    ],
    featured: false,
    isTop: false,
  },
  {
    id: 'premium' as const,
    name: 'Premium',
    Icon: Zap,
    priceLabel: '$4.99 / mo',
    zarLabel: null,
    tagline: 'Early access & rewards',
    badge: 'Most Popular',
    benefits: [
      'Everything in Free',
      'Flash queue advanced — 2 day prior notice',
      '7.5% shop discount',
      'Loyalty rewards (point system)',
      'Tattoo Vault — up to 3 tattoos',
      'Member-only promotions',
      'Tattoo Passport',
      'Custom app theme — Premium red',
    ],
    featured: true,
    isTop: false,
  },
  {
    id: 'black-card' as const,
    name: 'Black Card',
    Icon: Crown,
    priceLabel: '$6.99 / mo',
    zarLabel: null,
    tagline: 'Full VIP treatment',
    badge: undefined as string | undefined,
    benefits: [
      'Everything in Premium',
      'Flash queue VIP — week notice of flash days',
      'Unlimited Tattoo Vault',
      '15% shop discount',
      'Higher loyalty rewards multiplier',
      'Birthday gifts',
      'Tattoo Passport',
      'Custom app theme — Black Card gold',
    ],
    featured: false,
    isTop: true,
  },
] as const

const TIER_IDS = ['free', 'premium', 'black-card'] as const

export function MembershipPage() {
  const { profile } = useAuth()
  const { tier } = useMembership()
  const [searchParams] = useSearchParams()
  const paymentStatus = searchParams.get('status')

  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)

  const isArtist = profile?.role === 'artist' || profile?.role === 'manager'

  async function handleUpgrade(targetId: 'premium' | 'black-card') {
    setUpgrading(targetId)
    setUpgradeError(null)
    try {
      const { data, error } = await supabase.functions.invoke('create-payfast-payment', {
        body: {
          tier:       targetId,
          return_url: window.location.origin + '/membership?status=success',
          cancel_url: window.location.origin + '/membership?status=cancelled',
        },
      })
      if (error) throw new Error(error.message)

      // Build a hidden form and POST it to PayFast — this is the standard PayFast redirect method
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = data.payfast_url
      Object.entries(data.params as Record<string, string>).forEach(([k, v]) => {
        const input = document.createElement('input')
        input.type  = 'hidden'
        input.name  = k
        input.value = v
        form.appendChild(input)
      })
      document.body.appendChild(form)
      form.submit()
    } catch (err: any) {
      setUpgradeError('Something went wrong. Please try again.')
      console.error(err)
      setUpgrading(null)
    }
  }

  // ── Artist view ──────────────────────────────────────────────────────────
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
        {TIERS.map(({ id, name, Icon, priceLabel, zarLabel, tagline, badge, benefits, featured, isTop }) => (
          <div key={id} className={[
            'membership-tier',
            featured ? 'membership-tier--featured' : '',
            isTop    ? 'membership-tier--top'      : '',
          ].filter(Boolean).join(' ')}>
            {badge && <span className="membership-tier__badge">{badge}</span>}
            <div className="membership-tier__top">
              <div className="membership-tier__icon-wrap"><Icon size={20} strokeWidth={1.5} /></div>
              <div>
                <div className="membership-tier__name">{name}</div>
                <div className="membership-tier__tagline">{tagline}</div>
              </div>
              <div className="membership-tier__price-col">
                <span className="membership-tier__price">{priceLabel}</span>
                {zarLabel && <span className="membership-tier__price-zar">{zarLabel}</span>}
              </div>
            </div>
            <ul className="membership-tier__benefits">
              {benefits.map((b, i) => (
                <li key={i}><Check size={14} strokeWidth={2.5} /><span>{b}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

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

  // ── Customer view ────────────────────────────────────────────────────────
  const currentTier    = TIERS.find(t => t.id === tier)!
  const currentTierIdx = TIER_IDS.indexOf(tier)

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

      {/* Payment return banners */}
      {paymentStatus === 'success' && (
        <div className="membership-page__payment-banner membership-page__payment-banner--success">
          <CheckCircle2 size={18} strokeWidth={1.5} />
          <div>
            <strong>Payment received!</strong>
            <span>Your membership is being activated — this usually takes under a minute. Refresh the app if your plan doesn't update shortly.</span>
          </div>
        </div>
      )}
      {paymentStatus === 'cancelled' && (
        <div className="membership-page__payment-banner membership-page__payment-banner--cancelled">
          <XCircle size={18} strokeWidth={1.5} />
          <span>Payment was cancelled. Your plan hasn't changed.</span>
        </div>
      )}

      {/* Current plan banner */}
      <div className="membership-page__current">
        <div className="membership-page__current-inner">
          <div className="membership-page__current-icon">
            <currentTier.Icon size={18} strokeWidth={1.5} />
          </div>
          <div className="membership-page__current-text">
            <span className="membership-page__current-label">Your current plan</span>
            <span className="membership-page__current-name">{currentTier.name}</span>
          </div>
          <span className="membership-page__current-price">{currentTier.priceLabel}</span>
        </div>
      </div>

      {upgradeError && (
        <p className="membership-page__error">{upgradeError}</p>
      )}

      <div className="membership-page__tiers">
        {TIERS.map(({ id, name, Icon, priceLabel, zarLabel, tagline, badge, benefits, featured, isTop }) => {
          const isCurrent = id === tier
          const isUpgrade = TIER_IDS.indexOf(id) > currentTierIdx
          const isLoading = upgrading === id

          return (
            <div key={id} className={[
              'membership-tier',
              featured  ? 'membership-tier--featured' : '',
              isTop     ? 'membership-tier--top'      : '',
              isCurrent ? 'membership-tier--current'  : '',
            ].filter(Boolean).join(' ')}>
              {isCurrent
                ? <span className="membership-tier__badge membership-tier__badge--active">Your Plan</span>
                : badge && isUpgrade
                  ? <span className="membership-tier__badge">{badge}</span>
                  : null}

              <div className="membership-tier__top">
                <div className="membership-tier__icon-wrap"><Icon size={20} strokeWidth={1.5} /></div>
                <div>
                  <div className="membership-tier__name">{name}</div>
                  <div className="membership-tier__tagline">{tagline}</div>
                </div>
                <div className="membership-tier__price-col">
                  <span className="membership-tier__price">{priceLabel}</span>
                  {zarLabel && <span className="membership-tier__price-zar">{zarLabel}</span>}
                </div>
              </div>

              <ul className="membership-tier__benefits">
                {benefits.map((b, i) => (
                  <li key={i}><Check size={14} strokeWidth={2.5} /><span>{b}</span></li>
                ))}
              </ul>

              {isCurrent && (
                <div className="membership-tier__cta membership-tier__cta--disabled">Active Plan</div>
              )}

              {isUpgrade && (
                <button
                  className={[
                    'membership-tier__cta',
                    featured ? 'membership-tier__cta--featured' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleUpgrade(id as 'premium' | 'black-card')}
                  disabled={!!upgrading}
                >
                  {isLoading
                    ? <><Loader2 size={14} className="membership-page__spinner" /> Redirecting…</>
                    : `Upgrade to ${name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="membership-page__legal">
        Billed monthly in USD. Cancel any time — your plan downgrades to Free at the end of the billing period.
      </p>
    </div>
  )
}
