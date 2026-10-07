import { getAnalytics, isSupported } from 'firebase/analytics'
import { app } from './firebase.js'

let started = false

export async function startAnalytics() {
  if (started) return
  started = true
  if (!(await isSupported())) return
  getAnalytics(app)
}
