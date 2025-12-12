import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { formatDistanceToNow } from 'date-fns'
import { CommunityLayout } from '@/pages/community/CommunityLayout'
import { useAuth } from '@/providers/AuthProvider'
import { usePost, useTogglePostLike, type PostCategory } from '@/hooks/useCommunityPosts'
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useToggleCommentLike,
  type CommentRecord,
} from '@/hooks/useComments'
import { cn } from '@/lib/utils'
import { HeartIcon } from '@/components/icons/HeartIcon'

function CommunityPostPage() {
  const { postId: postIdParam } = useParams<{ postId: string }>()
  const postId = postIdParam ? Number.parseInt(postIdParam, 10) : NaN
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<CommentRecord | null>(null)
  const [likeTargetId, setLikeTargetId] = useState<number | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  const { data: post, isLoading, isError } = usePost(userId, Number.isNaN(postId) ? null : postId)
  const toggleLikeMutation = useTogglePostLike(userId)
  const {
    data: comments = [],
    isLoading: isCommentsLoading,
    isError: isCommentsError,
    error: commentsError,
  } = useComments(Number.isNaN(postId) ? null : postId, userId)
  const createCommentMutation = useCreateComment(userId)
  const deleteCommentMutation = useDeleteComment(userId)
  const toggleCommentLikeMutation = useToggleCommentLike(userId)

  const onToggleLike = () => {
    if (!post) return
    toggleLikeMutation.mutate({ postId: post.id, liked: post.likedByUser })
  }

  const totalComments = useMemo(() => countComments(comments), [comments])

  const handleSubmitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!post || !draft.trim()) return

    createCommentMutation.mutate(
      {
        postId: post.id,
        content: draft.trim(),
        parentId: replyTo?.id ?? null,
      },
      {
        onSuccess: () => {
          setDraft('')
          setReplyTo(null)
        },
      },
    )
  }

  const handleReply = (comment: CommentRecord) => {
    setReplyTo(comment)
    setDraft((prev) => (prev.length > 0 ? prev : ''))
  }

  const handleCancelReply = () => {
    setReplyTo(null)
  }

  const handleToggleCommentLike = (comment: CommentRecord) => {
    if (!post) return
    setLikeTargetId(comment.id)
    toggleCommentLikeMutation.mutate(
      {
        postId: post.id,
        commentId: comment.id,
        liked: comment.likedByUser,
      },
      {
        onSettled: () => {
          setLikeTargetId(null)
        },
      },
    )
  }

  const handleDeleteComment = (comment: CommentRecord) => {
    if (!post) return
    if (!window.confirm('이 댓글을 삭제할까요?')) return
    setDeleteTargetId(comment.id)
    deleteCommentMutation.mutate(
      { postId: post.id, commentId: comment.id },
      {
        onSettled: () => {
          setDeleteTargetId(null)
        },
      },
    )
  }

  return (
    <CommunityLayout>
      <div className="space-y-6 rounded-[2.5rem] border border-white/10 bg-white/5 p-10 shadow-[0_40px_120px_rgba(5,1,15,0.55)]">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs uppercase tracking-[0.35rem] text-slate-400 transition hover:text-white"
          >
            ← 뒤로 가기
          </button>
          <Link
            to="/community"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35rem] text-slate-400 transition hover:border-white/30 hover:text-white"
          >
            목록 보기
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="h-10 w-2/3 animate-pulse rounded-full border border-white/10 bg-white/5" />
            <div className="h-24 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
            <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          </div>
        ) : isError || !post ? (
          <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
            게시글을 불러오지 못했습니다. 링크가 잘못되었거나 삭제된 글일 수 있습니다.
          </div>
        ) : (
          <>
            <header className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/60 bg-brand/20 px-3 py-1 text-xs uppercase tracking-[0.35rem] text-slate-50">
                {categoryLabel(post.category)}
              </div>
              <h1 className="font-display text-3xl text-white sm:text-4xl">{post.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.35rem] text-slate-500">
                <div className="flex items-center gap-3">
                  {post.authorAvatarUrl ? (
                    <img src={post.authorAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/30 text-sm font-medium text-white">
                      {(post.authorName ?? '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>{post.authorName ?? '익명'}</span>
                </div>
                <span>{format(new Date(post.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
              </div>
            </header>

            {post.media.length > 0 ? (
              <section className="grid gap-4 sm:grid-cols-2">
                {post.media.map(({ path, url }) => (
                  <div
                    key={path}
                    className="flex max-h-[420px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/40"
                  >
                    <img
                      src={url ?? undefined}
                      alt=""
                      className="max-h-[420px] w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ))}
              </section>
            ) : null}

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-slate-200">
              {post.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-base text-slate-200">
                  {paragraph}
                </p>
              ))}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-xs uppercase tracking-[0.35rem] text-slate-500">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onToggleLike}
                  disabled={toggleLikeMutation.isPending}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1 transition',
                    post.likedByUser
                      ? 'border-rose-400 bg-rose-400/20 text-rose-200'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-rose-400/40 hover:text-rose-200',
                    toggleLikeMutation.isPending && 'opacity-60',
                  )}
                  aria-pressed={post.likedByUser}
                >
                  <span className="sr-only">{post.likedByUser ? '좋아요 취소' : '좋아요'}</span>
                  <HeartIcon filled={post.likedByUser} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.35rem]">{post.likeCount}</span>
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35rem] text-slate-400 transition hover:border-white/30 hover:text-white"
                >
                  신고
                </button>
              </div>
              <Link
                to="/community"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35rem] text-slate-400 transition hover:border-white/30 hover:text-white"
              >
                목록으로 돌아가기
              </Link>
            </div>

            <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl text-white">댓글</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35rem] text-slate-400">
                    {totalComments} 개
                  </span>
                </div>
                <p className="text-xs text-slate-500">서로를 응원하고 정보도 공유해보세요.</p>
              </header>

              <form onSubmit={handleSubmitComment} className="space-y-3 rounded-2xl border border-white/10 bg-night/40 p-5 shadow-inner shadow-black/40">
                {replyTo ? (
                  <div className="flex items-center justify-between rounded-xl border border-brand/40 bg-brand/10 px-4 py-2 text-xs text-brand-foreground">
                    <span>
                      <strong>{replyTo.authorName ?? '익명'}</strong> 님께 답글 작성 중
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelReply}
                      className="text-[11px] uppercase tracking-[0.35rem] text-brand-foreground/80 transition hover:text-white"
                    >
                      취소
                    </button>
                  </div>
                ) : null}
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={500}
                  rows={replyTo ? 3 : 4}
                  placeholder="따뜻한 응원과 피드백을 남겨주세요."
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{draft.length} / 500</span>
                  <button
                    type="submit"
                    disabled={draft.trim().length === 0 || createCommentMutation.isPending}
                    className={cn(
                      'relative overflow-hidden rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.35rem] text-white/80 transition hover:border-brand hover:text-white',
                      (draft.trim().length === 0 || createCommentMutation.isPending) && 'opacity-50',
                    )}
                  >
                    {createCommentMutation.isPending ? '등록 중...' : '댓글 등록'}
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {isCommentsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-4 opacity-70"
                      >
                        <div className="mb-3 h-3 w-24 rounded bg-white/10" />
                        <div className="mb-2 h-3 w-full rounded bg-white/10" />
                        <div className="h-3 w-4/5 rounded bg-white/10" />
                      </div>
                    ))}
                  </div>
                ) : isCommentsError ? (
                  <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-sm text-rose-200">
                    댓글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
                    {commentsError instanceof Error ? (
                      <span className="mt-2 block text-xs text-rose-300/70">{commentsError.message}</span>
                    ) : null}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-transparent py-14 text-sm text-slate-500">
                    아직 댓글이 없습니다. 첫 번째 응원의 한마디를 남겨보세요!
                  </div>
                ) : (
                  <div className="space-y-6">
                    {comments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        depth={0}
                        onReply={handleReply}
                        onToggleLike={handleToggleCommentLike}
                        onDelete={handleDeleteComment}
                        likeTargetId={likeTargetId}
                        deleteTargetId={deleteTargetId}
                        isLiking={toggleCommentLikeMutation.isPending}
                        isDeleting={deleteCommentMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </CommunityLayout>
  )
}

function categoryLabel(category: PostCategory) {
  const mapping: Record<PostCategory, string> = {
    log_share: '인증 공유',
    tip: '노하우/팁',
    qna: 'Q&A',
    free: '자유 주제',
  }
  return mapping[category]
}

function CommentItem({
  comment,
  depth,
  onReply,
  onToggleLike,
  onDelete,
  likeTargetId,
  deleteTargetId,
  isLiking,
  isDeleting,
}: {
  comment: CommentRecord
  depth: number
  onReply: (comment: CommentRecord) => void
  onToggleLike: (comment: CommentRecord) => void
  onDelete: (comment: CommentRecord) => void
  likeTargetId: number | null
  deleteTargetId: number | null
  isLiking: boolean
  isDeleting: boolean
}) {
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: ko,
  })

  return (
    <div className={cn(depth > 0 && 'border-l border-white/5 pl-6 sm:pl-10')}>
      <div className="rounded-2xl border border-white/10 bg-night/40 p-5 shadow-[0_20px_60px_rgba(5,1,15,0.45)]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {comment.authorAvatarUrl ? (
              <img src={comment.authorAvatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/30 text-xs font-medium text-white">
                {(comment.authorName ?? '?').charAt(0).toUpperCase()}
              </span>
            )}
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35rem] text-slate-400">
              {comment.authorName ?? '익명'}
            </div>
            <span className="text-xs uppercase tracking-[0.35rem] text-slate-500">{timeAgo}</span>
          </div>
          {comment.isMine ? (
            <button
              type="button"
              onClick={() => onDelete(comment)}
              disabled={isDeleting && deleteTargetId === comment.id}
              className={cn(
                'text-[11px] uppercase tracking-[0.35rem] text-rose-300 transition hover:text-rose-200',
                isDeleting && deleteTargetId === comment.id && 'opacity-60',
              )}
            >
              삭제
            </button>
          ) : null}
        </header>

        <div className="mt-4 text-sm leading-relaxed text-slate-200">{comment.content}</div>

        <footer className="mt-5 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35rem] text-slate-500">
          <button
            type="button"
            onClick={() => onReply(comment)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400 transition hover:border-brand/40 hover:text-white"
          >
            답글
          </button>
          <button
            type="button"
            onClick={() => onToggleLike(comment)}
            disabled={isLiking && likeTargetId === comment.id}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 transition',
              comment.likedByUser
                ? 'border-rose-400 bg-rose-400/20 text-rose-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:border-rose-400/40 hover:text-rose-200',
              isLiking && likeTargetId === comment.id && 'opacity-60',
            )}
            aria-pressed={comment.likedByUser}
          >
            <span className="sr-only">{comment.likedByUser ? '좋아요 취소' : '좋아요'}</span>
            <HeartIcon filled={comment.likedByUser} className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.35rem]">
              {comment.likeCount}
            </span>
          </button>
        </footer>
      </div>

      {comment.children.length > 0 ? (
        <div className="mt-4 space-y-4">
          {comment.children.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              depth={depth + 1}
              onReply={onReply}
              onToggleLike={onToggleLike}
              onDelete={onDelete}
              likeTargetId={likeTargetId}
              deleteTargetId={deleteTargetId}
              isLiking={isLiking}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function countComments(list: CommentRecord[]): number {
  return list.reduce((acc, comment) => acc + 1 + countComments(comment.children), 0)
}

export default CommunityPostPage

