import { FileCheck } from 'lucide-react'
import { PageHeader } from '../components/shared/PageHeader'
import { GradientButton } from '../components/shared/GradientButton'
import { OutlineButton } from '../components/shared/OutlineButton'
import './ConsentFormsPage.css'

export function ConsentFormsPage() {
  return (
    <div className="page page--no-nav consent-page">
      <p className="consent-page__count">
        <span>12</span> CONSENT FORMS
      </p>
      <PageHeader title="Consent Forms" backTo="/home" align="center" />

      <div className="consent-page__card">
        <div className="consent-page__icon" aria-hidden>
          <FileCheck size={64} strokeWidth={1.2} />
        </div>
        <h2>You have no pending consent forms.</h2>
        <p>Your signed forms will appear here for your records.</p>
        <div className="consent-page__actions">
          <GradientButton>VIEW ALL FORMS</GradientButton>
          <OutlineButton>SIGN NEW FORM</OutlineButton>
        </div>
      </div>
    </div>
  )
}
