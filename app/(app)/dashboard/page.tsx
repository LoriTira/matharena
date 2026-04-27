import { redirect } from 'next/navigation';

// /dashboard is now /. Middleware also redirects, but this is a defensive
// fallback so any direct render still lands on the canonical URL.
export default function LegacyDashboardPage() {
  redirect('/');
}
