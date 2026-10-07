import { useCallback, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase.js'
import { AuthContext } from './context.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let adminUnsub = () => {}
    const authUnsub = onAuthStateChanged(auth, (nextUser) => {
      adminUnsub()
      adminUnsub = () => {}
      setUser(nextUser)
      if (!nextUser) {
        setIsAdmin(false)
        setLoading(false)
        return
      }
      setLoading(true)
      adminUnsub = onSnapshot(
        doc(db, 'admins', nextUser.uid),
        (snap) => {
          setIsAdmin(snap.exists())
          setLoading(false)
        },
        () => {
          setIsAdmin(false)
          setLoading(false)
        },
      )
    })
    return () => {
      authUnsub()
      adminUnsub()
    }
  }, [])

  const signIn = useCallback((email, password) => {
    return signInWithEmailAndPassword(auth, email, password)
  }, [])

  const signOut = useCallback(() => firebaseSignOut(auth), [])

  const value = useMemo(() => ({
    user,
    isAdmin,
    loading,
    signIn,
    signOut,
  }), [user, isAdmin, loading, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
