import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'

// Native iOS/Android builds (phone AND tablet) always use the bottom nav —
// the sidebar layout is reserved for the plain web/desktop-browser
// experience. Set before mount so there's no layout flash.
if (Capacitor.isNativePlatform()) {
  document.documentElement.dataset.native = 'true'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
