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
          <Logo variant="full" height={130} forceSrc="/logo-gold.webp" />
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

        </div>

        <DiamondDivider />
      </div>
    </div>
  )
}
