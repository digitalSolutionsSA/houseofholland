import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronLeft, Mail } from 'lucide-react'
import { Logo } from '../components/shared/Logo'
import { BrandBackground } from '../components/shared/BrandBackground'
import { SUPPORT_EMAIL } from '../lib/support'
import './SupportPage.css'

type FaqItem = { q: string; a: string }

const FAQ: FaqItem[] = [
  {
    q: 'How do I book an appointment?',
    a: 'Open the app and tap the Bookings tab in the navigation bar. Choose your preferred artist, select a date and time slot, and confirm your booking. You\'ll receive a confirmation and reminder.',
  },
  {
    q: 'Can I message an artist before booking?',
    a: 'Yes — open any artist\'s profile in the app and tap the Message button. You can ask about style, pricing, availability, or anything else before committing.',
  },
  {
    q: 'What tattoo styles are available?',
    a: 'Our artists cover a wide range — Black & Grey, Realism, American Traditional, Neo Traditional, Fine Line, Illustrative, Portraits, Lettering, Color Realism, and more. Use the filter chips on the Artists page to browse by style.',
  },
  {
    q: 'How do I earn loyalty points?',
    a: 'Points are awarded for completed tattoo sessions, leaving reviews, referrals, and select activities. Check the Battle Pass page in the app for your current progress and available rewards.',
  },
  {
    q: 'What is the Flash Queue?',
    a: 'Flash events are special walk-in sessions where artists offer pre-drawn designs at a set price — first come, first served. Join the queue on the Flash Queue page when an event is live, and track your position in real time.',
  },
  {
    q: 'What is the Tattoo Vault?',
    a: 'The Vault is your personal, private record of every tattoo you\'ve had done with us — photo, artist, style, date, and price — all in one place.',
  },
  {
    q: 'How do I leave a review?',
    a: 'Visit the artist\'s profile page in the app after your appointment. Scroll down and tap Leave a Review. Reviews help other clients find the right artist and earn you bonus loyalty points.',
  },
  {
    q: 'Can I view an artist\'s previous work?',
    a: 'Absolutely. Open any artist profile in the app to browse their full portfolio. Tap any photo to view it full-size.',
  },
  {
    q: 'How do I manage or cancel a booking?',
    a: 'Go to the Bookings tab, select the appointment, and use the options there to reschedule or cancel. Please give as much notice as possible so the slot can be offered to someone else.',
  },
  {
    q: 'How do I delete my account or data?',
    a: `Email ${SUPPORT_EMAIL} from the address on your account and we'll handle the request. We'll confirm with you before permanently deleting anything.`,
  },
]

function FaqRow({ item, defaultOpen }: { item: FaqItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="support-faq__item">
      <button type="button" className="support-faq__question" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{item.q}</span>
        <ChevronDown size={16} strokeWidth={2} className={`support-faq__chevron ${open ? 'support-faq__chevron--open' : ''}`} />
      </button>
      {open && <p className="support-faq__answer">{item.a}</p>}
    </div>
  )
}

// Public, unauthenticated page — this is the app's App Store Support URL
// destination, so it must load and be readable with no login required.
export function SupportPage() {
  return (
    <div className="page page--flush support-page">
      <BrandBackground />
      <div className="support-page__content">
        <Link to="/" className="support-page__back" aria-label="Back">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </Link>

        <header className="support-page__header">
          <Logo variant="full" height={100} forceSrc="/logo-gold.webp" />
          <p className="support-page__tagline">Tattoo Emporium — Support</p>
          <p className="support-page__kicker">
            Questions about booking, flash days, your membership, or the app itself — here's where to look, and how to reach us directly.
          </p>
        </header>

        <a className="support-page__contact" href={`mailto:${SUPPORT_EMAIL}`}>
          <span className="support-page__contact-icon"><Mail size={20} strokeWidth={1.5} /></span>
          <span className="support-page__contact-body">
            <span className="support-page__contact-label">Email Support</span>
            <span className="support-page__contact-email">{SUPPORT_EMAIL}</span>
            <span className="support-page__contact-note">We typically reply within 1–2 business days.</span>
          </span>
        </a>

        <p className="support-page__section-label">Frequently Asked</p>

        <div className="support-faq">
          {FAQ.map((item, i) => (
            <FaqRow key={item.q} item={item} defaultOpen={i === 0} />
          ))}
        </div>

        <footer className="support-page__footer">
          <p>House of Holland Tattoo Emporium</p>
          <p>© 2026 House of Holland. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}
