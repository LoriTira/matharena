import { MatchBoard } from '@/components/match/MatchBoard';

interface MatchPageProps {
  params: Promise<{ matchId: string }>;
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { matchId } = await params;

  return (
    <div>
      <MatchBoard matchId={matchId} />
    </div>
  );
}
