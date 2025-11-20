import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatISO, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabaseClient'

const WEEKLY_LOGS_QUERY_KEY = 'weeklyLogs'
const WEEKLY_LOGS_BUCKET = 'weekly-logs'

export type WeeklyLogRecord = {
  id: number
  weekStart: string
  weightKg: number | null
  bodyFatPercentage: number | null
  photoPath: string | null
  photoPublicUrl: string | null
  notes: string | null
  submittedAt: string
  updatedAt: string
}

export type WeeklyLogInput = {
  weekStart: string
  weightKg?: number | null
  bodyFatPercentage?: number | null
  notes?: string | null
  photoFile?: File | null
}

async function fetchWeeklyLogs(userId: string): Promise<WeeklyLogRecord[]> {
  const { data, error } = await supabase
    .from('weekly_logs')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })

  if (error) {
    throw error
  }

  const logs = data ?? []

  const records = await Promise.all(
    logs.map(async (log) => {
      let signedUrl: string | null = null

      if (log.photo_url) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from(WEEKLY_LOGS_BUCKET)
          .createSignedUrl(log.photo_url, 60 * 60)

        if (signedError) {
          console.warn('[useWeeklyLogs] signed URL error', signedError)
        } else {
          signedUrl = signedData?.signedUrl ?? null
        }
      }

      return {
        id: log.id,
        weekStart: log.week_start,
        weightKg: log.weight_kg,
        bodyFatPercentage: log.body_fat_percentage,
        photoPath: log.photo_url,
        photoPublicUrl: signedUrl,
        notes: log.notes,
        submittedAt: log.submitted_at ?? formatISO(parseISO(log.week_start)),
        updatedAt: log.updated_at ?? log.submitted_at ?? formatISO(parseISO(log.week_start)),
      }
    }),
  )

  return records
}

async function uploadPhoto(userId: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const uniqueSegment = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  const fileName = `${Date.now()}-${uniqueSegment}.${extension}`
  const filePath = `${userId}/${fileName}`

  const { error } = await supabase.storage.from(WEEKLY_LOGS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw error
  }

  return filePath
}

async function createWeeklyLog(userId: string, input: WeeklyLogInput) {
  let photoPath: string | null = null

  if (input.photoFile) {
    photoPath = await uploadPhoto(userId, input.photoFile)
  }

  const { error } = await supabase.from('weekly_logs').insert({
    user_id: userId,
    week_start: input.weekStart,
    weight_kg: input.weightKg ?? null,
    body_fat_percentage: input.bodyFatPercentage ?? null,
    photo_url: photoPath,
    notes: input.notes ?? null,
  })

  if (error) {
    if (error.code === '23505') {
      throw new Error('해당 주차에는 이미 기록이 존재합니다.')
    }
    throw error
  }
}

export function useWeeklyLogs(userId: string | null | undefined) {
  return useQuery({
    queryKey: [WEEKLY_LOGS_QUERY_KEY, userId],
    queryFn: () => fetchWeeklyLogs(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateWeeklyLog(userId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: WeeklyLogInput) => {
      if (!userId) {
        throw new Error('로그인 정보가 필요합니다.')
      }
      await createWeeklyLog(userId, input)
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: [WEEKLY_LOGS_QUERY_KEY, userId] })
      }
    },
  })
}

export function getStorageBucketName() {
  return WEEKLY_LOGS_BUCKET
}

