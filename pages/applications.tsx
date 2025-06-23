import { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';

type ApplicationWithMatch = {
  id: string;
  status: string;
  match_id: string;
  team_id: string;
  matches: {
    date: string;
    location: string;
    teams: {
      name: string;
    };
  };
  teams: {
    name: string;
  };
};

export default function ApplicationList() {
  const [applications, setApplications] = useState<ApplicationWithMatch[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user.id)
        .single();

      const teamId = userData?.team_id;
      setMyTeamId(teamId);

      if (!teamId) {
        setError('チームに所属していません');
        return;
      }

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          matches (
            date,
            location,
            team_id,
            teams(name)
          ),
          teams(name)
        `)
        .eq('matches.team_id', teamId); // 自分のチームが主催

      if (error) setError(error.message);
      else setApplications(data || []);
    };

    fetchApplications();
  }, []);

const handleUpdate = async (appId: string, status: '承認' | '却下') => {
  const { error: updateError } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', appId);

  if (updateError) {
    alert('エラー: ' + updateError.message);
    return;
  }

  // ▼ match_id を取得
  const matchId = applications.find(app => app.id === appId)?.match_id;

  if (status === '承認' && matchId) {
    const { error: matchError } = await supabase
      .from('matches')
      .update({ status: 'マッチ済' })
      .eq('id', matchId);

    if (matchError) {
      alert('試合ステータス更新エラー: ' + matchError.message);
    }
  }

  // ローカル状態更新
  setApplications(applications.map(app =>
    app.id === appId ? { ...app, status } : app
  ));
};


  return (
    <div style={{ padding: 32 }}>
      <h2>あなたの試合への応募一覧</h2>
      {applications.map((app) => (
        <div key={app.id} style={{ border: '1px solid #ccc', marginBottom: 12, padding: 8 }}>
          <p>試合日: {app.matches?.date}</p>
          <p>場所: {app.matches?.location}</p>
          <p>応募チーム: {app.teams?.name}</p>
          <p>ステータス: {app.status}</p>
          {app.status === '申請中' && (
            <>
              <button onClick={() => handleUpdate(app.id, '承認')}>承認</button>
              <button onClick={() => handleUpdate(app.id, '却下')}>却下</button>
            </>
          )}
        </div>
      ))}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
