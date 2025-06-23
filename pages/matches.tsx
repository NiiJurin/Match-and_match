import { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import MatchCard from "../components/MatchCard";

type Match = {
  id: string;
  date: string;
  time: string;
  location: string;
  level_preference: string;
  team_id: string;
  teams: {
    name: string;
  };
};

export default function MatchList() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user.id)
        .single();

      setMyTeamId(userData?.team_id ?? null);

      const { data, error } = await supabase
        .from('matches')
        .select('*, teams(name)')
        .eq('status', '募集中');

      if (error) setError(error.message);
      else setMatches(data || []);
    };

    load();
  }, []);

  const applyToMatch = async (matchId: string) => {
    if (!myTeamId) {
      setError('チームに所属していません');
      return;
    }

    const { error } = await supabase
      .from('applications')
      .insert({
        match_id: matchId,
        team_id: myTeamId,
        status: '申請中',
      });

    if (error) setError(error.message);
    else alert('応募しました！');
  };

  return (
    <div style={{ padding: 32 }}>
      <h2>募集中の試合一覧</h2>
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            title={`主催: ${match.teams?.name}`}
            tags={[`希望レベル: ${match.level_preference}`]}
            date={`${match.date} ${match.time}`}
            location={match.location}
            positions={{ 応募: { current: 0, max: 1 } }}
          />
        ))}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
