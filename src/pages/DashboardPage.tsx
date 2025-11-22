import type { ChangeEvent, MouseEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, startOfWeek } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '@/providers/AuthProvider'
import { useCreateWeeklyLog, useWeeklyLogs, type WeeklyLogInput, type WeeklyLogRecord } from '@/hooks/useWeeklyLogs'
import { useChallengeSettings, useUpsertChallengeSettings } from '@/hooks/useChallengeSettings'
import { useNotifications, useMarkNotificationRead, type NotificationRecord } from '@/hooks/useNotifications'

const WEEKS_IN_CHALLENGE = 4

function DashboardPage() {
  const { profile, user, signOut } = useAuth()
  const userId = user?.id ?? null

  const { data: weeklyLogs, isLoading: weeklyLogsLoading } = useWeeklyLogs(userId)
  const createLogMutation = useCreateWeeklyLog(userId)
  const { data: challengeSettings, isLoading: challengeSettingsLoading } = useChallengeSettings(userId)
  const upsertChallengeSettingsMutation = useUpsertChallengeSettings(userId)
  const { data: notifications = [] } = useNotifications(userId)
  const markNotificationReadMutation = useMarkNotificationRead(userId)

  const [formError, setFormError] = useState<string | null>(null)
  const [formResetKey, setFormResetKey] = useState(0)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [activeInfoModal, setActiveInfoModal] = useState<'program' | 'score' | null>(null)
  const [now, setNow] = useState(() => new Date())

  const weeklyLogsData = weeklyLogs ?? []
  const unreadNotificationCount = notifications.filter((n) => n.readAt == null).length

  const handleNotificationClick = (id: number) => {
    markNotificationReadMutation.mutate(id)
  }
  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const hasThisWeekLog = weeklyLogsData.some((log) => log.weekStart === currentWeekStart)

  console.log('[DEBUG] user.id =', user?.id)
  console.log('[DEBUG] profile =', profile)
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const completedWeeksCount = weeklyLogsData.length
  const weeklyProgress = WEEKS_IN_CHALLENGE > 0 ? Math.min(completedWeeksCount / WEEKS_IN_CHALLENGE, 1) : 0

  const startAt = challengeSettings?.startAt ? parseISO(challengeSettings.startAt) : null
  const endAt = challengeSettings?.endAt ? parseISO(challengeSettings.endAt) : null

  const countdown = useMemo(() => {
    if (!startAt || !endAt) {
      return null
    }

    const startTime = startAt.getTime()
    const endTime = endAt.getTime()
    const nowTime = now.getTime()
    const totalMs = Math.max(endTime - startTime, 0)

    if (totalMs === 0) {
      return {
        totalMs,
        remainingMs: 0,
        elapsedMs: 0,
        percent: 1,
        isComplete: true,
      }
    }

    const elapsedMs = Math.min(Math.max(nowTime - startTime, 0), totalMs)
    const remainingMs = Math.max(endTime - nowTime, 0)
    const percent = elapsedMs / totalMs

    return {
      totalMs,
      elapsedMs,
      remainingMs,
      percent,
      isComplete: remainingMs <= 0,
    }
  }, [endAt, now, startAt])

  const timeProgress = countdown?.percent ?? weeklyProgress
  const progressDegrees = Math.floor(timeProgress * 360)

  const startBodyFat = profile?.body_fat_percentage ?? null
  const latestBodyFat = weeklyLogsData.find((log) => log.bodyFatPercentage != null)?.bodyFatPercentage ?? null
  const bodyFatChange =
    startBodyFat != null && latestBodyFat != null ? ((startBodyFat - latestBodyFat) / startBodyFat) * 100 : null

  const remainingLabel = useMemo(() => {
    if (!countdown) {
      return '종료일을 설정하세요.'
    }

    if (countdown.isComplete) {
      return '챌린지가 종료되었습니다.'
    }

    return `종료까지 ${formatRemainingLong(countdown.remainingMs)}`
  }, [countdown])

  const timeValueLabel = useMemo(() => {
    if (!countdown) {
      return '--'
    }
    if (countdown.isComplete) {
      return '완료'
    }
    return formatRemainingShort(countdown.remainingMs)
  }, [countdown])

  const scoreboard = useMemo(
    () => [
      {
        label: '체지방률 변화율',
        value:
          bodyFatChange != null
            ? `${bodyFatChange >= 0 ? '+' : ''}${bodyFatChange.toFixed(1)}%`
            : startBodyFat != null
              ? '0%'
              : '--',
        trend:
          startBodyFat != null && latestBodyFat != null
            ? `시작 ${startBodyFat.toFixed(1)}% → 현재 ${latestBodyFat.toFixed(1)}%`
            : '기록을 추가하면 추이가 표시됩니다.',
      },
      {
        label: '주간 인증',
        value: `${completedWeeksCount} / ${WEEKS_IN_CHALLENGE}`,
        trend: hasThisWeekLog ? '이번 주 인증 완료' : '이번 주 인증 필요',
      },
      {
        label: '남은 시간',
        value: timeValueLabel,
        trend: remainingLabel,
      },
      {
        label: '여성 가산점',
        value: profile?.gender === 'female' ? '+0.5%' : '0%',
        trend: profile?.gender === 'female' ? '여성 참가자 가산점 적용' : '핸디캡 없음',
      },
    ],
    [bodyFatChange, completedWeeksCount, hasThisWeekLog, latestBodyFat, profile?.gender, remainingLabel, startBodyFat, timeValueLabel],
  )

  const handleCreateLog = async (input: WeeklyLogInput) => {
    setFormError(null)
    try {
      await createLogMutation.mutateAsync(input)
      setFormResetKey((prev) => prev + 1)
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message)
      } else {
        setFormError('주간 기록 저장에 실패했습니다.')
      }
    }
  }

  const handleSaveSettings = async (values: { startAt: string; endAt: string }) => {
    setSettingsError(null)
    try {
      await upsertChallengeSettingsMutation.mutateAsync(values)
    } catch (error) {
      if (error instanceof Error) {
        setSettingsError(error.message)
      } else {
        setSettingsError('챌린지 기간 저장에 실패했습니다.')
      }
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-night text-slate-100">
      <DecorativeBackground />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header
          displayName={profile?.full_name ?? '챌린저'}
          onSignOut={signOut}
          onShowProgramInfo={() => setActiveInfoModal('program')}
          onShowScoreInfo={() => setActiveInfoModal('score')}
          notifications={notifications}
          unreadCount={unreadNotificationCount}
          onNotificationClick={handleNotificationClick}
        />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-6 lg:px-10 xl:px-20">
          <div className="grid w-full max-w-6xl gap-12  lg:gap-14">
          
            <div className="flex flex-col gap-8">
              <MetricPanel
                progressDegrees={progressDegrees}
                completedWeeks={completedWeeksCount}
                weeksInChallenge={WEEKS_IN_CHALLENGE}
                scoreboard={scoreboard}
                countdown={countdown}
                endAt={endAt}
              />
              <ChallengeSettingsCard
                isLoading={challengeSettingsLoading || upsertChallengeSettingsMutation.isPending}
                settings={challengeSettings}
                onSave={handleSaveSettings}
                errorMessage={settingsError}
              />
              <WeeklyTrendCard logs={weeklyLogsData} isLoading={weeklyLogsLoading} startBodyFat={startBodyFat} />
              <WeeklyLogBoard
                key={formResetKey}
                logs={weeklyLogsData}
                isLoading={weeklyLogsLoading}
                hasThisWeekLog={hasThisWeekLog}
                currentWeekStart={currentWeekStart}
                onSubmit={handleCreateLog}
                isSubmitting={createLogMutation.isPending}
                errorMessage={formError}
              />
            </div>
          </div>
        </main>
        <Footer />
      </div>

      {activeInfoModal !== null ? (
        <InfoModal
          type={activeInfoModal}
          onClose={() => {
            setActiveInfoModal(null)
          }}
        />
      ) : null}
    </div>
  )
}

