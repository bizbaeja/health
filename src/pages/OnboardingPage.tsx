import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/providers/AuthProvider'

type OnboardingFormState = {
  fullName: string
  gender: 'male' | 'female' | ''
  heightCm: string
  weightKg: string
  bodyFat: string
}

function OnboardingPage() {
  const navigate = useNavigate()
  const { user, profile, loading, refreshProfile } = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialState = useMemo<OnboardingFormState>(
    () => ({
      fullName: profile?.full_name ?? '',
      gender: profile?.gender ?? '',
      heightCm: profile?.height_cm?.toString() ?? '',
      weightKg: profile?.weight_kg?.toString() ?? '',
      bodyFat: profile?.body_fat_percentage?.toString() ?? '',
    }),
    [profile],
  )

  const [form, setForm] = useState<OnboardingFormState>(initialState)

  useEffect(() => {
    setForm(initialState)
  }, [initialState])

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate('/auth', { replace: true })
      return
    }
    if (profile?.onboarding_completed) {
      navigate('/', { replace: true })
    }
  }, [user, profile, loading, navigate])

  const handleChange = (field: keyof OnboardingFormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    setPending(true)
    setError(null)

    const height = form.heightCm ? Number.parseFloat(form.heightCm) : null
    const weight = form.weightKg ? Number.parseFloat(form.weightKg) : null
    const bodyFat = form.bodyFat ? Number.parseFloat(form.bodyFat) : null

    if (height !== null && Number.isNaN(height)) {
      setError('키를 숫자로 입력해주세요.')
      setPending(false)
      return
    }
    if (weight !== null && Number.isNaN(weight)) {
      setError('체중을 숫자로 입력해주세요.')
      setPending(false)
      return
    }
    if (bodyFat !== null && Number.isNaN(bodyFat)) {
      setError('체지방률을 숫자로 입력해주세요.')
      setPending(false)
      return
    }

    const trimmedName = form.fullName.trim()
    if (!trimmedName) {
      setError('이름을 입력해주세요.')
      setPending(false)
      return
    }

    const { error: upsertError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        full_name: trimmedName,
        gender: form.gender || null,
        height_cm: height,
        weight_kg: weight,
        body_fat_percentage: bodyFat,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

    if (upsertError) {
      console.error('[Onboarding] profile upsert error', upsertError)
      // 온보딩 저장 실패 시 현재 온보딩 페이지에 머무르면서 에러만 표시
      setError('온보딩 정보를 저장하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setPending(false)
      return
    }

    await refreshProfile()
    navigate('/', { replace: true })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-night px-6 py-12 sm:px-10">
      <div className="absolute inset-0 bg-aurora-gradient opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_65%)]" />

      <div className="relative z-10 w-full max-w-3xl rounded-[3rem] border border-white/10 bg-white/8 p-10 shadow-[0_0_60px_rgba(0,0,0,0.35)] sm:p-14">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35rem] text-slate-400">Onboarding</p>
            <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">신체 정보를 입력해 주세요</h1>
          </div>
          <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.35rem] text-emerald-200">
            Step 1/1
          </div>
        </div>

        <form className="grid gap-6 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm text-slate-300 sm:col-span-2">
            이름
            <input
              value={form.fullName}
              onChange={handleChange('fullName')}
              required
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
              placeholder="이름 또는 닉네임"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            성별
            <select
              value={form.gender}
              onChange={handleChange('gender')}
              required
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
            >
              <option value="" disabled>
                선택하세요
              </option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            키 (cm)
            <input
              value={form.heightCm}
              onChange={handleChange('heightCm')}
              inputMode="decimal"
              placeholder="예: 175"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            체중 (kg)
            <input
              value={form.weightKg}
              onChange={handleChange('weightKg')}
              inputMode="decimal"
              placeholder="예: 72.4"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            체지방률 (%)
            <input
              value={form.bodyFat}
              onChange={handleChange('bodyFat')}
              inputMode="decimal"
              placeholder="예: 18.5"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400 sm:col-span-2">
            <p>• 시작일과 종료일에 동일 기기(인바디/BIA)로 측정해주세요.</p>
            <p>• 공복, 측정 시간 등 동일 조건 유지 후 결과지 사진을 업로드할 준비를 해주세요.</p>
          </div>

          {error ? <p className="text-sm text-rose-300 sm:col-span-2">{error}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className="glass relative overflow-hidden rounded-2xl bg-brand/80 px-6 py-3 text-sm font-semibold uppercase tracking-[0.35rem] text-brand-foreground shadow-brand/30 transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100">
              <span className="shimmer absolute inset-0" />
            </span>
            {pending ? '저장 중...' : '온보딩 완료'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default OnboardingPage