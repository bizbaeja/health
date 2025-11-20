import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from '@/providers/AuthProvider'
import DashboardPage from '@/pages/DashboardPage'
import CommunityListPage from '@/pages/community/CommunityListPage.tsx'
import CommunityNewPage from '@/pages/community/CommunityNewPage.tsx'
import CommunityPostPage from '@/pages/community/CommunityPostPage.tsx'
import AuthPage from '@/pages/AuthPage'
import OnboardingPage from '@/pages/OnboardingPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <RequireOnboardingComplete>
                  <DashboardPage />
                </RequireOnboardingComplete>
              </RequireAuth>
            }
          />
          <Route
            path="/community"
            element={
              <RequireAuth>
                <RequireOnboardingComplete>
                  <CommunityListPage />
                </RequireOnboardingComplete>
              </RequireAuth>
            }
          />
          <Route
            path="/community/new"
            element={
              <RequireAuth>
                <RequireOnboardingComplete>
                  <CommunityNewPage />
                </RequireOnboardingComplete>
              </RequireAuth>
            }
          />
          <Route
            path="/community/:postId"
            element={
              <RequireAuth>
                <RequireOnboardingComplete>
                  <CommunityPostPage />
                </RequireOnboardingComplete>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <FullScreenLoader message="세션을 확인하는 중..." />
  }

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

function RequireOnboardingComplete({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()

  if (loading) {
    return <FullScreenLoader message="프로필을 불러오는 중..." />
  }

  if (!profile || !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

function FullScreenLoader({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-night text-slate-300">
      <div className="h-16 w-16 animate-spin rounded-full border-2 border-white/10 border-t-brand shadow-glow" />
      <p className="text-sm uppercase tracking-[0.35rem] text-slate-500">{message}</p>
    </div>
  )
}

export default App
