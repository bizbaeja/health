import { Link, useLocation, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CommunityLayout } from '@/pages/community/CommunityLayout'
import { useAuth } from '@/providers/AuthProvider'
import { usePosts, useTogglePostLike, type PostCategory, type PostSummary } from '@/hooks/useCommunityPosts'
import { cn } from '@/lib/utils'
import { HeartIcon } from '@/components/icons/HeartIcon'

const categories: { value: PostCategory; label: string }[] = [
  { value: 'log_share', label: '인증 공유' },
  { value: 'tip', label: '노하우/팁' },
  { value: 'qna', label: 'Q&A' },
  { value: 'free', label: '자유 주제' },
]

function CommunityListPage() {
  const { search } = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(search)
  const categoryParam = params.get('category') as PostCategory | null

  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data: posts, isLoading: postsLoading, isError } = usePosts(userId, categoryParam)
  const toggleLikeMutation = useTogglePostLike(userId)

  const handleCompose = () => {
    navigate('/community/new')
  }

  const handleCategoryChange = (value: PostCategory | null) => {
    const next = new URLSearchParams(params)
    if (!value) {
      next.delete('category')
    } else {
      next.set('category', value)
    }
    navigate({ pathname: '/community', search: next.toString() })
  }

  return (
    <CommunityLayout
      actions={
        <button
          type="button"
          onClick={handleCompose}
          className="rounded-full bg-brand px-5 py-2 text-xs font-medium uppercase tracking-[0.35rem] text-brand-foreground shadow-lg shadow-brand/30 transition hover:bg-indigo-400"
        >
          글 작성
        </button>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {postsLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
              게시글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </div>
          ) : posts && posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onToggleLike={() => toggleLikeMutation.mutate({ postId: post.id, liked: post.likedByUser })}
                likeLoading={toggleLikeMutation.isPending}
              />
            ))
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-slate-400">
              아직 게시글이 없습니다. 첫 번째 글을 작성해 보세요!
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            <h3 className="text-sm font-semibold text-white">카테고리 필터</h3>
            <div className="mt-4 flex flex-col gap-2 text-xs uppercase tracking-[0.35rem]">
              <button
                type="button"
                onClick={() => handleCategoryChange(null)}
                className={cn(
                  'rounded-full border px-4 py-2 text-left transition',
                  categoryParam == null ? 'border-brand bg-brand/20 text-white shadow-glow' : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/30 hover:text-white',
                )}
              >
                전체
              </button>
              {categories.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => handleCategoryChange(category.value)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-left transition',
                    categoryParam === category.value
                      ? 'border-brand bg-brand/20 text-white shadow-glow'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/30 hover:text-white',
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-xs text-slate-400">
            <h3 className="text-sm font-semibold text-white">커뮤니티 가이드</h3>
            <ul className="mt-3 space-y-2">
              <li>• 서로를 존중하는 언어를 사용해 주세요.</li>
              <li>• 인증 사진은 개인정보가 드러나지 않도록 주의해 주세요.</li>
              <li>• 부적절한 내용은 신고 버튼을 이용해 알려주세요.</li>
            </ul>
          </div>
        </aside>
      </section>
    </CommunityLayout>
  )
}

type PostCardProps = {
  post: PostSummary
  onToggleLike: () => void
  likeLoading: boolean
}

function PostCard({ post, onToggleLike, likeLoading }: PostCardProps) {
  const firstMedia = post.media.length > 0 ? post.media[0] : null
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko })

  return (
    <article className="flex flex-col gap-4 rounded-[2.5rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(5,1,15,0.45)] transition hover:border-white/20">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.35rem] text-slate-500">
        <span>{post.authorName ?? '익명'}</span>
        <span>{timeAgo}</span>
      </div>
      <Link to={`/community/${post.id}`} className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs uppercase tracking-[0.35rem] text-brand-foreground">
          {categoryLabel(post.category)}
        </div>
        <h3 className="font-display text-2xl text-white">{post.title}</h3>
        <p className="line-clamp-3 text-sm text-slate-300">{post.content}</p>
      </Link>
      {firstMedia ? (
        <Link to={`/community/${post.id}`}>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            <img
              src={firstMedia.url ?? undefined}
              alt=""
              className="max-h-80 w-full object-contain"
              loading="lazy"
            />
          </div>
        </Link>
      ) : null}
      <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs uppercase tracking-[0.35rem] text-slate-500">
        <Link to={`/community/${post.id}`} className="transition hover:text-white">
          상세 보기 →
        </Link>
        <button
          type="button"
          onClick={onToggleLike}
          disabled={likeLoading}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 transition',
            post.likedByUser ? 'border-rose-400 bg-rose-400/20 text-rose-200' : 'border-white/10 bg-white/5 text-slate-400 hover:border-rose-400/40 hover:text-rose-200',
            likeLoading && 'opacity-60',
          )}
          aria-pressed={post.likedByUser}
        >
          <span className="sr-only">{post.likedByUser ? '좋아요 취소' : '좋아요'}</span>
          <HeartIcon filled={post.likedByUser} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.35rem]">{post.likeCount}</span>
        </button>
      </div>
    </article>
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

export default CommunityListPage

