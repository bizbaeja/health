import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommunityLayout } from '@/pages/community/CommunityLayout'
import { useCreatePost, type PostCategory } from '@/hooks/useCommunityPosts'
import { useAuth } from '@/providers/AuthProvider'
import { cn } from '@/lib/utils'

const categories: { value: PostCategory; label: string; description: string }[] = [
  { value: 'log_share', label: '인증 공유', description: '주간 인증 사진과 함께 성과를 공유하세요.' },
  { value: 'tip', label: '노하우/팁', description: '식단, 운동, 라이프스타일 등 유용한 정보를 나눠요.' },
  { value: 'qna', label: 'Q&A', description: '궁금한 점을 질문하고 서로 답변해보세요.' },
  { value: 'free', label: '자유 주제', description: '잡담, 응원, 일상 이야기도 환영합니다.' },
]

type FilePreview = {
  file: File
  previewUrl: string
}

function CommunityNewPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const createPostMutation = useCreatePost(user?.id)

  const [category, setCategory] = useState<PostCategory>('log_share')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<FilePreview[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      files.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
    }
  }, [files])

  const isSubmitting = createPostMutation.isPending

  const previewCountLabel = useMemo(() => {
    if (files.length === 0) return '이미지 미첨부'
    if (files.length === 1) return '이미지 1장'
    return `이미지 ${files.length}장`
  }, [files.length])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files
    if (!selected) return

    const next: FilePreview[] = []
    for (const file of Array.from(selected)) {
      const previewUrl = URL.createObjectURL(file)
      next.push({ file, previewUrl })
    }
    files.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
    setFiles(next)
  }

  const handleRemoveFile = (previewUrl: string) => {
    setFiles((prev) => {
      const next = prev.filter((item) => item.previewUrl !== previewUrl)
      URL.revokeObjectURL(previewUrl)
      return next
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    if (!title.trim()) {
      setErrorMessage('제목을 입력해주세요.')
      return
    }

    if (!content.trim()) {
      setErrorMessage('본문을 입력해주세요.')
      return
    }

    try {
      const postId = await createPostMutation.mutateAsync({
        category,
        title: title.trim(),
        content: content.trim(),
        files: files.map((item) => item.file),
      })
      navigate(`/community/${postId}`)
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('게시글 작성에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
    }
  }

  return (
    <CommunityLayout>
      <div className="mx-auto max-w-3xl space-y-6 rounded-[2.5rem] border border-white/10 bg-white/5 p-10 shadow-[0_40px_100px_rgba(5,1,15,0.45)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-white">새 글 작성</h2>
            <p className="mt-2 text-sm text-slate-400">커뮤니티와 경험을 공유하고 서로에게 자극과 응원을 보내 주세요.</p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            <h3 className="text-sm font-semibold text-white">카테고리</h3>
            <p className="mt-1 text-xs text-slate-500">글의 성격을 가장 잘 나타내는 카테고리를 선택하세요.</p>
            <div className="mt-4 grid gap-3 text-xs uppercase tracking-[0.35rem] sm:grid-cols-2">
              {categories.map((item) => {
                const isActive = item.value === category
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setCategory(item.value)}
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left transition',
                      isActive
                        ? 'border-brand bg-brand/20 text-white shadow-glow'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/30 hover:text-white',
                    )}
                  >
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="mt-1 text-[11px] normal-case tracking-normal text-slate-400">{item.description}</p>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              제목
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="제목을 입력하세요"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
              />
            </label>
            <label className="mt-6 flex flex-col gap-2 text-sm text-slate-300">
              본문
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={10}
                placeholder="다른 참가자와 공유하고 싶은 내용을 작성하세요."
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand focus:shadow-glow"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <div>
                <h3 className="font-semibold text-white">이미지</h3>
                <p className="text-xs text-slate-500">인증 사진이나 참고 이미지를 업로드하세요. 최대 5장까지 첨부할 수 있습니다.</p>
              </div>
              <span className="text-xs text-slate-500">{previewCountLabel}</span>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-xs text-slate-400 transition hover:border-white/30 hover:text-white">
                <span>이미지 선택</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />
              </label>
              {files.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {files.map(({ previewUrl, file }) => (
                    <div key={previewUrl} className="relative overflow-hidden rounded-2xl border border-white/10">
                      <img src={previewUrl} alt={file.name} className="h-40 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(previewUrl)}
                        className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/40 px-2 py-1 text-[11px] uppercase tracking-[0.3rem] text-white"
                      >
                        제거
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/community')}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35rem] text-slate-400 transition hover:border-white/30 hover:text-white"
              disabled={isSubmitting}
            >
              ← 목록으로
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-brand px-6 py-3 text-xs font-semibold uppercase tracking-[0.35rem] text-brand-foreground shadow-lg shadow-brand/30 transition hover:bg-indigo-400 disabled:opacity-60"
            >
              {isSubmitting ? '작성 중...' : '글 등록'}
            </button>
          </div>
        </form>
      </div>
    </CommunityLayout>
  )
}

export default CommunityNewPage

