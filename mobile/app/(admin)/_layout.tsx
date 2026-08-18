import { Stack } from 'expo-router'

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="artists" />
      <Stack.Screen name="merch" />
      <Stack.Screen name="flash" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="rent" />
      <Stack.Screen name="waivers" />
      <Stack.Screen name="referrals" />
      <Stack.Screen name="points" />
      <Stack.Screen name="guest-artists" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="completions" />
      <Stack.Screen name="portfolio" />
    </Stack>
  )
}
