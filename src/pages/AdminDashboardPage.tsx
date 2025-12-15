import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { useAdminData, isAdmin, type UserWithLogs } from '@/hooks/useAdminData'
import { cn } from '@/lib/utils'

function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null

  const { data: usersData, isLoading, isError } = useAdminData(userId)

  if (authLoading) {
    return <FullScreenLoader message="인증 확인 중..." />
  }

  if (!isAdmin(userId)) {
    return <Navigate to="/" replace />
  }

  if (isLoading) {
    return <FullScreenLoader message="데이터를 불러오는 중..." />
  }

  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-night text-slate-300">
        <p className="text-rose-400">데이터를 불러오지 못했습니다.</p>
        <Link to="/" className="text-sm text-brand hover:underline">
          대시보드로 돌아가기
        </Link>
      </div>
    )
  }

  // Sort by body fat reduction (descending)
  const rankedUsers = [...(usersData ?? [])].sort((a, b) => {
    const aReduction = a.bodyFatReduction ?? -999
    const bReduction = b.bodyFatReduction ?? -999
    return bReduction - aReduction
  })

  return (
    <div className="min-h-screen bg-night text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-night/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="font-display text-xl tracking-tight">관리자 대시보드</h1>
          <Link
            to="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35rem] text-slate-400 transition hover:border-white/30 hover:text-white"
          >
            내 대시보드
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">체지방 감량 순위</h2>
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">순위</th>
                  <th className="px-6 py-4">참가자</th>
                  <th className="px-6 py-4 text-right">시작 체지방</th>
                  <th className="px-6 py-4 text-right">현재 체지방</th>
                  <th className="px-6 py-4 text-right">감량</th>
                  <th className="px-6 py-4 text-right">시작 체중</th>
                  <th className="px-6 py-4 text-right">현재 체중</th>
                  <th className="px-6 py-4 text-right">감량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rankedUsers.map((user, index) => (
                  <RankRow key={user.profile.id} user={user} rank={index + 1} />
                ))}
                {rankedUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                      아직 참가자가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">참가자별 체지방 추이</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rankedUsers.map((user) => (
              <UserTrendCard key={user.profile.id} user={user} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

type RankRowProps = {
  user: UserWithLogs
  rank: number
}

function RankRow({ user, rank }: RankRowProps) {
  const { profile, latestLog, bodyFatReduction, weightReduction } = user

  const rankStyle = rank <= 3 ? 'text-yellow-400 font-bold' : 'text-slate-400'

  return (
    <tr className="transition hover:bg-white/5">
      <td className={cn('px-6 py-4', rankStyle)}>
        {rank === 1 && '🥇 '}
        {rank === 2 && '🥈 '}
        {rank === 3 && '🥉 '}
        {rank}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/30 text-xs font-medium text-white">
              {(profile.fullName ?? '?').charAt(0).toUpperCase()}
            </span>
          )}
          <span className="font-medium">{profile.fullName ?? '익명'}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-right text-slate-300">
        {profile.initialBodyFatPercentage != null ? `${profile.initialBodyFatPercentage}%` : '-'}
      </td>
      <td className="px-6 py-4 text-right text-slate-300">
        {latestLog?.bodyFatPercentage != null ? `${latestLog.bodyFatPercentage}%` : '-'}
      </td>
      <td className="px-6 py-4 text-right">
        {bodyFatReduction != null ? (
          <span className={cn(bodyFatReduction > 0 ? 'text-emerald-400' : bodyFatReduction < 0 ? 'text-rose-400' : 'text-slate-400')}>
            {bodyFatReduction > 0 ? '-' : bodyFatReduction < 0 ? '+' : ''}
            {Math.abs(bodyFatReduction).toFixed(1)}%
          </span>
        ) : (
          <span className="text-slate-500">-</span>
        )}
      </td>
      <td className="px-6 py-4 text-right text-slate-300">
        {profile.initialWeightKg != null ? `${profile.initialWeightKg}kg` : '-'}
      </td>
      <td className="px-6 py-4 text-right text-slate-300">
        {latestLog?.weightKg != null ? `${latestLog.weightKg}kg` : '-'}
      </td>
      <td className="px-6 py-4 text-right">
        {weightReduction != null ? (
          <span className={cn(weightReduction > 0 ? 'text-emerald-400' : weightReduction < 0 ? 'text-rose-400' : 'text-slate-400')}>
            {weightReduction > 0 ? '-' : weightReduction < 0 ? '+' : ''}
            {Math.abs(weightReduction).toFixed(1)}kg
          </span>
        ) : (
          <span className="text-slate-500">-</span>
        )}
      </td>
    </tr>
  )
}

type UserTrendCardProps = {
  user: UserWithLogs
}

function UserTrendCard({ user }: UserTrendCardProps) {
  const { profile, logs, bodyFatReduction } = user

  // Prepare data for mini chart
  const chartData = [
    ...(profile.initialBodyFatPercentage != null
      ? [{ label: '시작', value: profile.initialBodyFatPercentage }]
      : []),
    ...logs
      .filter((log) => log.bodyFatPercentage != null)
      .map((log, index) => ({
        label: `${index + 1}주차`,
        value: log.bodyFatPercentage!,
      })),
  ]

  const maxValue = chartData.length > 0 ? Math.max(...chartData.map((d) => d.value)) : 100
  const minValue = chartData.length > 0 ? Math.min(...chartData.map((d) => d.value)) : 0
  const range = maxValue - minValue || 1

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center gap-3">
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/30 text-sm font-medium text-white">
            {(profile.fullName ?? '?').charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <div className="font-medium">{profile.fullName ?? '익명'}</div>
          {bodyFatReduction != null && (
            <div
              className={cn(
                'text-xs',
                bodyFatReduction > 0 ? 'text-emerald-400' : bodyFatReduction < 0 ? 'text-rose-400' : 'text-slate-400'
              )}
            >
              {bodyFatReduction > 0 ? '▼ ' : bodyFatReduction < 0 ? '▲ ' : ''}
              {Math.abs(bodyFatReduction).toFixed(1)}% 감량
            </div>
          )}
        </div>
      </div>

      {chartData.length > 1 ? (
        <div className="flex h-24 items-end gap-1">
          {chartData.map((data, index) => {
            const height = ((data.value - minValue) / range) * 100
            return (
              <div key={index} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-brand/60 transition-all"
                  style={{ height: `${Math.max(height, 10)}%` }}
                />
                <span className="text-[10px] text-slate-500">{data.label}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center text-sm text-slate-500">
          아직 기록이 없습니다
        </div>
      )}

      <div className="mt-4 flex justify-between text-xs text-slate-400">
        <span>시작: {profile.initialBodyFatPercentage ?? '-'}%</span>
        <span>현재: {logs[logs.length - 1]?.bodyFatPercentage ?? '-'}%</span>
      </div>
    </div>
  )
}

function FullScreenLoader({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-night text-slate-300">
      <div className="h-16 w-16 animate-spin rounded-full border-2 border-white/10 border-t-brand shadow-glow" />
      <p className="text-sm uppercase tracking-[0.35rem] text-slate-500">{message}</p>
    </div>
  )
}

export default AdminDashboardPage
