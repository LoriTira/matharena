'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import type {
  FriendSummary,
  FriendRequestSummary,
  FriendsResponse,
} from '@/types';

/**
 * Shape returned by the useFriendships hook. Shared with the Context so the
 * navbar badge and the profile friends section read from one subscription.
 */
interface FriendshipsState {
  friends: FriendSummary[];
  pending_incoming: FriendRequestSummary[];
  pending_outgoing: FriendRequestSummary[];
  unread_count: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

const defaultState: FriendshipsState = {
  friends: [],
  pending_incoming: [],
  pending_outgoing: [],
  unread_count: 0,
  loading: true,
  refetch: async () => {},
};

const FriendshipsContext = createContext<FriendshipsState>(defaultState);

/**
 * Provider that owns the friendships fetch + realtime subscription. Mount
 * once in the authed layout so child components can call useFriendships()
 * and get consistent state without each spinning up its own channel.
 */
export function FriendshipsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<FriendRequestSummary[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<FriendRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Previous unread count so we can fire a toast on 0 → N transitions only.
  const prevUnreadRef = useRef<number>(0);
  // Whether the first fetch has completed — prevents a spurious toast on
  // initial hydration when the badge starts at some positive value.
  const hydratedRef = useRef<boolean>(false);

  const refetch = useCallback(async () => {
    if (!user) {
      setFriends([]);
      setPendingIncoming([]);
      setPendingOutgoing([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/friends');
      if (!res.ok) return;
      const data = (await res.json()) as FriendsResponse;
      setFriends(data.friends ?? []);
      setPendingIncoming(data.pending_incoming ?? []);
      setPendingOutgoing(data.pending_outgoing ?? []);

      const nextUnread = data.unread_count ?? 0;
      if (hydratedRef.current && nextUnread > prevUnreadRef.current) {
        const latest = data.pending_incoming?.[0];
        if (latest) {
          const name = latest.display_name || latest.username;
          addToast(`${name} sent you a friend request`, 'info');
        }
      }
      prevUnreadRef.current = nextUnread;
      hydratedRef.current = true;
    } catch (err) {
      console.error('useFriendships refetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user, addToast]);

  // Initial load + refetch on user change.
  useEffect(() => {
    hydratedRef.current = false;
    prevUnreadRef.current = 0;
    setLoading(true);
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Realtime: subscribe to the whole friendships table, filter client-side.
  // postgres_changes only supports one server-side filter and friendships
  // is small/quiet enough that a client filter is cheap.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`friendships-for-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        (payload) => {
          const newRow = payload.new as { user_a?: string; user_b?: string } | null;
          const oldRow = payload.old as { user_a?: string; user_b?: string } | null;
          const touches =
            newRow?.user_a === user.id ||
            newRow?.user_b === user.id ||
            oldRow?.user_a === user.id ||
            oldRow?.user_b === user.id;
          if (touches) refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, refetch]);

  const value: FriendshipsState = useMemo(
    () => ({
      friends,
      pending_incoming: pendingIncoming,
      pending_outgoing: pendingOutgoing,
      unread_count: pendingIncoming.length,
      loading,
      refetch,
    }),
    [friends, pendingIncoming, pendingOutgoing, loading, refetch],
  );

  return (
    <FriendshipsContext.Provider value={value}>
      {children}
    </FriendshipsContext.Provider>
  );
}

/** Read-only access to the shared friendships state. */
export function useFriendships(): FriendshipsState {
  return useContext(FriendshipsContext);
}
