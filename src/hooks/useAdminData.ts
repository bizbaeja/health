import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'

const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID

export type UserProfile = {
  id: string
  fullName: string | null
  avatarUrl: string | null
  gender: 'male' | 'female' | null
  heightCm: number | null
  initialWeightKg: number | null
  initialBodyFatPercentage: number | null
}

export type UserWeeklyLog = {
  userId: string
  weekStart: string
  weightKg: number | null
  bodyFatPercentage: number | null
  submittedAt: string
}

export type UserWithLogs = {
  profile: UserProfile
  logs: UserWeeklyLog[]
  latestLog: UserWeeklyLog | null
  bodyFatReduction: number | null
  weightReduction: number | null
}

export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId || !ADMIN_USER_ID) return false
  return userId === ADMIN_USER_ID
}

async function fetchAllUsersData(): Promise<UserWithLogs[]> {
  // Fetch all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('onboarding_completed', true)
    .order('full_name', { ascending: true })

  if (profilesError) {
    throw profilesError
  }

  if (!profiles || profiles.length === 0) {
    return []
  }

  // Fetch all weekly logs
  const { data: logs, error: logsError } = await supabase
    .from('weekly_logs')
    .select('*')
    .order('week_start', { ascending: true })

  if (logsError) {
    throw logsError
  }

  // Group logs by user
  const logsByUser = new Map<string, UserWeeklyLog[]>()
  for (const log of logs ?? []) {
    const userId = log.user_id
    if (!logsByUser.has(userId)) {
      logsByUser.set(userId, [])
    }
    logsByUser.get(userId)!.push({
      userId: log.user_id,
      weekStart: log.week_start,
      weightKg: log.weight_kg,
      bodyFatPercentage: log.body_fat_percentage,
      submittedAt: log.submitted_at,
    })
  }

  // Build user data with logs
  const usersWithLogs: UserWithLogs[] = profiles.map((profile) => {
    const userLogs = logsByUser.get(profile.id) ?? []
    const latestLog = userLogs.length > 0 ? userLogs[userLogs.length - 1] : null

    // Calculate body fat reduction (initial - latest)
    let bodyFatReduction: number | null = null
    if (profile.body_fat_percentage != null && latestLog?.bodyFatPercentage != null) {
      bodyFatReduction = profile.body_fat_percentage - latestLog.bodyFatPercentage
    }

    // Calculate weight reduction (initial - latest)
    let weightReduction: number | null = null
    if (profile.weight_kg != null && latestLog?.weightKg != null) {
      weightReduction = profile.weight_kg - latestLog.weightKg
    }

    return {
      profile: {
        id: profile.id,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        gender: profile.gender,
        heightCm: profile.height_cm,
        initialWeightKg: profile.weight_kg,
        initialBodyFatPercentage: profile.body_fat_percentage,
      },
      logs: userLogs,
      latestLog,
      bodyFatReduction,
      weightReduction,
    }
  })

  return usersWithLogs
}

export function useAdminData(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['adminData'],
    queryFn: fetchAllUsersData,
    enabled: isAdmin(userId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}
