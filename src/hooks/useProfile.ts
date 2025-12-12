import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'

const AVATARS_BUCKET = 'avatars'

export type UpdateProfileInput = {
  fullName: string
  avatarFile?: File | null
}

async function uploadAvatar(userId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const uniqueSegment =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  const fileName = `${Date.now()}-${uniqueSegment}.${extension}`
  const storagePath = `${userId}/${fileName}`

  console.log('[uploadAvatar] uploading to:', storagePath)

  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    console.error('[uploadAvatar] upload error:', error)
    throw error
  }

  console.log('[uploadAvatar] success')
  return storagePath
}

async function updateProfile(userId: string, input: UpdateProfileInput) {
  let avatarUrl: string | null = null

  if (input.avatarFile) {
    const storagePath = await uploadAvatar(userId, input.avatarFile)
    const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(storagePath)
    avatarUrl = data.publicUrl
    console.log('[updateProfile] avatarUrl:', avatarUrl)
  }

  const updateData: Record<string, unknown> = {
    full_name: input.fullName.trim() || null,
    updated_at: new Date().toISOString(),
  }

  if (avatarUrl) {
    updateData.avatar_url = avatarUrl
  }

  console.log('[updateProfile] updating with:', updateData)

  const { error } = await supabase.from('profiles').update(updateData).eq('id', userId)

  if (error) {
    console.error('[updateProfile] update error:', error)
    throw error
  }

  console.log('[updateProfile] success')
}

export function useUpdateProfile(userId: string | null | undefined, onSuccess?: () => void) {
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      if (!userId) {
        throw new Error('로그인이 필요합니다.')
      }
      await updateProfile(userId, input)
    },
    onSuccess,
  })
}
