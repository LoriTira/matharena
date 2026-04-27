'use client';

import { Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { PlayHub } from '@/components/dashboard/PlayHub';
import { Skeleton } from '@/components/ui/Skeleton';

export const dynamic = 'force-dynamic';

function HomeRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (user) {
    return <DashboardContent />;
  }

  return <GuestHome />;
}

function GuestHome() {
  return (
    <div className="space-y-8">
      <div>
        <div className="text-[12px] tracking-[4px] text-ink-muted mb-3">MATHSARENA</div>
        <h1 className="font-serif text-4xl sm:text-5xl text-ink leading-tight">
          Where numbers become sport.
        </h1>
        <p className="text-[14px] text-ink-muted mt-3 max-w-lg">
          Play a 120-second sprint right now — no signup. Sign in to save scores and unlock ranked duels.
        </p>
      </div>

      <PlayHub mode="guest" />
    </div>
  );
}

export default function HomePage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-72" />
          </div>
        }
      >
        <HomeRouter />
      </Suspense>
    </AppShell>
  );
}
