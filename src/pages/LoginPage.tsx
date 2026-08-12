import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, User, Tag } from 'lucide-react'
import { Logo } from '../components/shared/Logo'
import { DiamondDivider } from '../components/shared/DiamondDivider'
import { InputField } from '../components/shared/InputField'
import { GradientButton } from '../components/shared/GradientButton'
import { BrandBackground } from '../components/shared/BrandBackground'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signUp, resetPassword } = useAuth()

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [forgotMode, setForgotMode] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (forgotMode) {
      const err = await resetPassword(email)
      setLoading(false)
      if (err) setError(err)
      else setSuccess('Check your email for a password reset link.')
      return
    }

    if (tab === 'register') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        setLoading(false)
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        setLoading(false)
        return
      }
      const err = await signUp(email, password, fullName, referralCode || undefined)
      setLoading(false)
      if (err) { setError(err); return }
      setSuccess('Account created! Check your email to confirm, then sign in.')
      setTab('login')
      return
    }

    const err = await signIn(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    navigate('/home')
  }

  return (
    <div className="page page--no-nav page--flush login-page">
      <BrandBackground />
      <div className="login-page__content">
        <header className="login-page__brand">
          <Logo variant="full" height={130} />
        </header>

        <div className="login-page__ornament" aria-hidden="true">
          <span /><span className="login-page__ornament-diamond" /><span />
        </div>

        <div className="login-page__card">
          {!forgotMode && (
            <div className="login-page__tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'login'}
                className={tab === 'login' ? 'is-active' : ''}
                onClick={() => { setTab('login'); setError(null); setSuccess(null) }}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'register'}
                className={tab === 'register' ? 'is-active' : ''}
                onClick={() => { setTab('register'); setError(null); setSuccess(null) }}
              >
                Create Account
              </button>
            </div>
          )}

          {forgotMode && (
            <p className="login-page__forgot-title">Reset your password</p>
          )}

          <form className="login-page__form" onSubmit={handleSubmit}>
            {tab === 'register' && !forgotMode && (
              <InputField
                type="text"
                placeholder="Full Name"
                leftIcon={<User size={18} strokeWidth={1.5} />}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}

            <InputField
              type="email"
              placeholder="Email address"
              leftIcon={<Mail size={18} strokeWidth={1.5} />}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {!forgotMode && (
              <>
                <InputField
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  leftIcon={<Lock size={18} strokeWidth={1.5} />}
                  rightIcon={showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                  onRightIconClick={() => setShowPassword((v) => !v)}
                  autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                {tab === 'register' && (
                  <>
                    <InputField
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm Password"
                      leftIcon={<Lock size={18} strokeWidth={1.5} />}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <InputField
                      type="text"
                      placeholder="Artist Referral Code (optional)"
                      leftIcon={<Tag size={18} strokeWidth={1.5} />}
                      autoComplete="off"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    />
                  </>
                )}
              </>
            )}

            {error && <p className="login-page__error">{error}</p>}
            {success && <p className="login-page__success">{success}</p>}

            {tab === 'login' && !forgotMode && (
              <button type="button" className="login-page__forgot" onClick={() => { setForgotMode(true); setError(null); setSuccess(null) }}>
                Forgot password?
              </button>
            )}

            <GradientButton type="submit" disabled={loading}>
              {loading
                ? 'PLEASE WAIT…'
                : forgotMode
                  ? 'SEND RESET LINK'
                  : tab === 'login'
                    ? 'SIGN IN'
                    : 'CREATE ACCOUNT'}
            </GradientButton>

            {forgotMode && (
              <button type="button" className="login-page__forgot login-page__forgot--back" onClick={() => { setForgotMode(false); setError(null); setSuccess(null) }}>
                ← Back to sign in
              </button>
            )}
          </form>

          {!forgotMode && (
            <div className="login-page__social">
              <div className="login-page__or">
                <span />
                <p>or continue with</p>
                <span />
              </div>
              <div className="login-page__social-row">
                <button type="button" aria-label="Continue with Apple" className="social-btn">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.365 1.43c0 1.14-.43 2.2-1.2 3.02-.9.95-2.1 1.55-3.25 1.45-.15-1.1.4-2.25 1.2-3.1.9-.95 2.35-1.6 3.25-1.37zM20.5 17.4c-.55 1.25-.82 1.8-1.53 2.9-.99 1.55-2.38 3.48-4.12 3.5-1.54.02-1.94-.98-4.04-.97-2.1.01-2.54.99-4.08.97-1.74-.02-3.07-1.76-4.06-3.3C.82 17.5-.6 12.7.98 9.55c.9-1.8 2.52-2.94 4.27-2.97 1.58-.03 3.07 1.06 4.04 1.06.96 0 2.76-1.31 4.66-1.12.79.03 3.01.32 4.43 2.41-3.78 2.08-3.17 7.5.12 8.47z" />
                  </svg>
                </button>
                <button type="button" aria-label="Continue with Google" className="social-btn">
                  <svg width="17" height="17" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.5 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12S6.9 21.3 12 21.3c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.1-1.4H12z" />
                    <path fill="#34A853" d="M3.9 14.4l3-2.3c.8 2.2 2.8 3.5 5.1 3.5 1.4 0 2.6-.5 3.5-1.3l3.1 2.4c-1.9 1.8-4.4 2.6-6.6 2.6-3.8 0-7-2.5-8.1-5z" />
                    <path fill="#FBBC05" d="M12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.5 2.7 12 2.7 8.7 2.7 5.9 4.6 4.7 7.5l3.1 2.4C8.7 7.7 10.2 6.2 12 6.2z" />
                    <path fill="#4285F4" d="M20.6 12.6c0-.6-.1-1-.1-1.4H12v3.6h5.1c-.3 1.3-1.1 2.3-2.1 3l3.1 2.4c1.9-1.7 2.5-4.2 2.5-7.6z" />
                  </svg>
                </button>
                <button type="button" aria-label="Continue with Facebook" className="social-btn">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
                    <path d="M14 8h3V5h-3c-2.2 0-4 1.8-4 4v2H7v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        <DiamondDivider />
      </div>
    </div>
  )
}
