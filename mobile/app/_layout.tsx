import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { AuthProvider, useAuth } from '../context/AuthContext'
import '../global.css'

SplashScreen.preventAutoHideAsync()

function RootLayoutNav() {
  const { session, profile, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    SplashScreen.hideAsync()

    const inAuth = segments[0] === '(auth)'

    if (!session && !inAuth) {
      router.replace('/(auth)/login')
      return
    }

    if (session && profile && inAuth) {
      if (profile.role === 'public') {
        router.replace('/(customer)/home')
      } else {
        // artist and manager go to artist home; admin section accessible from there
        router.replace('/(artist)/home')
      }
    }
  }, [session, profile, loading])

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  )
}
