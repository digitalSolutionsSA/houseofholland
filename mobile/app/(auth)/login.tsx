import { useState } from 'react'
import {
  View, Text, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Image,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../context/AuthContext'
import { InputField } from '../../components/shared/InputField'
import { GradientButton } from '../../components/shared/GradientButton'
import { Colors } from '../../constants/colors'

type Mode = 'login' | 'register' | 'forgot'

export default function LoginScreen() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'login') {
      const err = await signIn(email.trim(), password)
      if (err) setError(err)
    } else if (mode === 'register') {
      if (!fullName.trim()) { setError('Full name is required'); setLoading(false); return }
      const err = await signUp(email.trim(), password, fullName.trim(), referralCode || undefined)
      if (err) setError(err)
      else setSuccess('Account created! Check your email to verify.')
    } else {
      const err = await resetPassword(email.trim())
      if (err) setError(err)
      else setSuccess('Password reset email sent.')
    }
    setLoading(false)
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo area */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text style={{
              color: Colors.gold,
              fontSize: 42,
              fontWeight: '800',
              letterSpacing: 4,
            }}>
              HoH
            </Text>
            <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4, letterSpacing: 2 }}>
              HOUSE OF HOLLAND
            </Text>
          </View>

          {/* Mode tabs */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: Colors.bgElevated,
            borderRadius: 12,
            padding: 4,
            marginBottom: 24,
          }}>
            {(['login', 'register'] as const).map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => { setMode(m); setError(null); setSuccess(null) }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: mode === m ? Colors.gold : 'transparent',
                }}
              >
                <Text style={{
                  color: mode === m ? Colors.textOnGold : Colors.textMuted,
                  fontWeight: '600',
                  fontSize: 14,
                  textTransform: 'capitalize',
                }}>
                  {m === 'login' ? 'Sign In' : 'Register'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fields */}
          {mode === 'register' && (
            <InputField
              label="Full Name"
              placeholder="Your full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          )}

          <InputField
            label="Email"
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {mode !== 'forgot' && (
            <InputField
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          )}

          {mode === 'register' && (
            <InputField
              label="Referral Code (optional)"
              placeholder="e.g. ARMAND01"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
            />
          )}

          {error && (
            <View style={{
              backgroundColor: 'rgba(220,38,38,0.15)',
              borderRadius: 10,
              padding: 12,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: 'rgba(220,38,38,0.4)',
            }}>
              <Text style={{ color: '#ef4444', fontSize: 13 }}>{error}</Text>
            </View>
          )}

          {success && (
            <View style={{
              backgroundColor: 'rgba(34,197,94,0.15)',
              borderRadius: 10,
              padding: 12,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: 'rgba(34,197,94,0.4)',
            }}>
              <Text style={{ color: '#4ade80', fontSize: 13 }}>{success}</Text>
            </View>
          )}

          <GradientButton
            label={mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Email'}
            onPress={handleSubmit}
            loading={loading}
          />

          {mode === 'login' && (
            <TouchableOpacity
              onPress={() => { setMode('forgot'); setError(null); setSuccess(null) }}
              style={{ alignItems: 'center', marginTop: 16 }}
            >
              <Text style={{ color: Colors.gold, fontSize: 13 }}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {mode === 'forgot' && (
            <TouchableOpacity
              onPress={() => { setMode('login'); setError(null); setSuccess(null) }}
              style={{ alignItems: 'center', marginTop: 16 }}
            >
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Back to Sign In</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
