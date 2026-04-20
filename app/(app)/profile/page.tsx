'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Profile, UserAchievement } from '@/types';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { Panel } from '@/components/arcade/Panel';
import { SectionHead } from '@/components/arcade/SectionHead';
import { Btn } from '@/components/arcade/Btn';
import { RankPip } from '@/components/arcade/RankPip';
import { Sparkline } from '@/components/arcade/Sparkline';
import { Bar } from '@/components/arcade/Bar';
import { Skeleton } from '@/components/ui/Skeleton';
import { MatchHistoryList } from '@/components/profile/MatchHistoryList';
import { FriendsSection } from '@/components/profile/FriendsSection';
import { UserSearchModal } from '@/components/search/UserSearchModal';
import { getRank } from '@/lib/ranks';
import { type Tier } from '@/components/arcade/tokens';

function tierToArcade(tier: string): Tier {
  switch (tier) {
    case 'Bronze':      return 'Bronze';
    case 'Silver':      return 'Silver';
    case 'Gold':        return 'Gold';
    case 'Platinum':    return 'Platinum';
    case 'Diamond':     return 'Diamond';
    case 'Grandmaster': return 'Grand';
    default:            return 'Wood';
  }
}

type OpAccuracy = { label: string; op: string; correct: number; total: number };

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [affiliationType, setAffiliationType] = useState<'school' | 'company' | ''>('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);
  const [earnedAchievementIds, setEarnedAchievementIds] = useState<Set<string>>(new Set());
  const [sprintPB, setSprintPB] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [eloHistory, setEloHistory] = useState<number[]>([]);
  const [peakElo, setPeakElo] = useState<number | null>(null);
  const [avgTimeSec, setAvgTimeSec] = useState<number | null>(null);
  const [opAccuracy, setOpAccuracy] = useState<OpAccuracy[]>([]);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [profileRes, achRes, sprintRes, matchesRes, eventsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id),
        supabase.from('practice_sessions')
          .select('score')
          .eq('user_id', user.id)
          .eq('duration', 120)
          .order('score', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('matches')
          .select('player1_id, player2_id, player1_elo_after, player2_elo_after, completed_at')
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .eq('status', 'completed')
          .order('completed_at', { ascending: true })
          .limit(90),
        supabase.from('match_events')
          .select('event, problem_snapshot')
          .eq('player_id', user.id)
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (profileRes.data) {
        const p = profileRes.data as Profile;
        setProfile(p);
        setDisplayName(p.display_name || '');
        setAffiliation(p.affiliation || '');
        setAffiliationType((p.affiliation_type as 'school' | 'company') || '');
        setCountry(p.country || '');
      }

      if (achRes.data) {
        setEarnedAchievementIds(
          new Set((achRes.data as Pick<UserAchievement, 'achievement_id'>[]).map((a) => a.achievement_id))
        );
      }
      if (sprintRes.data) setSprintPB(sprintRes.data.score);

      if (matchesRes.data) {
        const eloPts = matchesRes.data.map((m) => {
          const isP1 = m.player1_id === user.id;
          return (isP1 ? m.player1_elo_after : m.player2_elo_after) ?? 1000;
        });
        setEloHistory(eloPts);
        if (eloPts.length > 0) setPeakElo(Math.max(...eloPts));
      }

      if (eventsRes.data) {
        const byOp: Record<string, { c: number; t: number; times: number[] }> = {};
        for (const ev of eventsRes.data as { event: string; problem_snapshot: { operation?: string } | null }[]) {
          const op = ev.problem_snapshot?.operation;
          if (!op) continue;
          if (!byOp[op]) byOp[op] = { c: 0, t: 0, times: [] };
          byOp[op].t += 1;
          if (ev.event === 'answer_correct') byOp[op].c += 1;
        }
        const labels: Record<string, string> = {
          '+': 'Addition',
          '-': 'Subtraction',
          '*': 'Multiplication',
          '/': 'Division',
        };
        const order = ['+', '-', '*', '/'];
        setOpAccuracy(
          order
            .filter((op) => byOp[op] && byOp[op].t > 0)
            .map((op) => ({ label: labels[op], op, correct: byOp[op].c, total: byOp[op].t }))
        );
      }

      // Avg solve time proxy: group by match and take deltas between consecutive
      // correct answers (elapsed_ms is cumulative from match start, not per-problem).
      const { data: timing } = await supabase
        .from('match_events')
        .select('match_id, elapsed_ms, event, created_at')
        .eq('player_id', user.id)
        .eq('event', 'answer_correct')
        .order('match_id', { ascending: true })
        .order('elapsed_ms', { ascending: true })
        .limit(200);
      if (timing && timing.length > 0) {
        const typed = timing as { match_id: string; elapsed_ms: number }[];
        const deltas: number[] = [];
        let prevMatch: string | null = null;
        let prevElapsed = 0;
        for (const ev of typed) {
          if (ev.match_id !== prevMatch) {
            deltas.push(ev.elapsed_ms);
            prevMatch = ev.match_id;
          } else {
            deltas.push(ev.elapsed_ms - prevElapsed);
          }
          prevElapsed = ev.elapsed_ms;
        }
        // Filter outliers >60s (likely match-boundary artefacts)
        const clean = deltas.filter((d) => d > 0 && d < 60000);
        if (clean.length > 0) {
          const total = clean.reduce((a, b) => a + b, 0);
          setAvgTimeSec((total / clean.length) / 1000);
        }
      }
    };

    load();
  }, [user, supabase]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName || null,
        affiliation: affiliation || null,
        affiliation_type: affiliationType || null,
        country: country || null,
      }),
    });
    const data = await res.json();
    if (data.profile) {
      setProfile(data.profile as Profile);
      setEditing(false);
    }
    setSaving(false);
  };

  if (!profile) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
          <Skeleton className="h-24" /><Skeleton className="h-24" />
          <Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-[14px]">
          <Skeleton className="h-64" /><Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const rank = getRank(profile.elo_rating);
  const arcadeTier = tierToArcade(rank.tier);
  const winRate = profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;
  const initial = (profile.display_name || profile.username)?.[0]?.toUpperCase() ?? 'Y';

  const displayedName = profile.display_name || profile.username;

  return (
    <div className="space-y-[14px]">
      {/* Header card */}
      <Panel padding={0} className="overflow-hidden">
        <div
          className="flex flex-col md:flex-row items-center md:items-center gap-[16px] md:gap-[28px] text-center md:text-left p-[28px] md:p-[40px]"
          style={{
            background: 'linear-gradient(135deg, rgba(54,228,255,0.13), rgba(255,42,127,0.13) 70%, transparent)',
          }}
        >
          <div
            className="shrink-0 grid place-items-center font-display font-extrabold text-[#0a0612]"
            style={{
              width: 92,
              height: 92,
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))',
              boxShadow: '0 0 30px rgba(54,228,255,0.4)',
              fontSize: 48,
            }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[2px] mb-[6px]">
              @{profile.username}{profile.created_at ? ` · joined ${new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}` : ''}
            </div>
            {editing ? (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="font-display font-extrabold text-[28px] md:text-[40px] tracking-[-1px] leading-[1] bg-transparent border-b border-cyan text-ink focus:outline-none w-full"
                placeholder="Display name"
              />
            ) : (
              <div className="font-display font-extrabold text-[32px] md:text-[48px] tracking-[-1.2px] leading-[1] text-ink">
                {displayedName}
              </div>
            )}
            <div className="mt-[10px] flex gap-[10px] items-center flex-wrap justify-center md:justify-start">
              <RankPip tier={arcadeTier} size={24} showLabel />
              <span className="font-mono text-[12px] text-cyan font-bold tracking-[1px]">{profile.elo_rating} Elo</span>
              <span className="font-mono text-[11px] text-ink-tertiary tracking-[1px]">
                · {rank.name}
              </span>
            </div>
          </div>
          <div className="flex gap-[8px] flex-wrap justify-center">
            <Btn size="md" variant={editing ? 'primary' : 'ghost'} onClick={() => editing ? handleSave() : setEditing(true)} disabled={saving}>
              {editing ? (saving ? 'Saving…' : 'Save') : 'Edit profile'}
            </Btn>
            {editing && (
              <Btn size="md" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Btn>
            )}
          </div>
        </div>

        {editing && (
          <div className="p-6 border-t border-edge grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="block font-mono text-[10px] uppercase tracking-[1.6px] text-ink-faint mb-[6px]">Country</span>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="United States"
                className="w-full px-3 py-2 bg-page border border-edge text-ink font-mono text-[12px] focus:outline-none focus:border-cyan transition-colors"
              />
            </label>
            <label className="block">
              <span className="block font-mono text-[10px] uppercase tracking-[1.6px] text-ink-faint mb-[6px]">Affiliation</span>
              <input
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="MIT, Google, etc."
                className="w-full px-3 py-2 bg-page border border-edge text-ink font-mono text-[12px] focus:outline-none focus:border-cyan transition-colors"
              />
            </label>
            <label className="block">
              <span className="block font-mono text-[10px] uppercase tracking-[1.6px] text-ink-faint mb-[6px]">Type</span>
              <select
                value={affiliationType}
                onChange={(e) => setAffiliationType(e.target.value as 'school' | 'company' | '')}
                className="w-full px-3 py-2 bg-page border border-edge text-ink font-mono text-[12px] focus:outline-none focus:border-cyan transition-colors"
              >
                <option value="">None</option>
                <option value="school">School</option>
                <option value="company">Company</option>
              </select>
            </label>
          </div>
        )}
      </Panel>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
        {[
          { l: 'Matches', v: String(profile.games_played), c: 'text-cyan' },
          { l: 'Win rate', v: `${winRate}%`, c: 'text-lime' },
          { l: 'Peak Elo', v: peakElo !== null ? String(peakElo) : String(profile.elo_rating), c: 'text-gold' },
          { l: 'Avg speed', v: avgTimeSec !== null ? `${avgTimeSec.toFixed(2)}s` : (sprintPB !== null ? `${sprintPB} PB` : '—'), c: 'text-magenta' },
        ].map((s) => (
          <div key={s.l} className="border border-edge-strong bg-panel p-[16px] md:p-[20px]">
            <div className="font-mono text-[10px] text-ink-faint uppercase tracking-[1.4px]">{s.l}</div>
            <div className={`font-display font-extrabold text-[28px] md:text-[36px] tracking-[-0.8px] mt-[6px] tabular-nums ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-[14px]">
        {/* Elo history chart */}
        <Panel padding={24}>
          <SectionHead no="01" title="Elo · last 90 days" color="cyan" />
          {eloHistory.length > 1 ? (
            <div className="h-[140px] md:h-[180px]">
              <Sparkline points={eloHistory} color="cyan" height={180} />
            </div>
          ) : (
            <div className="h-[140px] grid place-items-center font-mono text-[11px] text-ink-faint uppercase tracking-[1.4px]">
              Play a match to see history
            </div>
          )}
        </Panel>

        {/* Badges */}
        <Panel padding={24}>
          <SectionHead
            no="02"
            title={`Badges · ${earnedAchievementIds.size}`}
            color="gold"
          />
          <div className="grid grid-cols-4 gap-[10px]">
            {[...ACHIEVEMENTS]
              .sort((a, b) => {
                const aU = earnedAchievementIds.has(a.id);
                const bU = earnedAchievementIds.has(b.id);
                if (aU && !bU) return -1;
                if (!aU && bU) return 1;
                return 0;
              })
              .slice(0, 8)
              .map((ach) => {
                const unlocked = earnedAchievementIds.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    title={`${ach.name} — ${ach.description}`}
                    className="aspect-square flex flex-col items-center justify-center p-1 transition-all"
                    style={{
                      border: unlocked
                        ? '1px solid var(--neon-cyan)'
                        : '1px solid var(--border-default)',
                      background: unlocked ? 'rgba(54,228,255,0.1)' : 'var(--bg-base)',
                      opacity: unlocked ? 1 : 0.4,
                    }}
                  >
                    <div
                      className="font-display font-extrabold text-[22px] leading-none"
                      style={{ color: unlocked ? 'var(--neon-cyan)' : 'var(--text-faint)' }}
                    >
                      {ach.icon}
                    </div>
                    <div className="font-mono text-[7px] text-ink-tertiary uppercase tracking-[0.8px] mt-[4px] text-center leading-tight">
                      {ach.name}
                    </div>
                  </div>
                );
              })}
          </div>
          {earnedAchievementIds.size > 0 && (
            <div className="text-center font-mono text-[10px] text-ink-faint tracking-[1.2px] uppercase mt-[14px]">
              {earnedAchievementIds.size} / {ACHIEVEMENTS.length} unlocked
            </div>
          )}
        </Panel>
      </div>

      {/* Operation accuracy heatmap */}
      {opAccuracy.length > 0 && (
        <Panel padding={24}>
          <SectionHead no="03" title="Operation accuracy" color="magenta" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
            {opAccuracy.map((s) => {
              const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              const c = pct >= 80 ? 'lime' : pct >= 60 ? 'gold' : pct >= 40 ? 'cyan' : 'magenta';
              const txt = { lime: 'text-lime', gold: 'text-gold', cyan: 'text-cyan', magenta: 'text-magenta' }[c] as string;
              return (
                <div key={s.op}>
                  <div className="flex justify-between mb-[6px]">
                    <span className="font-mono text-[10px] text-ink-tertiary uppercase tracking-[1.2px]">{s.label}</span>
                    <span className={`font-mono text-[11px] font-bold ${txt}`}>{pct}%</span>
                  </div>
                  <Bar progress={pct / 100} color={c as 'lime' | 'gold' | 'cyan' | 'magenta'} height={6} />
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Match history + Friends */}
      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-[14px]">
        <Panel padding={24}>
          <SectionHead no="04" title="Match history" color="cyan" />
          <MatchHistoryList userId={user!.id} viewerId={user!.id} />
        </Panel>

        <Panel padding={24}>
          <SectionHead no="05" title="Friends" color="lime" />
          <FriendsSection onOpenSearch={() => setSearchOpen(true)} />
        </Panel>
      </div>

      <UserSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
