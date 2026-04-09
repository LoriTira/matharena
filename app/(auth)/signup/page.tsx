'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';

function SignupContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  return <AuthForm initialMode="signup" redirect={redirect} />;
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-ink-muted">Loading...</div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
