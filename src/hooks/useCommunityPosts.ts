import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'

const COMMUNITY_MEDIA_BUCKET = 'community-media'

export type PostCategory = 'log_share' | 'tip' | 'qna' | 'free'

export type PostSummary = {
  id: number
  userId: string
  category: PostCategory
  title: string
  content: string
  media: { path: string; url: string | null }[]
  createdAt: string
  updatedAt: string
  authorName: string | null
  likeCount: number
  likedByUser: boolean
}

type FetchPostsOptions = {
  userId: string
  category?: PostCategory | null
}

const POSTS_QUERY_KEY = 'communityPosts'
const POST_QUERY_KEY = 'communityPost'

async function fetchPosts({ userId, category }: FetchPostsOptions): Promise<PostSummary[]> {
  let query = supabase
    .from('posts')
    .select(
      `
        id,
        user_id,
        category,
        title,
        content,
        media_urls,
        created_at,
        updated_at,
        author:profiles (full_name),
        post_likes(count)
      `,
    )
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const [{ data, error }, likedResult] = await Promise.all([
    query,
    supabase.from('post_likes').select('post_id').eq('user_id', userId),
  ])

  if (error) {
    throw error
  }

  const likedSet = new Set<number>()
  likedResult.data?.forEach((like) => likedSet.add(like.post_id))

  const posts = data ?? []

  return Promise.all(
    posts.map(async (post) => {
      const mediaUrls = Array.isArray(post.media_urls) ? (post.media_urls as string[]) : []
      const media = await Promise.all(
        mediaUrls.map(async (path) => {
          const { data: signed } = await supabase.storage.from(COMMUNITY_MEDIA_BUCKET).createSignedUrl(path, 60 * 60)
          return { path, url: signed?.signedUrl ?? null }
        }),
      )

      const likeCount = Array.isArray(post.post_likes) && post.post_likes.length > 0 ? post.post_likes[0].count ?? 0 : 0
      const authorName = Array.isArray(post.author) && post.author.length > 0 ? post.author[0].full_name ?? null : null

      return {
        id: post.id,
        userId: post.user_id,
        category: post.category as PostCategory,
        title: post.title,
        content: post.content,
        media,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        authorName,
        likeCount,
        likedByUser: likedSet.has(post.id),
      }
    }),
  )
}

async function fetchPost(userId: string, postId: number): Promise<PostSummary | null> {
  const [{ data, error }, likedResult] = await Promise.all([
    supabase
      .from('posts')
      .select(
        `
          id,
          user_id,
          category,
          title,
          content,
          media_urls,
          created_at,
          updated_at,
          author:profiles (full_name),
          post_likes(count)
        `,
      )
      .eq('id', postId)
      .maybeSingle(),
    supabase.from('post_likes').select('post_id').eq('user_id', userId).eq('post_id', postId).maybeSingle(),
  ])

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const mediaUrls = Array.isArray(data.media_urls) ? (data.media_urls as string[]) : []
  const media = await Promise.all(
    mediaUrls.map(async (path) => {
      const { data: signed } = await supabase.storage.from(COMMUNITY_MEDIA_BUCKET).createSignedUrl(path, 60 * 60)
      return { path, url: signed?.signedUrl ?? null }
    }),
  )

  const likeCount = Array.isArray(data.post_likes) && data.post_likes.length > 0 ? data.post_likes[0].count ?? 0 : 0
  const authorName = Array.isArray(data.author) && data.author.length > 0 ? data.author[0].full_name ?? null : null

  return {
    id: data.id,
    userId: data.user_id,
    category: data.category as PostCategory,
    title: data.title,
    content: data.content,
    media,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    authorName,
    likeCount,
    likedByUser: Boolean(likedResult.data),
  }
}

type CreatePostPayload = {
  userId: string
  category: PostCategory
  title: string
  content: string
  files: File[]
}

async function uploadMediaFiles(userId: string, files: File[]) {
  const paths: string[] = []

  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const uniqueSegment =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)
    const fileName = `${Date.now()}-${uniqueSegment}.${extension}`
    const storagePath = `${userId}/${fileName}`

    const { error } = await supabase.storage.from(COMMUNITY_MEDIA_BUCKET).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) {
      throw error
    }

    paths.push(storagePath)
  }

  return paths
}

async function createPost(payload: CreatePostPayload) {
  const mediaPaths = await uploadMediaFiles(payload.userId, payload.files)

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: payload.userId,
      category: payload.category,
      title: payload.title,
      content: payload.content,
      media_urls: mediaPaths,
    })
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return data.id as number
}

async function toggleLike(postId: number, userId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
    if (error) {
      throw error
    }
  } else {
    const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
    if (error) {
      throw error
    }
  }
}

export function usePosts(userId: string | null | undefined, category: PostCategory | null) {
  return useQuery({
    queryKey: [POSTS_QUERY_KEY, userId, category ?? 'all'],
    queryFn: () => fetchPosts({ userId: userId!, category }),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 2,
  })
}

export function usePost(userId: string | null | undefined, postId: number | null) {
  return useQuery({
    queryKey: [POST_QUERY_KEY, userId, postId],
    queryFn: () => fetchPost(userId!, postId!),
    enabled: Boolean(userId) && typeof postId === 'number',
    staleTime: 1000 * 60,
  })
}

export function useCreatePost(userId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: Omit<CreatePostPayload, 'userId'>) => {
      if (!userId) {
        throw new Error('로그인 정보가 필요합니다.')
      }
      return createPost({ ...payload, userId })
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: [POSTS_QUERY_KEY, userId] })
      }
    },
  })
}

type ToggleLikePayload = {
  postId: number
  liked: boolean
}

export function useTogglePostLike(userId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, liked }: ToggleLikePayload) => {
      if (!userId) {
        throw new Error('로그인 정보가 필요합니다.')
      }
      await toggleLike(postId, userId, liked)
    },
    onSuccess: (_data, variables) => {
      if (!userId) return
      void queryClient.invalidateQueries({ queryKey: [POSTS_QUERY_KEY, userId] })
      void queryClient.invalidateQueries({ queryKey: [POST_QUERY_KEY, userId, variables.postId] })
    },
  })
}

