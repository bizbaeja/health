import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'

export type ChallengeSettings = {
  startAt: string
  endAt: string
}

async function fetchChallengeSettings(userId: string): Promise<ChallengeSettings | null> {
  const { data, error } = await supabase
    .from('challenge_settings')
    .select('start_at, end_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return {
    startAt: data.start_at,
    endAt: data.end_at,
  }
}

type UpsertPayload = {
  startAt: string
  endAt: string
}

async function upsertChallengeSettings(userId: string, payload: UpsertPayload) {
  const { error } = await supabase.from('challenge_settings').upsert(
    {
      user_id: userId,
      start_at: payload.startAt,
      end_at: payload.endAt,
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    throw error
  }
}

const QUERY_KEY = 'challengeSettings'

export function useChallengeSettings(userId: string | null | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: () => fetchChallengeSettings(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpsertChallengeSettings(userId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpsertPayload) => {
      if (!userId) {
        throw new Error('로그인 정보가 필요합니다.')
      }
      await upsertChallengeSettings(userId, payload)
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] })
      }
    },
  })
}

