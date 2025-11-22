import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'

export type NotificationType = 'comment_on_post'

export type NotificationRecord = {
  id: number
  userId: string
  type: NotificationType
  data: {
    post_id?: number
    comment_id?: number
    comment_preview?: string
    commenter_name?: string
    created_at?: string
  }
  readAt: string | null
  createdAt: string
}

const NOTIFICATIONS_QUERY_KEY = 'notifications'

async function fetchNotifications(userId: string): Promise<NotificationRecord[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    throw error
  }

  return (
    data?.map((row) => ({
      id: row.id as number,
      userId: row.user_id as string,
      type: row.type as NotificationType,
      data: (row.data ?? {}) as NotificationRecord['data'],
      readAt: (row.read_at as string | null) ?? null,
      createdAt: row.created_at as string,
    })) ?? []
  )
}

async function markNotificationRead(id: number, userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

export function useNotifications(userId: string | null | undefined) {
  return useQuery({
    queryKey: [NOTIFICATIONS_QUERY_KEY, userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30, // 30초마다 새 알림 폴링
  })
}

export function useMarkNotificationRead(userId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      if (!userId) throw new Error('로그인이 필요합니다.')
      await markNotificationRead(id, userId)
    },
    onSuccess: () => {
      if (!userId) return
      void queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_QUERY_KEY, userId] })
    },
  })
}


