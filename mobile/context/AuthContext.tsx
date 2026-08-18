import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, type Profile } from '../lib/supabase'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  realProfile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<string | null>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<string | null>
  refreshProfile: () => Promise<void>
  customerViewMode: boolean
  toggleCustomerView: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [realProfile, setRealProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [customerViewMode, setCustomerViewMode] = useState(false)

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setRealProfile(data ?? null)
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  function toggleCustomerView() {
    setCustomerViewMode(v => !v)
  }

  const profile: Profile | null =
    customerViewMode && realProfile
      ? { ...realProfile, role: 'public' }
      : realProfile

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setRealProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    referralCode?: string
  ): Promise<string | null> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) return error.message
    if (referralCode && data.user) {
      const code = referralCode.trim().toUpperCase()
      const { data: artist } = await supabase
        .from('artists')
        .select('id')
        .eq('referral_code', code)
        .single()
      if (artist) {
        await supabase.from('profiles').update({ referred_by_code: code }).eq('id', data.user.id)
      }
    }
    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
    setCustomerViewMode(false)
  }

  async function resetPassword(email: string): Promise<string | null> {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return error?.message ?? null
  }

  return (
    <AuthContext.Provider value={{
      session, user, profile, realProfile, loading,
      signIn, signUp, signOut, resetPassword, refreshProfile,
      customerViewMode, toggleCustomerView,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
