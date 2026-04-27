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
    <div className="space-y-10">
      <div>
        <div className="text-[12px] tracking-[5px] font-black text-accent mb-4">
          ▸ MATHSARENA
        </div>
        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-black text-ink leading-[0.95] tracking-tight">
          Where numbers <em className="not-italic text-accent">become sport.</em>
        </h1>
        <p className="text-[15px] sm:text-base font-medium text-ink-tertiary mt-5 max-w-xl leading-relaxed">
          Play a 120-second sprint right now — no signup needed. Sign in to save scores and unlock ranked duels.
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
