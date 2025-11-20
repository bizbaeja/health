import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CommunityLayout } from '@/pages/community/CommunityLayout'
import { useAuth } from '@/providers/AuthProvider'
import { usePost, useTogglePostLike, type PostCategory } from '@/hooks/useCommunityPosts'
import { cn } from '@/lib/utils'

function CommunityPostPage() {
  const { postId: postIdParam } = useParams<{ postId: string }>()
  const postId = postIdParam ? Number.parseInt(postIdParam, 10) : NaN
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data: post, isLoading, isError } = usePost(userId, Number.isNaN(postId) ? null : postId)
  const toggleLikeMutation = useTogglePostLike(userId)

  const onToggleLike = () => {
    if (!post) return
    toggleLikeMutation.mutate({ postId: post.id, liked: post.likedByUser })
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
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs uppercase tracking-[0.35rem] text-brand-foreground">
                {categoryLabel(post.category)}
              </div>
              <h1 className="font-display text-3xl text-white sm:text-4xl">{post.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.35rem] text-slate-500">
                <span>{post.authorName ?? '익명'}</span>
                <span>{format(new Date(post.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}</span>
              </div>
            </header>

            {post.media.length > 0 ? (
              <section className="grid gap-4 sm:grid-cols-2">
                {post.media.map(({ path, url }) => (
                  <img
                    key={path}
                    src={url ?? undefined}
                    alt=""
                    className="h-64 w-full rounded-3xl object-cover"
                    loading="lazy"
                  />
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
                >
                  {post.likedByUser ? '좋아요 취소' : '좋아요'} ({post.likeCount})
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

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
              댓글 기능은 다음 단계에서 추가될 예정입니다.
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

export default CommunityPostPage

