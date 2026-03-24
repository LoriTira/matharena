import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent completed matches to find opponents
    const { data: matches } = await supabase
      .from('matches')
      .select('player1_id, player2_id, completed_at')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(50);

    if (!matches || matches.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    // Extract unique opponent IDs, preserving most-recent-first order
    const seen = new Set<string>();
    const opponentIds: string[] = [];
    for (const m of matches) {
      const opId = m.player1_id === user.id ? m.player2_id : m.player1_id;
      if (opId && !seen.has(opId)) {
        seen.add(opId);
        opponentIds.push(opId);
      }
    }

    if (opponentIds.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    // Fetch profiles for these opponents
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, elo_rating, games_played, games_won')
      .in('id', opponentIds);

    if (!profiles) {
      return NextResponse.json({ friends: [] });
    }

    // Sort profiles by the order they appeared in matches (most recent first)
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const friends = opponentIds
      .map(id => profileMap.get(id))
      .filter(Boolean);

    return NextResponse.json({ friends });
  } catch (error) {
    console.error('Friends list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
