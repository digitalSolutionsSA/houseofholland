import { Redirect } from 'expo-router'

// Root redirect — _layout.tsx handles the actual routing logic
export default function Index() {
  return <Redirect href="/(auth)/login" />
}
