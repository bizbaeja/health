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
  avatar_url: string | null
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
    console.log('[AuthProvider] fetchProfile start:', userId)

    // 타임아웃 Promise
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
    )

    try {
      const result = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        timeout,
      ])

      const { data, error, status } = result
      console.log('[AuthProvider] fetchProfile result:', { data, error, status })

      if (error && status !== 406) {
        console.error('[AuthProvider] profile fetch error', error)
        setProfile(null)
        return null
      }

      if (!data) {
        console.log('[AuthProvider] no profile, creating...')
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: userId })
          .select('*')
          .single()

        if (insertError) {
          console.error('[AuthProvider] profile auto-create error', insertError)
          setProfile(null)
          return null
        }

        console.log('[AuthProvider] profile created:', inserted)
        setProfile(inserted as Profile)
        return inserted as Profile
      }

      console.log('[AuthProvider] profile loaded:', data)
      setProfile(data as Profile)
      return data as Profile
    } catch (err) {
      console.error('[AuthProvider] fetchProfile error:', err)
      setProfile(null)
      return null
    }
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
      console.log('[AuthProvider] getInitialSession start')
      setLoading(true)
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession()

        console.log('[AuthProvider] getSession result:', { hasSession: !!initialSession, error })

        if (!mounted) {
          console.log('[AuthProvider] unmounted, skipping')
          return
        }

        if (error) {
          console.error('[AuthProvider] session fetch error', error)
          clearSession()
          await supabase.auth.signOut()
          return
        }

        if (!initialSession) {
          console.log('[AuthProvider] no session found')
          clearSession()
          return
        }

        console.log('[AuthProvider] session found, fetching profile for:', initialSession.user.id)
        setSession(initialSession)
        await fetchProfile(initialSession.user.id)
        console.log('[AuthProvider] profile fetched successfully')
      } catch (error) {
        console.error('[AuthProvider] unexpected session error', error)
        clearSession()
        await supabase.auth.signOut()
      } finally {
        if (mounted) {
          console.log('[AuthProvider] setLoading(false)')
          setLoading(false)
        }
      }
    }

    void getInitialSession()

    let currentUserId: string | null = null

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[AuthProvider] onAuthStateChange:', event, newSession?.user?.id)

      // INITIAL_SESSION은 getInitialSession에서 이미 처리됨
      if (event === 'INITIAL_SESSION') {
        return
      }

      // 같은 유저면 무시 (중복 호출 방지)
      if (newSession?.user?.id === currentUserId) {
        console.log('[AuthProvider] same user, skipping')
        return
      }

      currentUserId = newSession?.user?.id ?? null
      setSession(newSession)

      if (newSession?.user) {
        setLoading(true)
        try {
          await fetchProfile(newSession.user.id)
        } catch (error) {
          console.error('[AuthProvider] onAuthStateChange error', error)
        } finally {
          setLoading(false)
        }
      } else {
        clearSession()
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

