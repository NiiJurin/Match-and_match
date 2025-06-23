import { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';

type Application = {
  id: string;
  status: string;
  matches: {
    date: string;
    time: string;
    location: string;
    teams: {
      name: string;
    };
  };
};

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadApplications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('ログインが必要です');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', user.id)
        .single();

      const myTeamId = userData?.team_id;
      if (!myTeamId) {
        setError('チームに所属していません');
        return;
      }

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          matches (
            date,
            time,
            location,
            teams(name)
          )
        `)
        .eq('team_id', myTeamId);

      if (error) setError(error.message);
      else setApplications(data || []);
    };

    loadApplications();
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h2>自分の応募状況</h2>
      {applications.map((app) => (
        <div key={app.id} style={{ border: '1px solid #ccc', padding: 8, marginBottom: 12 }}>
          <p>日付: {app.matches?.date}</p>
          <p>時間: {app.matches?.time}</p>
          <p>場所: {app.matches?.location}</p>
          <p>主催チーム: {app.matches?.teams?.name}</p>
          <p>ステータス: <strong>{app.status}</strong></p>
        </div>
      ))}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
