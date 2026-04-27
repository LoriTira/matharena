import { Navbar } from '@/components/layout/Navbar';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { OAuthRedirectGuard } from '@/components/auth/OAuthRedirectGuard';
import { FriendshipsProvider } from '@/hooks/useFriendships';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <FriendshipsProvider>
        <OAuthRedirectGuard />
        <div className="min-h-screen bg-page">
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">{children}</main>
        </div>
      </FriendshipsProvider>
    </ToastProvider>
  );
}
