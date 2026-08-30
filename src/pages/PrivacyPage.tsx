import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Logo } from '../components/shared/Logo'
import { BrandBackground } from '../components/shared/BrandBackground'
import { SUPPORT_EMAIL } from '../lib/support'
import './PrivacyPage.css'

const LAST_UPDATED = 'August 30, 2026'

// Public, unauthenticated page — this is the app's App Privacy / Privacy
// Policy URL destination, so it must load and be readable with no login
// required.
export function PrivacyPage() {
  return (
    <div className="page page--flush privacy-page">
      <BrandBackground />
      <div className="privacy-page__content">
        <Link to="/" className="privacy-page__back" aria-label="Back">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </Link>

        <header className="privacy-page__header">
          <Logo variant="full" height={90} forceSrc="/logo-gold.webp" />
          <h1>Privacy Policy</h1>
          <p className="privacy-page__updated">Last updated {LAST_UPDATED}</p>
        </header>

        <div className="privacy-page__body">
          <p>
            House of Holland Tattoo Emporium ("House of Holland", "we", "us") operates the
            House of Holland app and houseofhollandtattoos.com (together, the "Service").
            This policy explains what information we collect, why we collect it, and how
            it's handled.
          </p>

          <h2>Information we collect</h2>
          <p>We collect the information you give us directly when you use the Service:</p>
          <ul>
            <li><strong>Account details</strong> — name, email address, phone number, and profile photo.</li>
            <li><strong>Government ID</strong> — an ID document you upload to verify your age before booking, as required by tattoo industry regulation.</li>
            <li><strong>Consent &amp; waiver forms</strong> — full name, date of birth, address, emergency contact details, the tattoo's design and body placement, health-related waiver confirmations, and your digital signature. These exist to meet the legal consent requirements of a tattoo studio.</li>
            <li><strong>Tattoo history</strong> — photos, style, artist, price, and duration for completed tattoos, shown to you in your personal Tattoo Vault and Tattoo Passport.</li>
            <li><strong>Bookings &amp; messages</strong> — appointment details and any messages you exchange with artists or studio staff in-app.</li>
            <li><strong>Payment information</strong> — membership payments are processed by our payment provider, PayFast. We store a payment reference token to manage your subscription, not your full card details.</li>
            <li><strong>Push notification token</strong> — a device identifier used to deliver booking reminders and queue updates, if you allow notifications.</li>
          </ul>

          <h2>How we use it</h2>
          <ul>
            <li>To run your bookings, flash-day queue position, and membership</li>
            <li>To let artists and studio staff review your consent forms and tattoo history ahead of your appointment</li>
            <li>To send booking reminders, queue updates, and studio announcements</li>
            <li>To process membership payments and manage your subscription</li>
            <li>To improve the Service and fix problems</li>
          </ul>

          <h2>Who can see your information</h2>
          <p>
            Your consent forms, ID document, and tattoo history are visible only to House of
            Holland's artists and studio managers — the people who need them to safely and
            legally tattoo you. We do not sell your personal information, and we do not
            share it with third parties for their own marketing purposes.
          </p>
          <p>We do share limited data with the service providers that run the Service on our behalf:</p>
          <ul>
            <li><strong>Supabase</strong> — hosts our database, authentication, and file storage.</li>
            <li><strong>Firebase Cloud Messaging</strong> — delivers push notifications to your device.</li>
            <li><strong>PayFast</strong> — processes membership payments.</li>
          </ul>

          <h2>Data retention</h2>
          <p>
            We keep your account and tattoo history for as long as your account is active, since
            your Tattoo Vault and Tattoo Passport are built to be a lasting record of your work
            with us. Signed consent forms are retained as required for studio liability and
            health-and-safety record-keeping.
          </p>

          <h2>Your choices</h2>
          <p>
            You can update your profile information at any time in the app. To request a copy
            of your data, correct it, or have your account and personal data deleted, email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We'll confirm with you
            before permanently deleting anything, and note that some records (such as signed
            consent forms) may need to be retained for a period even after account deletion,
            where required by law.
          </p>

          <h2>Age requirement</h2>
          <p>
            The Service is intended for users aged 18 and over, consistent with the legal age
            requirement for getting a tattoo. We do not knowingly collect information from
            anyone under 18.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            If we make material changes to this policy, we'll update the date above and, where
            appropriate, notify you in the app.
          </p>

          <h2>Contact us</h2>
          <p>
            Questions about this policy or your data can be sent to{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </div>

        <footer className="privacy-page__footer">
          <p>House of Holland Tattoo Emporium</p>
          <p>© 2026 House of Holland. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}
