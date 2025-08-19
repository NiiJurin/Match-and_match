// pages/matches.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';

type TeamSlot = { role: string; required: number; filled: number };
type Match = {
  id: string;
  date: string;
  time: string;
  location: string;
  level_preference: string | null;
  status: string;
  team_id: string;
  show_team_slots: boolean;
  teams: { name: string; team_slots: TeamSlot[] };
};

export default function MatchList() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: u } = await supabase.from('users').select('team_id').eq('id', user.id).single();
        setMyTeamId(u?.team_id ?? null);
      }

      // 主催チーム名＋主催チームの team_slots も一緒に取得
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, date, time, location, level_preference, status, team_id, show_team_slots,
          teams (
            name,
            team_slots ( role, required, filled )
          )
        `)
        .eq('status', '募集中')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) setError(error.message);
      else setMatches(data || []);
    };
    load();
  }, []);

  const applyToMatch = async (matchId: string, hostTeamId: string) => {
    setError('');
    if (!myTeamId) return setError('チームに所属していません（先にチーム参加 or 作成）');
    if (hostTeamId === myTeamId) return setError('自分の主催試合には応募できません');

    const { error } = await supabase.from('applications').insert({
      match_id: matchId, team_id: myTeamId, status: '申請中',
    });
    if (error) setError(error.code === '23505' ? 'この試合には既に応募済みです' : error.message);
    else alert('対戦申請を送りました！');
  };

  // 主催チームにロール参加（free agent向け）
  const joinHostTeam = async (hostTeamId: string, role: string) => {
    setError('');
    // RPC: claim_team_slot を使用
    const { error } = await supabase.rpc('claim_team_slot', { p_team_id: hostTeamId, p_role: role });
    if (error) {
      if (error.message.includes('already in a team')) setError('既に他のチームに所属しています');
      else if (error.message.includes('slot full')) setError('そのロールは満員です');
      else setError(error.message);
      return;
    }
    alert('ロールを確保してチームに参加しました！');
    // 反映のため再読み込み
    const { data } = await supabase
      .from('matches')
      .select(`
        id, date, time, location, level_preference, status, team_id, show_team_slots,
        teams ( name, team_slots ( role, required, filled ) )
      `)
      .eq('status', '募集中');
    setMatches(data || []);
  };

  const remain = (s: TeamSlot) => Math.max(0, (s.required | 0) - (s.filled | 0));

  return (
    <div className="container">
      <h2 style={{marginTop:0}}>募集中の試合</h2>
      {error && <div className="card" style={{background:'#fef2f2', borderColor:'#fecaca', marginBottom:12}}>{error}</div>}

      {matches.length === 0 ? (
        <div className="empty">募集中の試合がありません。</div>
      ) : (
        <div className="list-cards">
          {matches.map(m => {
            const openSlots = (m.teams?.team_slots || []).filter(s => remain(s) > 0);
            return (
              <div key={m.id} className="card">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:600}}>{m.teams?.name || '主催チーム'}</div>
                    <div className="help">{m.date} {m.time}・{m.location}</div>
                  </div>
                  <span className={`badge ${m.level_preference ? 'blue' : 'gray'}`}>
                    レベル: {m.level_preference || '指定なし'}
                  </span>
                </div>

                {/* 相手募集（従来どおり） */}
                <div style={{marginTop:10, display:'flex', gap:8, flexWrap:'wrap'}}>
                  <button className="btn primary" onClick={() => applyToMatch(m.id, m.team_id)}>
                    この試合に対戦申請
                  </button>
                </div>

                {/* メンバー募集を同時掲載 */}
                {m.show_team_slots && (
                  <>
                    <hr style={{margin:'12px 0'}}/>
                    <div className="help" style={{marginBottom:6}}>主催チームのメンバー募集（空き）</div>
                    <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:8}}>
                      {(m.teams?.team_slots || []).map((s, i) => {
                        const r = remain(s);
                        const cls = r > 0 ? 'orange' : 'gray';
                        return <span key={i} className={`badge ${cls}`}>{s.role} {s.filled}/{s.required}</span>;
                      })}
                    </div>

                    {/* Free agent 向け：ロール指定で即参加 */}
                    <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                      {openSlots.length === 0 ? (
                        <div className="help">空きはありません</div>
                      ) : (
                        openSlots.map((s, i) => (
                          <button
                            key={i}
                            className="btn"
                            onClick={() => joinHostTeam(m.team_id, s.role)}
                            title={`${s.role} で参加（残り ${remain(s)}）`}
                          >
                            {s.role} で参加
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
