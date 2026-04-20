import { Nav } from '@/components/arcade/Nav';
import { BottomBar } from '@/components/arcade/BottomBar';
import { Shell } from '@/components/arcade/Shell';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { OAuthRedirectGuard } from '@/components/auth/OAuthRedirectGuard';
import { FriendshipsProvider } from '@/hooks/useFriendships';

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <FriendshipsProvider>
        <OAuthRedirectGuard />
        <Shell>
          <Nav />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-12 py-8 md:py-12 pb-24 md:pb-12">
            {children}
          </main>
          <BottomBar />
        </Shell>
      </FriendshipsProvider>
    </ToastProvider>
  );
}
