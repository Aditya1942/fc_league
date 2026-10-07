import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './auth/index.js'
import './lib/firebase.js'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

function loadAnalytics() {
  import('./lib/analytics.js').then((module) => module.startAnalytics())
}

if (import.meta.env.VITE_USE_EMULATORS !== 'true') {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(loadAnalytics)
  } else {
    setTimeout(loadAnalytics, 1)
  }
}
