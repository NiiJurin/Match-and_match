import { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';

export default function JoinTeamPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeams = async () => {
      const { data, error } = await supabase.from('teams').select('*');
      if (error) setError(error.message);
      else setTeams(data || []);
    };
    fetchTeams();
  }, []);

  const joinTeam = async (teamId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setError('ログインしてください');

    const { error } = await supabase
      .from('users')
      .update({ team_id: teamId })
      .eq('id', user.id);

    if (error) setError(error.message);
    else alert('チームに参加しました！');
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>チームに参加する</h1>
      {teams.map(team => (
        <div key={team.id} style={{ border: '1px solid #ccc', margin: 8, padding: 8 }}>
          <p>チーム名: {team.name}</p>
          <button onClick={() => joinTeam(team.id)}>参加する</button>
        </div>
      ))}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