type ChallengeSettingsCardProps = {
  isLoading: boolean
  settings: { startAt: string; endAt: string } | null | undefined
  onSave: (values: { startAt: string; endAt: string }) => Promise<void>
  errorMessage: string | null
}

function ChallengeSettingsCard({ isLoading, settings, onSave, errorMessage }: ChallengeSettingsCardProps) {
  const [startValue, setStartValue] = useState('')
  const [endValue, setEndValue] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    setStartValue(settings?.startAt ? toDateTimeLocalValue(settings.startAt) : '')
  }, [settings?.startAt])

  useEffect(() => {
    setEndValue(settings?.endAt ? toDateTimeLocalValue(settings.endAt) : '')
  }, [settings?.endAt])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)

    if (!startValue || !endValue) {
      setLocalError('시작 시각과 종료 시각을 모두 입력해주세요.')
      return
    }

    const startDate = new Date(startValue)
    const endDate = new Date(endValue)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setLocalError('유효한 날짜와 시간을 입력해주세요.')
      return
    }

    if (startDate >= endDate) {
      setLocalError('종료 시각은 시작 시각 이후여야 합니다.')
      return
    }

    await onSave({
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
    })
  }

  const statusLabel = settings ? '설정됨' : '미설정'

  return (
    <section className="glass rounded-[2.5rem] border border-white/10 p-8 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl text-white">챌린지 타임라인 설정</h3>
          <p className="text-sm text-slate-400">전체 챌린지 기간을 설정하면 실시간 타이머가 활성화됩니다.</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs ${
            settings ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/50 bg-amber-300/10 text-amber-200'
          }`}
        >
          {isLoading ? '저장 중...' : statusLabel}
        </span>
      </div>

      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          시작 시각
          <input
            type="datetime-local"
            value={startValue}
            onChange={(event) => setStartValue(event.target.value)}
            required
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          종료 시각
          <input
            type="datetime-local"
            value={endValue}
            onChange={(event) => setEndValue(event.target.value)}
            required
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
          />
        </label>

        <div className="sm:col-span-2 text-xs text-slate-500">
          <p>• 종료 시각을 지나면 타이머가 “완료” 상태로 표시됩니다.</p>
          <p>• 시작 시각을 과거로 설정하면 이미 경과한 시간까지 함께 계산됩니다.</p>
        </div>

        {(localError || errorMessage) && <p className="sm:col-span-2 text-sm text-rose-300">{localError ?? errorMessage}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="sm:col-span-2 glass relative overflow-hidden rounded-2xl bg-brand/80 px-6 py-3 text-sm font-semibold uppercase tracking-[0.35rem] text-brand-foreground shadow-brand/30 transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100">
            <span className="shimmer absolute inset-0" />
          </span>
          {isLoading ? '저장 중...' : '챌린지 기간 저장'}
        </button>
      </form>
    </section>
  )
}

type HeaderProps = {
  displayName: string
  onSignOut: () => Promise<void>
  onShowProgramInfo: () => void
  onShowScoreInfo: () => void
  notifications: NotificationRecord[]
  unreadCount: number
  onNotificationClick: (id: number) => void
}

function Header({
  displayName,
  onSignOut,
  onShowProgramInfo,
  onShowScoreInfo,
  notifications,
  unreadCount,
  onNotificationClick,
}: HeaderProps) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)

  return (
    <header className="flex items-center justify-between px-6 py-6 lg:px-10">
      <div className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs uppercase tracking-[0.35rem] text-slate-300 transition-colors hover:border-white/30 hover:text-white">
        <span className="block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
        LIVE
      </div>
      <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
        <button
          type="button"
          onClick={onShowProgramInfo}
          className="transition hover:text-white"
        >
          프로그램 소개
        </button>
        <button
          type="button"
          onClick={onShowScoreInfo}
          className="transition hover:text-white"
        >
          점수 시스템
        </button>
        {/* <Link to="/community" className="transition hover:text-white">
          커뮤니티
        </Link> */}
      </nav>
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/30 hover:text-white"
            onClick={() => setIsNotificationOpen((prev) => !prev)}
          >
            <span className="text-lg leading-none">🔔</span>
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>

          {isNotificationOpen ? (
            <div className="absolute right-0 z-20 mt-3 w-80 rounded-2xl border border-white/10 bg-night/95 p-3 text-xs shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
              <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.35rem] text-slate-500">
                <span>알림</span>
                <span>{notifications.length} 개</span>
              </div>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-3 text-[11px] text-slate-500">
                    아직 알림이 없습니다.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => onNotificationClick(notification.id)}
                      className={`flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-left ${
                        notification.readAt
                          ? 'border-white/10 bg-white/5 text-slate-400'
                          : 'border-brand/40 bg-brand/10 text-slate-100'
                      }`}
                    >
                      <span className="text-[11px] font-semibold text-slate-200">
                        {notification.type === 'comment_on_post'
                          ? `${notification.data.commenter_name ?? '누군가'} 님이 내 글에 댓글을 남겼습니다.`
                          : '새 알림'}
                      </span>
                      {notification.data.comment_preview ? (
                        <span className="line-clamp-2 text-[11px] text-slate-400">
                          {notification.data.comment_preview}
                        </span>
                      ) : null}
                      <span className="text-[10px] text-slate-500">
                        {format(new Date(notification.createdAt), 'MM.dd HH:mm')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
        <Link
          to="/community"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35rem] text-slate-300 transition hover:border-white/30 hover:text-white"
        >
          커뮤니티
        </Link>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35rem] text-slate-400 lg:flex">
          {displayName}
        </div>
        <button
          className="relative overflow-hidden rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-white/40 hover:text-white"
          onClick={() => {
            void onSignOut()
          }}
        >
          <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100">
            <span className="shimmer absolute inset-0 rounded-full opacity-80" />
          </span>
          로그아웃
        </button>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="flex flex-col justify-center gap-8">
      <div className="flex flex-col gap-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.35rem] text-slate-300">
          2025 Diet Protocol
        </div>
        <h1 className="font-display text-4xl leading-[1.15] text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
          당신의 한 달을 바꿀
          <br />
          하이엔드 다이어트 챌린지
        </h1>
        <p className="max-w-xl text-base text-slate-300 sm:text-lg">
          인바디 기반의 정밀 측정, 주간 인증 미션, 체계적인 점수 시스템으로 공정하면서도 자극적인 다이어트 레이스. 지금 가입하고
          개인 맞춤형 프로그램을 시작하세요.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { badge: '90점', title: '체지방률 변화율', description: '시작 대비 감량 퍼포먼스' },
          { badge: '10점', title: '주간 출석', description: '끊김 없는 인증 루틴' },
          { badge: '+0.5%', title: '성별 핸디캡', description: '여성 참가자 가산점' },
        ].map((item) => (
          <div key={item.title} className="glass relative overflow-hidden rounded-2xl px-5 py-6 shadow-2xl shadow-black/20">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="text-sm text-slate-400">{item.title}</div>
            <div className="mt-3 text-2xl font-semibold text-white">{item.badge}</div>
            <div className="mt-2 text-sm text-slate-400">{item.description}</div>
            <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-brand/20 blur-xl" />
          </div>
        ))}
      </div>

    </section>
  )
}

type InfoModalProps = {
  type: 'program' | 'score'
  onClose: () => void
}

function InfoModal({ type, onClose }: InfoModalProps) {
  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const title = type === 'program' ? '프로그램 소개' : '점수 시스템'

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={handleBackdropClick}
    >
      <section className="glass relative w-full max-w-2xl rounded-[2rem] border border-white/15 bg-night/90 p-8 text-sm text-slate-200 shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 text-xs uppercase tracking-[0.35rem] text-slate-500 transition hover:text-white"
        >
          닫기
        </button>
        <h2 className="mb-4 font-display text-2xl text-white">{title}</h2>

        {type === 'program' ? (
          <div className="space-y-3 leading-relaxed">
            <p>
              이 프로그램은 인바디(InBody) 또는 동일 BIA 기기를 활용한
              <span className="font-semibold text-white"> 정량적인 체지방 관리</span>를 목표로 합니다. 시작일과 종료일에
              동일 조건으로 측정한 결과지를 기준으로 공정한 랭킹을 산정합니다.
            </p>
            <p>
              <span className="font-semibold text-white">주 1회 인증</span>을 통해 체중·체지방·인증 사진을 기록하고,
              성실한 참여를 유도합니다. 인증 누락 시 경고가 누적되며, 3회 누적 시 중도 포기로 간주됩니다.
            </p>
            <p>
              모든 데이터는 개인별 계정에 안전하게 저장되며, 대시보드에서
              <span className="font-semibold text-white"> 시간 경과에 따른 변화</span>를 직관적으로 확인할 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4 leading-relaxed">
            <p>
              최종 점수는 <span className="font-semibold text-white">체지방률 변화율 90점 + 출석 10점</span>을
              합산해 산정됩니다. 여성 참가자의 경우 체지방 감량률에 <span className="font-semibold text-white">+0.5%</span>{' '}
              가산점이 적용됩니다.
            </p>
            <ul className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
              <li>
                <span className="font-semibold text-white">① 체지방률 변화율 (90점)</span> –{' '}
                (시작 체지방률 − 최종 체지방률) / 시작 체지방률 × 100
              </li>
              <li>
                <span className="font-semibold text-white">② 출석/참여 (10점)</span> – 매주 1회 인증을 기준으로 가산·감점
              </li>
              <li>
                <span className="font-semibold text-white">③ 중도 포기</span> – 경고 3회 또는 필수 인바디 미제출 시 실격
              </li>
            </ul>
            <p className="text-xs text-slate-400">
              실제 랭킹과 시상 규칙은 운영 정책에 따라 일부 조정될 수 있으며, 변경 시 사전 공지 후 적용됩니다.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

type CountdownInfo = {
  totalMs: number
  elapsedMs: number
  remainingMs: number
  percent: number
  isComplete: boolean
}

type MetricPanelProps = {
  progressDegrees: number
  completedWeeks: number
  weeksInChallenge: number
  scoreboard: { label: string; value: string; trend: string }[]
  countdown: CountdownInfo | null
  endAt: Date | null
}

function MetricPanel({
  progressDegrees,
  completedWeeks,
  weeksInChallenge,
  scoreboard,
  countdown,
  endAt,
}: MetricPanelProps) {
  const remainingDisplay = countdown
    ? countdown.isComplete
      ? '완료'
      : formatRemainingShort(countdown.remainingMs)
    : '미설정'

  const endLabel = endAt ? format(endAt, 'yyyy.MM.dd HH:mm') : '종료일을 설정하세요.'

  return (
    <aside className="glass relative flex flex-col gap-6 overflow-hidden rounded-[2.5rem] border-white/10 p-8 shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute -top-24 right-1/2 h-64 w-64 translate-x-1/2 rounded-full bg-brand/30 blur-3xl" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-white">이번 달 챌린지</h2>
          <p className="text-sm text-slate-400">Sandglass Progress</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          기록 {completedWeeks}/{weeksInChallenge}
        </span>
      </div>

      <div className="relative flex items-center justify-center py-6">
        <div className="relative flex h-64 w-64 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-white/15" />
          <div
            className="absolute inset-3 rounded-full"
            style={{
              background: `conic-gradient(from 270deg, rgba(108, 99, 255, 0.85) 0deg, rgba(108, 99, 255, 0.85) ${progressDegrees}deg, rgba(255, 255, 255, 0.08) ${progressDegrees}deg, rgba(255, 255, 255, 0.08) 360deg)`,
            }}
          />
          <div className="absolute inset-6 rounded-full bg-night/90 backdrop-blur-lg" />
          <div className="absolute inset-10 rounded-[40%] border border-white/10 bg-gradient-to-b from-white/20 via-white/5 to-transparent shadow-inner" />
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-night/70 text-center">
            <div className="flex flex-col items-center gap-1 text-sm uppercase tracking-[0.35rem] text-slate-400">
              <span className="text-xs tracking-[0.45rem] text-slate-500">Remaining</span>
              <span className="text-xl font-semibold text-white">{remainingDisplay}</span>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 animate-spin-reverse bg-gradient-to-r from-brand/20 via-transparent to-brand/20 blur-3xl" />
      </div>

      <div className="grid gap-4">
        {scoreboard.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition hover:border-white/20"
          >
            <div>
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500">{item.trend}</p>
            </div>
            <span className="text-2xl font-semibold text-white">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span>종료 예정일</span>
          <span className="text-slate-300">{endLabel}</span>
        </div>
      </div>
    </aside>
  )
}

type WeeklyTrendCardProps = {
  logs: WeeklyLogRecord[]
  isLoading: boolean
  startBodyFat: number | null
}

function WeeklyTrendCard({ logs, isLoading, startBodyFat }: WeeklyTrendCardProps) {
  const chartData = useMemo(() => {
    const ascending = [...logs].sort((a, b) => (a.weekStart > b.weekStart ? 1 : -1))
    return ascending
      .filter((log) => log.bodyFatPercentage != null)
      .map((log) => ({
        week: format(parseISO(log.weekStart), 'MM월 dd일'),
        bodyFat: log.bodyFatPercentage,
      }))
  }, [logs])

  return (
    <section className="glass rounded-[2.5rem] border border-white/10 p-8 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl text-white">체지방률 추이</h3>
          <p className="text-sm text-slate-400">주간 기록 기반 변화 그래프</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {chartData.length} Weeks Logged
        </span>
      </div>

      <div className="mt-6 h-64">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">데이터를 불러오는 중...</div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-500">
            <span>아직 기록된 체지방률 데이터가 없습니다.</span>
            <span>주간 인증을 등록하면 추이가 표시돼요.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8" />
              <XAxis dataKey="week" stroke="#94a3b8" tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                tickLine={false}
                domain={['dataMin-1', 'dataMax+1']}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
              {startBodyFat != null ? (
                <ReferenceLine
                  y={startBodyFat}
                  stroke="#f97316"
                  strokeDasharray="4 6"
                  label={{ value: 'Start', position: 'insideTopRight', fill: '#f97316', fontSize: 12 }}
                />
              ) : null}
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(9,9,20,0.92)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '1rem',
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, '체지방률']}
                labelFormatter={(label) => label}
              />
              <Line
                type="monotone"
                dataKey="bodyFat"
                stroke="#6C63FF"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, stroke: '#ffffff', fill: '#6C63FF' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

type WeeklyLogBoardProps = {
  logs: WeeklyLogRecord[]
  isLoading: boolean
  hasThisWeekLog: boolean
  currentWeekStart: string
  onSubmit: (input: WeeklyLogInput) => Promise<void>
  isSubmitting: boolean
  errorMessage: string | null
}

function WeeklyLogBoard({
  logs,
  isLoading,
  hasThisWeekLog,
  currentWeekStart,
  onSubmit,
  isSubmitting,
  errorMessage,
}: WeeklyLogBoardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(currentWeekStart)
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [notes, setNotes] = useState('')
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    setWeekStart(currentWeekStart)
  }, [currentWeekStart])

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    },
    [previewUrl],
  )

  const logsWithDelta = useMemo(() => {
    return logs.map((log, index) => {
      const next = logs[index + 1]
      let delta: number | null = null
      if (log.bodyFatPercentage != null && next?.bodyFatPercentage != null) {
        delta = log.bodyFatPercentage - next.bodyFatPercentage
      }
      return { ...log, deltaFromPrev: delta }
    })
  }, [logs])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  const resetForm = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setWeekStart(currentWeekStart)
    setWeight('')
    setBodyFat('')
    setNotes('')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const weightValue = weight ? Number.parseFloat(weight) : null
    const bodyFatValue = bodyFat ? Number.parseFloat(bodyFat) : null

    try {
      await onSubmit({
        weekStart,
        weightKg: weightValue,
        bodyFatPercentage: bodyFatValue,
        notes,
        photoFile: selectedFile,
      })
      resetForm()
    } catch (error) {
      console.error('[WeeklyLogBoard] submit error', error)
    }
  }

  return (
    <section className="glass rounded-[2.5rem] border border-white/10 p-8 shadow-2xl shadow-black/30">
      {/* 입력 폼 영역 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-xl text-white">주간 기록 게시판</h3>
            <p className="text-sm text-slate-400">인증 사진과 체지방률 변화를 공유하세요.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHint((prev) => !prev)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:border-white/30 hover:text-white"
            >
              {showHint ? '도움말 숨기기' : '도움말 보기'}
            </button>
            {hasThisWeekLog ? (
              <span className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                이번 주 완료
              </span>
            ) : (
              <span className="rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
                이번 주 미완료
              </span>
            )}
          </div>
        </div>

        <form className="mt-2 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              주차 (월요일 기준)
              <input
                type="date"
                value={weekStart}
                onChange={(event) => setWeekStart(event.target.value)}
                required
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              체중 (kg)
              <input
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                inputMode="decimal"
                placeholder="예: 72.4"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              체지방률 (%)
              <input
                value={bodyFat}
                onChange={(event) => setBodyFat(event.target.value)}
                inputMode="decimal"
                placeholder="예: 18.5"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              인증 사진
              <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 p-4">
                <input type="file" accept="image/*" onChange={handleFileChange} />
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-32 w-full rounded-xl object-cover" />
                ) : (
                  <p className="text-xs text-slate-500">인증 사진을 업로드하면 썸네일이 표시됩니다.</p>
                )}
              </div>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            메모
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="이번 주 경험이나 느낀 점을 기록해보세요."
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
            />
          </label>

          {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}

          {showHint ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
              <p>• Supabase Storage의 `weekly-logs` 버킷은 private으로 유지하고, 사용자별 경로(UID/파일) 접근 정책을 설정해야 사진이 표시됩니다.</p>
              <p>• 주별 1회 기록만 허용됩니다. 중복 제출 시 오류 메시지가 나타납니다.</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="glass relative overflow-hidden rounded-2xl bg-brand/80 px-6 py-3 text-sm font-semibold uppercase tracking-[0.35rem] text-brand-foreground shadow-brand/30 transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100">
              <span className="shimmer absolute inset-0" />
            </span>
            {isSubmitting ? '저장 중...' : hasThisWeekLog ? '추가 기록 저장' : '이번 주 기록 완료'}
          </button>
        </form>
      </div>

      {/* 최근 기록 리스트 - 아래쪽 전체 너비 사용 */}
      <div className="mt-10 border-t border-white/10 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm uppercase tracking-[0.35rem] text-slate-400">Recent Logs</h4>
          <span className="text-xs text-slate-500">{logs.length} entries</span>
        </div>

        <div className="flex max-h-[560px] flex-col gap-4 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">기록을 불러오는 중...</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-8 text-sm text-slate-500">
              <span>등록된 주간 기록이 없습니다.</span>
              <span>첫 기록을 작성해 챌린지를 시작해보세요!</span>
            </div>
          ) : (
            logsWithDelta.map((log) => (
              <article key={log.id} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                {log.photoPublicUrl ? (
                  <img src={log.photoPublicUrl} alt="주간 인증 사진" className="h-20 w-20 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-slate-500">
                    No Photo
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>{format(parseISO(log.weekStart), 'yyyy.MM.dd')}</span>
                    <span className="text-xs text-slate-500">
                      {format(parseISO(log.submittedAt), 'MM월 dd일 HH:mm')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.35rem] text-slate-400">
                    {log.bodyFatPercentage != null ? (
                      <span>
                        체지방 {log.bodyFatPercentage.toFixed(1)}%
                        {log.deltaFromPrev != null && log.deltaFromPrev !== 0
                          ? ` (${log.deltaFromPrev > 0 ? '+' : ''}${log.deltaFromPrev.toFixed(1)}%)`
                          : ''}
                      </span>
                    ) : (
                      <span>체지방 데이터 없음</span>
                    )}
                    {log.weightKg != null ? <span>체중 {log.weightKg.toFixed(1)}kg</span> : null}
                  </div>
                  {log.notes ? <p className="text-sm text-slate-300">{log.notes}</p> : null}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 border-t border-white/10 px-6 py-6 text-xs text-slate-500 lg:px-0">
      <span>ⓒ 2025 Diet Challenge Lab. All rights reserved.</span>
      <div className="flex gap-4">
        <a href="#" className="transition hover:text-white">
          이용약관
        </a>
        <a href="#" className="transition hover:text-white">
          개인정보처리방침
        </a>
        <a href="#" className="transition hover:text-white">
          고객센터
        </a>
      </div>
    </footer>
  )
}

function DecorativeBackground() {
  return (
    <>
      <div className="absolute left-1/2 top-1/2 h-[780px] w-[780px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/20 blur-[120px]" />
      <div className="absolute -left-32 top-24 h-96 w-96 rounded-full bg-emerald-400/10 blur-[160px]" />
      <div className="absolute -right-16 top-1/3 h-80 w-80 animate-float-slow rounded-full bg-accent/20 blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)] opacity-80" />
    </>
  )
}

function formatRemainingShort(ms: number) {
  const { days, hours, minutes, seconds } = getDurationParts(ms)
  const time = `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
  return days > 0 ? `${days}일 ${time}` : time
}

function formatRemainingLong(ms: number) {
  const { days, hours, minutes } = getDurationParts(ms)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}일`)
  if (hours > 0) parts.push(`${hours}시간`)
  if (minutes > 0) parts.push(`${minutes}분`)
  if (parts.length === 0) parts.push('1분 미만')
  return parts.join(' ')
}

function toDateTimeLocalValue(iso: string) {
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm")
}

function getDurationParts(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}

function pad2(value: number) {
  return value.toString().padStart(2, '0')
}

export default DashboardPage

