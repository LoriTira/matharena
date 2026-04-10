'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    let initialResolved = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      initialResolved = true;
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        // INITIAL_SESSION fires synchronously on subscribe and can carry a stale/null
        // session before cookie hydration is done — defer to getUser() for the baseline.
        if (event === 'INITIAL_SESSION' && !initialResolved) return;
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
