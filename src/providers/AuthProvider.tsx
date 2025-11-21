import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

type Profile = {
  id: string
  full_name: string | null
  gender: 'male' | 'female' | null
  height_cm: number | null
  weight_kg: number | null
  body_fat_percentage: number | null
  onboarding_completed: boolean
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    setSession(null)
    setProfile(null)
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
      console.error('[AuthProvider] profile fetch error', error)
      setProfile(null)
      return false
    }
    setProfile(data as Profile | null)
    return true
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return
    await fetchProfile(session.user.id)
  }, [session?.user, fetchProfile])

  useEffect(() => {
    let mounted = true
    const guardTimeout = window.setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 5000)

    const getInitialSession = async () => {
      setLoading(true)
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) {
          return
        }

        if (error) {
          console.error('[AuthProvider] session fetch error', error)
          clearSession()
          await supabase.auth.signOut()
          return
        }

        if (!initialSession) {
          clearSession()
          return
        }

        setSession(initialSession)
        await fetchProfile(initialSession.user.id)
      } catch (error) {
        console.error('[AuthProvider] unexpected session error', error)
        clearSession()
        await supabase.auth.signOut()
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void getInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setLoading(true)
      setSession(newSession)
      try {
        if (newSession?.user) {
          await fetchProfile(newSession.user.id)
        } else {
          clearSession()
        }
      } catch (error) {
        console.error('[AuthProvider] onAuthStateChange error', error)
        clearSession()
      } finally {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      window.clearTimeout(guardTimeout)
      subscription.unsubscribe()
    }
  }, [clearSession, fetchProfile])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('[AuthProvider] signOut error', error)
    } finally {
      clearSession()
      setLoading(false)
    }
  }, [clearSession])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, refreshProfile, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.')
  }
  return ctx
}

