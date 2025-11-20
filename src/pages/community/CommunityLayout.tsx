import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

type CommunityTab = {
  label: string
  to: string
  category: 'all' | 'log_share' | 'tip' | 'qna' | 'free'
}

const tabs: CommunityTab[] = [
  { label: '전체', to: '/community', category: 'all' },
  { label: '인증 공유', to: '/community?category=log_share', category: 'log_share' },
  { label: '노하우/팁', to: '/community?category=tip', category: 'tip' },
  { label: 'Q&A', to: '/community?category=qna', category: 'qna' },
  { label: '자유 주제', to: '/community?category=free', category: 'free' },
]

type CommunityLayoutProps = {
  header?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function CommunityLayout({ header, actions, children }: CommunityLayoutProps) {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const activeCategory = (params.get('category') as CommunityTab['category'] | null) ?? 'all'

  return (
    <div className="min-h-screen overflow-x-hidden bg-night text-slate-100">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-brand/20 blur-[200px] sm:h-[560px] sm:w-[560px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_60%)] opacity-80" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 pb-safe pt-safe lg:px-10">
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center gap-3 text-sm uppercase tracking-[0.35rem] text-slate-400 hover:text-white">
              ← Dashboard
            </Link>
            {actions}
          </div>
          {header ?? (
            <div>
              <p className="text-xs uppercase tracking-[0.35rem] text-slate-400">Community</p>
              <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">커뮤니티</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                서로의 경험과 노하우를 공유하고, 인증을 응원하는 공간입니다. 가이드라인을 지키면서 즐겁게 소통해 주세요.
              </p>
            </div>
          )}
          <nav className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  'rounded-full border px-4 py-2 text-xs uppercase tracking-[0.35rem] transition',
                  activeCategory === tab.category
                    ? 'border-brand bg-brand/20 text-white shadow-glow'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/30 hover:text-white',
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}

