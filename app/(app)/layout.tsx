import { Navbar } from '@/components/layout/Navbar';
import { MathTexture } from '@/components/layout/MathTexture';
import { ToastProvider } from '@/components/ui/ToastProvider';

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505] relative">
      <MathTexture />
      <Navbar />
      <main className="relative z-[1] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  );
}
