import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/providers/AuthProvider'

type AuthMode = 'sign-in' | 'sign-up'

function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const navigate = useNavigate()
  const { session, profile, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (session) {
      if (profile?.onboarding_completed) {
        navigate('/', { replace: true })
      } else {
        navigate('/onboarding', { replace: true })
      }
    }
  }, [session, profile, loading, navigate])

  useEffect(() => {
    setError(null)
    setInfo(null)
  }, [mode])

  const redirectBase =
    import.meta.env.MODE === 'production'
      ? 'https://health-project-dduru.netlify.app'
      : window.location.origin

  const handleGoogleSignIn = async () => {
    setError(null)
    setInfo(null)
    setPending(true)

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectBase,
        },
      })

      if (oauthError) {
        setError(oauthError.message)
      }
    } finally {
      // OAuth는 보통 즉시 리다이렉트되지만, 실패 시를 위해 pending 해제
      setPending(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setPending(true)

    try {
      if (mode === 'sign-in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) {
          setError(signInError.message)
        }
      } else {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${redirectBase}/onboarding`,
          },
        })
        if (signUpError) {
          setError(signUpError.message)
        } else if (!data.session) {
          setInfo('확인 메일을 전송했습니다. 받은 메일의 링크를 통해 진행해주세요.')
        }
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-night">
      <div className="absolute inset-0 bg-aurora-gradient opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_65%)]" />

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-[3rem] border border-white/10 bg-white/8 shadow-[0_0_60px_rgba(0,0,0,0.35)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass hidden flex-col justify-between px-12 py-14 text-white lg:flex">
          <div className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs uppercase tracking-[0.35rem] text-slate-200">
              Diet Protocol
            </div>
            <h1 className="font-display text-4xl leading-tight">
              목표 체지방률에
              <br />
              가장 근접한
              <br />
              챌린저가 되세요.
            </h1>
            <p className="text-sm text-slate-200/80">
              인바디 데이터 기반의 정밀한 점수 시스템, 주간 인증 미션, 공정성과 자극을 모두 잡은 하이엔드 다이어트 레이스. 지금
              바로 합류하세요.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-xs uppercase tracking-[0.35rem] text-slate-200/80">
            <p>체지방률 변화율 90점</p>
            <p>출석 및 참여 10점</p>
            <p>여성 참가자 +0.5%</p>
          </div>
        </section>

        <section className="relative flex flex-col justify-center px-8 py-12 sm:px-12">
          <div className="absolute right-6 top-6 text-xs uppercase tracking-[0.35rem] text-slate-500">
            {mode === 'sign-in' ? '로그인' : '회원가입'}
          </div>
          <div className="mb-10 flex flex-col gap-2">
            <h2 className="font-display text-3xl text-white">
              {mode === 'sign-in' ? '다시 돌아오셨군요' : '최초 참가 등록'}
            </h2>
            <p className="text-sm text-slate-400">
              {mode === 'sign-in'
                ? '이메일과 비밀번호로 로그인 후 온보딩을 이어가세요.'
                : '기본 정보를 입력하고 대회를 시작하세요.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              이메일
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
                placeholder="you@example.com"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
                placeholder="6자 이상 입력"
              />
            </label>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {info ? <p className="text-sm text-emerald-300">{info}</p> : null}

            <button
              type="submit"
              disabled={pending}
              className="relative overflow-hidden rounded-2xl bg-brand px-4 py-3 text-sm font-medium uppercase tracking-[0.35rem] text-brand-foreground shadow-lg shadow-brand/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100">
                <span className="shimmer absolute inset-0" />
              </span>
              {pending ? '처리 중...' : mode === 'sign-in' ? '로그인' : '회원가입'}
            </button>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="h-px flex-1 bg-white/10" />
              <span>또는</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={pending}
              className="flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 shadow-[0_0_40px_rgba(15,23,42,0.75)] transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white">
                <span className="text-[11px] font-bold text-slate-900">G</span>
              </span>
              <span>Google 계정으로 계속하기</span>
            </button>
          </form>

          <div className="mt-8 text-sm text-slate-400">
            {mode === 'sign-in' ? (
              <button
                type="button"
                className="text-brand transition hover:text-indigo-300"
                onClick={() => setMode('sign-up')}
              >
                아직 계정이 없다면? 회원가입
              </button>
            ) : (
              <button
                type="button"
                className="text-brand transition hover:text-indigo-300"
                onClick={() => setMode('sign-in')}
              >
                이미 계정이 있다면? 로그인
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default AuthPage

