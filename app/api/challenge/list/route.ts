import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch challenges where user is sender or recipient, not expired, not yet played
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .in('status', ['pending', 'accepted'])
      .is('match_id', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
    }

    // Collect unique user IDs to fetch profiles
    const userIds = new Set<string>();
    for (const c of challenges ?? []) {
      userIds.add(c.sender_id);
      if (c.recipient_id) userIds.add(c.recipient_id);
    }
    // Remove current user
    userIds.delete(user.id);

    let profiles: Record<string, { username: string; display_name: string | null; elo_rating: number; games_won: number; games_played: number }> = {};

    if (userIds.size > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, display_name, elo_rating, games_won, games_played')
        .in('id', Array.from(userIds));

      if (profileData) {
        profiles = Object.fromEntries(
          profileData.map((p) => [p.id, p])
        );
      }
    }

    return NextResponse.json({ challenges: challenges ?? [], profiles });
  } catch (error) {
    console.error('Challenge list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
