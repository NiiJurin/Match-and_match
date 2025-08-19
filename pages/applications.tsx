import { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';

type ApplicationWithMatch = {
  id: string;
  status: '申請中' | '承認' | '却下';
  match_id: string;
  team_id: string;
  matches: { date: string; time?: string; location: string; team_id: string; teams: { name: string } };
  teams: { name: string };
};

export default function ApplicationList() {
  const [applications, setApplications] = useState<ApplicationWithMatch[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users').select('team_id').eq('id', user.id).single();

      const teamId = userData?.team_id;
      setMyTeamId(teamId);
      if (!teamId) return setError('チームに所属していません');

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id, status, match_id, team_id,
          matches ( id, date, time, location, team_id, teams(name) ),
          teams(name)
        `)
        .eq('matches.team_id', teamId)     // 自チームが主催の試合に来た応募
        .order('id', { ascending: false });

      if (error) setError(error.message);
      else setApplications(data || []);
    })();
  }, []);

  const handleUpdate = async (appId: string, status: '承認' | '却下') => {
    const { error: updateError } = await supabase
      .from('applications').update({ status }).eq('id', appId);
    if (updateError) return alert('エラー: ' + updateError.message);

    const matchId = applications.find(a => a.id === appId)?.match_id;

    if (status === '承認' && matchId) {
      const { error: mErr } = await supabase.from('matches').update({ status: 'マッチ済' }).eq('id', matchId);
      if (mErr) alert('試合ステータス更新エラー: ' + mErr.message);
    }
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
  };

  const badgeClass = (s: ApplicationWithMatch['status']) =>
    s === '承認' ? 'green' : s === '却下' ? 'red' : 'orange';

  return (
    <div className="container">
      <h2 style={{marginTop:0}}>応募管理</h2>
      {error && <div className="card" style={{borderColor:'#fecaca', background:'#fef2f2'}}>{error}</div>}

      {applications.length === 0 ? (
        <div className="empty">まだ応募は来ていません。</div>
      ) : (
        <table className="table">
          <thead>
            <tr><th>試合</th><th>応募チーム</th><th>状態</th><th style={{width:180}}></th></tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.id}>
                <td>{app.matches?.date} {app.matches?.time} / {app.matches?.location}</td>
                <td>{app.teams?.name}</td>
                <td><span className={`badge ${badgeClass(app.status)}`}>{app.status}</span></td>
                <td style={{textAlign:'right'}}>
                  {app.status === '申請中' ? (
                    <>
                      <button className="btn primary" onClick={() => handleUpdate(app.id, '承認')}>承認</button>{' '}
                      <button className="btn danger" onClick={() => handleUpdate(app.id, '却下')}>却下</button>
                    </>
                  ) : <span className="help">処理済み</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
