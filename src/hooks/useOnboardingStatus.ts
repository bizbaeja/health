import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'

type OnboardingStatusRow = {
  user_id: string
  onboarding_completed: boolean
  updated_at: string
}

async function fetchOnboardingStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('onboarding_status')
    .select('onboarding_completed')
    .eq('user_id', userId)
    .maybeSingle()

  // PGRST116 = no rows returned
  if (error && (error as { code?: string }).code !== 'PGRST116') {
    throw error
  }

  const row = data as Pick<OnboardingStatusRow, 'onboarding_completed'> | null
  return row?.onboarding_completed ?? false
}

export function useOnboardingStatus(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['onboardingStatus', userId],
    queryFn: () => fetchOnboardingStatus(userId!),
    enabled: Boolean(userId),
    staleTime: 1000 * 60, // 1분 캐시
  })
}


