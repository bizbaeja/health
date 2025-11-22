import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'

const COMMENTS_QUERY_KEY = 'communityComments'

export type CommentRecord = {
  id: number
  postId: number
  userId: string
  parentId: number | null
  content: string
  createdAt: string
  updatedAt: string
  authorName: string | null
  likeCount: number
  likedByUser: boolean
  isMine: boolean
  children: CommentRecord[]
}

type CreateCommentInput = {
  postId: number
  content: string
  parentId?: number | null
}

type DeleteCommentInput = {
  postId: number
  commentId: number
}

type ToggleCommentLikeInput = {
  postId: number
  commentId: number
  liked: boolean
}

type CommentRow = {
  id: number | string
  post_id: number | string
  user_id: string
  parent_id: number | string | null
  content: string
  created_at: string
  updated_at: string
  author: { full_name: string | null } | { full_name: string | null }[] | null
  comment_likes: { count: number }[] | null
}

async function fetchComments(postId: number, currentUserId: string): Promise<CommentRecord[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(
      `
        id,
        post_id,
        user_id,
        parent_id,
        content,
        created_at,
        updated_at,
        author:profiles (full_name),
        comment_likes(count)
      `,
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  const rows: CommentRow[] = (data ?? []) as CommentRow[]
  const commentIds = rows.map((row) => Number(row.id)).filter((value) => Number.isFinite(value))

  const likedSet = new Set<number>()
  if (commentIds.length > 0) {
    const { data: likedData, error: likedError } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', currentUserId)
      .in('comment_id', commentIds)

    if (likedError) {
      throw likedError
    }

    likedData?.forEach((like) => {
      const commentId = Number(like.comment_id)
      if (Number.isFinite(commentId)) {
        likedSet.add(commentId)
      }
    })
  }

  const byId = new Map<number, CommentRecord>()
  const roots: CommentRecord[] = []

  rows.forEach((row) => {
    const id = Number(row.id)
    const postIdValue = Number(row.post_id)
    const parentId = row.parent_id != null ? Number(row.parent_id) : null
    const likeCount =
      Array.isArray(row.comment_likes) && row.comment_likes.length > 0 ? Number(row.comment_likes[0].count ?? 0) : 0

    const author =
      row.author && !Array.isArray(row.author)
        ? (row.author as { full_name: string | null })
        : Array.isArray(row.author) && row.author.length > 0
          ? (row.author[0] as { full_name: string | null })
          : null
    const authorName = author?.full_name ?? null

    const comment: CommentRecord = {
      id,
      postId: postIdValue,
      userId: row.user_id,
      parentId,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      authorName,
      likeCount,
      likedByUser: likedSet.has(id),
      isMine: row.user_id === currentUserId,
      children: [],
    }

    byId.set(comment.id, comment)
  })

  byId.forEach((comment) => {
    if (comment.parentId != null && byId.has(comment.parentId)) {
      byId.get(comment.parentId)?.children.push(comment)
    } else {
      roots.push(comment)
    }
  })

  return roots
}

async function createComment(userId: string, input: CreateCommentInput) {
  const { error } = await supabase.from('comments').insert({
    post_id: input.postId,
    user_id: userId,
    parent_id: input.parentId ?? null,
    content: input.content,
  })

  if (error) {
    throw error
  }
}

async function deleteComment(commentId: number, userId: string) {
  const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('user_id', userId)

  if (error) {
    throw error
  }
}

async function toggleCommentLike(commentId: number, userId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId)
    if (error) throw error
  } else {
    const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId })
    if (error) throw error
  }
}

export function useComments(postId: number | null, userId: string | null | undefined) {
  return useQuery({
    queryKey: [COMMENTS_QUERY_KEY, postId, userId],
    queryFn: () => fetchComments(postId!, userId!),
    enabled: typeof postId === 'number' && Boolean(userId),
    staleTime: 1000 * 30,
  })
}

export function useCreateComment(userId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      if (!userId) {
        throw new Error('로그인이 필요합니다.')
      }
      await createComment(userId, input)
    },
    onSuccess: (_data, variables) => {
      if (!userId) return
      void queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, variables.postId, userId] })
    },
  })
}

export function useDeleteComment(userId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId }: DeleteCommentInput) => {
      if (!userId) {
        throw new Error('로그인이 필요합니다.')
      }
      await deleteComment(commentId, userId)
    },
    onSuccess: (_data, variables) => {
      if (!userId) return
      void queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, variables.postId, userId] })
    },
  })
}

export function useToggleCommentLike(userId: string | null | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId, liked }: ToggleCommentLikeInput) => {
      if (!userId) {
        throw new Error('로그인이 필요합니다.')
      }
      await toggleCommentLike(commentId, userId, liked)
    },
    onSuccess: (_data, variables) => {
      if (!userId) return
      void queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, variables.postId, userId] })
    },
  })
}


