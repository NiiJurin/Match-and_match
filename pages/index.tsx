// pages/index.tsx
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../src/lib/supabase';
import RecruitCard, { FeedMatch as CardMatch } from "../components/RecruitCard";



type TeamSlot = { role: string; required: number; filled: number };
type FeedMatch = {
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

const remain = (s: TeamSlot) => Math.max(0, (s.required | 0) - (s.filled | 0));

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [username, setUsername] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId]     = useState<string | null>(null);

  // タイムライン用
  const [feed, setFeed] = useState<FeedMatch[]>([]);

  // 上のプロフィールエリア（今のまま）
  useEffect(() => {
    const fetchMe = async () => {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: u, error: uErr } = await supabase
          .from('users')
          .select('name, team_id, teams(name)')
          .eq('id', user.id)
          .single();

        if (!uErr) {
          setUsername(u?.name || '');
          setTeamId(u?.team_id ?? null);
          setTeamName(u?.teams?.name || '');
        }
      }
      setLoading(false);
    };
    fetchMe();
  }, []);

  // タイムライン読み込み
  const loadFeed = async () => {
      // フィード用の取得例
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, date, time, location, level_preference, status, team_id, show_team_slots, sport,
          location_lat, location_lng,
          teams (
            name,
            team_slots (role, required, filled)
          )
        `)
        .eq('status', '募集中')
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(50);



      if (error) setError(error.message);
      else setFeed(data || []);
    };

  useEffect(() => { loadFeed(); }, []);

  // 申請系アクション
  const applyToMatch = async (matchId: string, hostTeamId: string) => {
    setError('');
    if (!teamId) { setError('チームに所属していません（先にチーム作成/参加）'); return; }
    if (hostTeamId === teamId) { setError('自分の主催試合には応募できません'); return; }

    const { error } = await supabase
      .from('applications')
      .insert({ match_id: matchId, team_id: teamId, status: '申請中' });

    if (error) setError(error.code === '23505' ? 'この試合には既に応募済みです' : error.message);
    else {
      alert('対戦申請を送りました！');
    }
  };

  // 主催チームの空きロールに参加（free agent向け）
  const joinHostTeam = async (hostTeamId: string, role: string) => {
    setError('');
    const { error } = await supabase.rpc('claim_team_slot', { p_team_id: hostTeamId, p_role: role });
    if (error) {
      if (error.message.includes('already in a team')) setError('既に他のチームに所属しています');
      else if (error.message.includes('slot full')) setError('そのロールは満員です');
      else setError(error.message);
      return;
    }
    alert(`${role} で参加しました！`);
    loadFeed(); // 反映
  };

  const emptyState = useMemo(() => {
    if (loading || error) return null;
    if (!teamId) {
      return (
        <div className="rounded-2xl border p-6 bg-gray-50 card" style={{marginTop:8}}>
          <p className="mb-3">まだチームに所属していません。</p>
          <div className="flex gap-3">
            <Link href="/create_team" className="btn primary">チーム作成</Link>{' '}
            <Link href="/join_team" className="btn">チームに参加</Link>
          </div>
        </div>
      );
    }
    return null;
  }, [loading, error, teamId]);

  return (
    <div className="container">
      {/* ヘッダ */}
      <h1 className="text-2xl font-bold">Match to Match ホーム</h1>
      <div className="text-sm text-gray-600 mt-2">
        <p><strong>ユーザー名：</strong>{username || '未設定'}</p>
        <p><strong>所属チーム：</strong>{teamName || '未所属'}</p>
      </div>

      {error && <div className="card" style={{background:'#fef2f2', borderColor:'#fecaca', margin:'12px 0'}}>{error}</div>}
      {emptyState}

      {/* ---- タイムライン ---- */}
      <div className="divider" />
      <h2 className="text-lg font-semibold">募集試合タイムライン</h2>

      {feed.length === 0 ? (
        <div className="empty">募集中の試合がまだありません。</div>
      ) : (
        <div className="feed">
          {feed.map(m => (
            <RecruitCard
              key={m.id}
              data={m as unknown as CardMatch}
              myTeamId={teamId}
              onApply={(matchId, hostTeamId) => applyToMatch(matchId, hostTeamId)}
              onJoin={(hostTeamId, role) => joinHostTeam(hostTeamId, role)}
            />
          ))}
        </div>
      )}


    </div>
  );
}
