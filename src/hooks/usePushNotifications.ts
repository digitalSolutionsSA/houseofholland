import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from '../lib/supabase'

export function usePushNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId || !Capacitor.isNativePlatform()) return

    let registered = false

    async function register() {
      const { receive } = await PushNotifications.requestPermissions()
      if (receive !== 'granted') return

      await PushNotifications.register()
      registered = true
    }

    const regListener = PushNotifications.addListener('registration', async ({ value: token }) => {
      const platform = Capacitor.getPlatform() as 'android' | 'ios'

      let fcmToken = token
      if (platform === 'ios') {
        // Firebase exchanges the APNs token for an FCM token asynchronously.
        // Retry until it's available (can take 5–20s on first launch).
        try {
          const { FCM } = await import('@capacitor-community/fcm')
          for (let i = 0; i < 15; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000))
            try {
              const result = await FCM.getToken()
              if (result?.token) { fcmToken = result.token; break }
            } catch {
              // Not ready yet — keep retrying
            }
          }
        } catch {
          // @capacitor-community/fcm not available, fall back to APNs token
        }
      }

      await supabase.from('device_tokens').upsert(
        { user_id: userId, token: fcmToken, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      )
    })

    const errListener = PushNotifications.addListener('registrationError', err => {
      console.error('[Push] Registration error:', err)
    })

    // Tap on a notification while app is in background/closed
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', action => {
      const path = action.notification.data?.path as string | undefined
      if (path) window.location.hash = path
    })

    register()

    return () => {
      if (registered) {
        regListener.then(l => l.remove())
        errListener.then(l => l.remove())
        actionListener.then(l => l.remove())
      }
    }
  }, [userId])
}
