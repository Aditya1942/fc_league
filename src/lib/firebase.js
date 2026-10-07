import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

// Web config from the Firebase console. The API key is a public client
// identifier, not a server secret. Analytics starts after first paint.
const firebaseConfig = {
  apiKey: 'AIzaSyDK5Di5WcmFT_YzFR58bM2D7D5er6cT1h0',
  authDomain: 'fc-league-26061.firebaseapp.com',
  projectId: 'fc-league-26061',
  storageBucket: 'fc-league-26061.firebasestorage.app',
  messagingSenderId: '696601753898',
  appId: '1:696601753898:web:0e95c9942410e6c66cc653',
  measurementId: 'G-JTW2FV4MNF',
}

const EMULATORS_FLAG = '__fcLeagueEmulatorsConnected'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

// Standard edition default database in asia-south2.
// Persistent cache keeps the last league, table, and fixtures readable offline.
// initializeFirestore is once-only; a second call (Vite reload) returns the
// instance that was already started.
function createDb(firebaseApp) {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  } catch (error) {
    const message = String(error?.message || error)
    if (/already/i.test(message)) return getFirestore(firebaseApp)
    throw error
  }
}

const db = createDb(app)

if (import.meta.env.VITE_USE_EMULATORS === 'true' && !globalThis[EMULATORS_FLAG]) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  globalThis[EMULATORS_FLAG] = true
}

export { app, auth, db }
