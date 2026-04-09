'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Client-side fallback for OAuth redirect preservation.
 * If the server-side callback lost the redirect destination (cookie/param failure),
 * the user lands on /dashboard. This component reads the intended redirect from
 * sessionStorage and navigates there.
 */
export function OAuthRedirectGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    try {
      const pending = sessionStorage.getItem('ma-pending-redirect');
      sessionStorage.removeItem('ma-pending-redirect');

      if (pending && pending.startsWith('/') && !pathname.startsWith(pending.split('?')[0])) {
        router.replace(pending);
      }
    } catch {}
  }, [pathname, router]);

  return null;
}
